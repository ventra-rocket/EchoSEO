import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import * as React from "react";
import appCss from "@/styles/app.css?url";
import { RootProvider } from "fumadocs-ui/provider/tanstack";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/echoseo-mark.svg" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
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
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  // Per-locale <html lang> for the Vietnamese marketing routes, resolved at
  // SSR time from the matched location so the attribute is correct in the
  // prerendered HTML (not just after hydration).
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lang = pathname === "/vi" || pathname.startsWith("/vi/") ? "vi" : "en";
  // The home landings open on the deep "signal teal" hero band; paint it at SSR
  // so the very first paint matches instead of flashing the default light
  // background before hydration (the marketing layout's effect only runs
  // client-side).
  const isHome = pathname === "/" || pathname === "/vi";
  const bodyStyle = isHome ? { backgroundColor: "#0a6b54" } : undefined;

  return (
    <RootDocument lang={lang} bodyStyle={bodyStyle}>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({
  children,
  lang,
  bodyStyle,
}: {
  children: React.ReactNode;
  lang: string;
  bodyStyle?: React.CSSProperties;
}) {
  return (
    <html lang={lang} style={bodyStyle} suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){function loadAnalytics(){if(window.__echoSeoAnalyticsLoaded)return;window.__echoSeoAnalyticsLoaded=true;window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)};plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init({endpoint:'/api/event'});var script=document.createElement('script');script.defer=true;script.src='/js/script.js';document.head.appendChild(script)}function schedule(){if('requestIdleCallback'in window){window.requestIdleCallback(loadAnalytics,{timeout:2000});return}window.setTimeout(loadAnalytics,2000)}if(document.readyState==='complete'){schedule();return}window.addEventListener('load',schedule,{once:true})})();",
          }}
        />
      </head>
      <body
        style={bodyStyle}
        className="flex flex-col min-h-screen bg-fd-background text-fd-foreground"
      >
        <RootProvider search={{ enabled: false }}>{children}</RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
