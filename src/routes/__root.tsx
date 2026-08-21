/// <reference types="vite/client" />
import {
  ClientOnly,
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { DefaultCatchBoundary } from "@/client/components/DefaultCatchBoundary";
import { ExportToSheetsModal } from "@/client/components/table/ExportToSheetsModal";
import { themePreferenceInitScript } from "@/client/lib/theme";
import {
  identifyAnalyticsUser,
  resetAnalyticsUser,
  startAnalyticsCapture,
  stopAnalyticsCapture,
} from "@/client/lib/posthog";
import {
  captureRedditAttributionFromLocation,
  getStoredRedditAttribution,
  hasMarkedRedditSignupConversion,
  markRedditSignupConversion,
  unmarkRedditSignupConversion,
} from "@/client/lib/reddit-attribution";
import { LocalizedNotFound } from "@/client/components/NotFound";
import { I18nProvider } from "@/client/i18n/I18nProvider";
import { getRouteOwnedLocale } from "@/client/i18n/config";
import { isPublicSsrPath } from "@/shared/free-seo-check";
import appCss from "@/client/styles/app.css?url";
// `no-inline` keeps this out of a base64 data URI: Safari ignores data-URI
// favicons, so the mark has to be an emitted file to reach Safari at all.
import faviconSvg from "@/client/components/echoseo-mark.svg?url&no-inline";
import ibmPlexSansLatin from "@/client/styles/fonts/ibm-plex-sans-latin.woff2?url&no-inline";
import { useSession } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { Toaster } from "sonner";
import { queryClient } from "@/client/tanstack-db";
import { getActiveOrganizationId } from "@/lib/auth-session";
import { captureRedditConversionEvent } from "@/serverFunctions/redditConversions";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        title: "EchoSEO",
      },
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // The body font's latin subset is on the critical path for every page,
      // including the Vietnamese landing (which still renders latin for URLs,
      // numbers and the brand name). Preloading it shortens the swap from the
      // fallback stack. `crossorigin` is required even same-origin: fonts are
      // fetched in CORS mode, and without it the preload is discarded and the
      // file downloaded twice.
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: ibmPlexSansLatin,
        crossOrigin: "anonymous",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      // Declared last, and unsized, so browsers that understand SVG icons pick
      // it over the sized PNGs above (the standard modern-favicon ordering).
      // That matters beyond fidelity: the mark rides the Vite asset pipeline
      // (/assets/*), the only prefix on the Cloudflare Access bypass, so
      // anonymous visitors on the public landings get a real tab icon — a
      // public/ favicon 302s them to the Access login instead. The PNG/ico
      // links stay for browsers without SVG favicon support.
      { rel: "icon", type: "image/svg+xml", sizes: "any", href: faviconSvg },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    scripts: [],
  }),
  component: AppLayout,
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: LocalizedNotFound,
  shellComponent: RootDocument,
});

function AppLayout() {
  // Public, indexable routes render their body on the server. Everything else is
  // the authenticated dashboard, which renders inside <ClientOnly> — SSR buys it
  // nothing, and keeping its providers off the server means two module-level
  // singletons (the tanstack-db queryClient and the auth client) are never
  // read or written while rendering, so no visitor's state reaches another's HTML.
  //
  // Switch normal routes on the COMMITTED pathname (the last resolved match),
  // not `location.pathname`: during an in-flight cross-boundary navigation the
  // URL flips before <Outlet/> swaps, and switching on the pending URL would
  // briefly render the old tree under the wrong providers.
  //
  // A settled not-found URL has only the root match, however. In that one case
  // the location is the only language signal; without it `/vi/unknown` mounted
  // the authenticated cookie provider outside LocalizedNotFound, whose later
  // `en` effect overwrote the route-owned `vi` document language.
  const routeState = useRouterState({
    select: (state) => ({
      matchedPathname:
        state.matches[state.matches.length - 1]?.pathname ??
        state.location.pathname,
      locationPathname: state.location.pathname,
      hasOnlyRootMatch: state.matches.length === 1,
    }),
  });
  const isPublic =
    isPublicSsrPath(routeState.matchedPathname) ||
    (routeState.hasOnlyRootMatch &&
      getRouteOwnedLocale(routeState.locationPathname) !== undefined);
  if (isPublic) {
    return <Outlet />;
  }
  return (
    <ClientOnly>
      <AppProviders>
        <Outlet />
      </AppProviders>
    </ClientOnly>
  );
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const showDevtools =
    import.meta.env.DEV && import.meta.env.VITE_SHOW_DEVTOOLS !== "false";

  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <>
          <PostHogBootstrap />
          {children}
          <ExportToSheetsModal />
          <Toaster position="bottom-right" mobileOffset={{ bottom: 100 }} />
          {showDevtools ? (
            <TanStackDevtools
              config={{ position: "bottom-right" }}
              eventBusConfig={{ connectToServerBus: true }}
              plugins={[
                {
                  name: "TanStack Router",
                  render: <TanStackRouterDevtoolsPanel />,
                  defaultOpen: true,
                },
              ]}
            />
          ) : null}
        </>
      </QueryClientProvider>
    </I18nProvider>
  );
}

function PostHogBootstrap() {
  const isHostedMode = isHostedClientAuthMode();
  const { data: session, isPending: isSessionPending } = useSession();
  const userId = session?.user?.id ?? null;
  const optedOut = session?.user?.analyticsOptedOut === true;
  const organizationId = getActiveOrganizationId(session);
  const previousUserIdRef = React.useRef<string | null>(null);
  const redditSignupInFlightRef = React.useRef(false);

  React.useEffect(() => {
    if (!isHostedMode) return;
    captureRedditAttributionFromLocation();
  }, [isHostedMode]);

  React.useEffect(() => {
    if (!isHostedMode || isSessionPending) {
      return;
    }

    if (userId && !optedOut) {
      startAnalyticsCapture();
      identifyAnalyticsUser({ userId, organizationId });
      previousUserIdRef.current = userId;
    } else if (userId && optedOut) {
      stopAnalyticsCapture();
    } else if (previousUserIdRef.current) {
      previousUserIdRef.current = null;
      resetAnalyticsUser();
    }
  }, [isHostedMode, isSessionPending, optedOut, organizationId, userId]);

  React.useEffect(() => {
    if (!isHostedMode || isSessionPending || !userId) return;
    if (hasMarkedRedditSignupConversion(userId)) return;

    const attribution = getStoredRedditAttribution();
    if (!attribution) return;
    if (redditSignupInFlightRef.current) return;

    redditSignupInFlightRef.current = true;
    void captureRedditConversionEvent({
      data: { attribution, eventType: "SIGN_UP" },
    })
      .then((result) => {
        if (result.status === "sent" || result.status === "already_sent") {
          markRedditSignupConversion(userId);
        }
      })
      .catch(() => {
        // The server deduplicates this event; allow a future session to retry.
        unmarkRedditSignupConversion();
      })
      .finally(() => {
        redditSignupInFlightRef.current = false;
      });
  }, [isHostedMode, isSessionPending, userId]);

  return null;
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // The URL owns the document language. This deliberately differs from
  // AppLayout's committed-match lookup above: that lookup chooses which
  // provider tree currently wraps <Outlet>, while this one describes the page
  // URL itself. A not-found route only matches `/`, so deriving `lang` from the
  // last match rendered Vietnamese 404 copy under `<html lang="en">`.
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const routeLocale = getRouteOwnedLocale(pathname);
  const lang = routeLocale ?? "en";

  // React can preserve an imperatively set dashboard language when navigating
  // into a public URL. Reassert every URL-owned locale after navigation;
  // authenticated routes remain owned by I18nProvider's cookie-based effect.
  React.useEffect(() => {
    if (routeLocale) {
      document.documentElement.lang = routeLocale;
    }
  }, [routeLocale]);

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themePreferenceInitScript }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
