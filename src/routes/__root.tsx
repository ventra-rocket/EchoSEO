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
import { NotFound } from "@/client/components/NotFound";
import { I18nProvider } from "@/client/i18n/I18nProvider";
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
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
});

function AppLayout() {
  // Public, indexable routes render their body on the server. Everything else is
  // the authenticated dashboard, which renders inside <ClientOnly> — SSR buys it
  // nothing, and keeping its providers off the server means two module-level
  // singletons (the tanstack-db queryClient and the auth client) are never
  // read or written while rendering, so no visitor's state reaches another's HTML.
  //
  // Switch on the COMMITTED pathname (the last resolved match), not
  // `location.pathname`: during an in-flight cross-boundary navigation the
  // location URL flips to the target before <Outlet/> swaps to it, and switching
  // on the pending URL would briefly render the still-mounted old tree under the
  // wrong providers. The matches are what Outlet actually renders, so they cannot
  // disagree with it.
  const pathname = useRouterState({
    select: (state) =>
      state.matches[state.matches.length - 1]?.pathname ??
      state.location.pathname,
  });
  if (isPublicSsrPath(pathname)) {
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
  // Server-render the document language from the committed path so the public
  // Vietnamese landing ships `lang="vi"` for crawlers. Authenticated pages get
  // "en" here and then the I18nProvider effect overrides from the cookie
  // client-side — same end state as before, when only that effect set lang.
  const pathname = useRouterState({
    select: (state) =>
      state.matches[state.matches.length - 1]?.pathname ??
      state.location.pathname,
  });
  const lang = pathname.startsWith("/vi/") ? "vi" : "en";

  // On a client-side navigation INTO a public page, React skips rewriting
  // `<html lang>` when the value it computes is unchanged (e.g. arriving on the
  // English landing while the dashboard's I18nProvider had imperatively set
  // lang="vi" from the cookie). Reassert it here so a public page always carries
  // its own language; authenticated pages are left to the I18nProvider effect.
  React.useEffect(() => {
    if (isPublicSsrPath(pathname)) {
      document.documentElement.lang = lang;
    }
  }, [pathname, lang]);

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
