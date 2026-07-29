import { useEffect, useRef } from "react";
import type { Locale } from "@/client/i18n/config";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          /** Fires when the challenge itself fails, not when the script 404s. */
          "error-callback"?: () => void;
          /**
           * "flexible" is `width: 100%` with a **300px floor** — it does not
           * remove the minimum, it only lets the widget grow past it. Any
           * container narrower than 300px gets an overflowing iframe, so the
           * form's available width has to stay above that at every breakpoint.
           */
          size?: "normal" | "compact" | "flexible";
          /** BCP-47 tag, or "auto" to follow the browser. */
          language?: string;
          /** Without this the widget follows its own default, not the page. */
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";

/** How long to wait for the widget to paint before calling it a failure. */
const RENDER_TIMEOUT_MS = 8000;

/**
 * The page has no theme context — public routes render outside the app's
 * providers — so the widget's theme is read from the same media query the
 * stylesheet uses. "auto" would follow the browser, which can disagree with the
 * page when a theme is pinned.
 */
function activeTheme(): "light" | "dark" {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () =>
      reject(new Error("Failed to load Turnstile")),
    );
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    // Let a later mount retry instead of permanently caching the failure.
    scriptLoadPromise = null;
    throw error;
  });

  scriptLoadPromise = promise;
  return promise;
}

/** Renders a Cloudflare Turnstile widget and reports the verification token. */
export function TurnstileWidget({
  siteKey,
  locale,
  onToken,
  onExpire,
  onLoadError,
}: {
  siteKey: string;
  /**
   * The page's language. Turnstile otherwise picks the BROWSER's language, so a
   * Vietnamese visitor read English on `/vi/kiem-tra-seo` and an English one read
   * Vietnamese on `/free-seo-check` — the widget sits mid-form, so the mismatch
   * reads as a broken page rather than a nicety.
   */
  locale: Locale;
  onToken: (token: string) => void;
  onExpire?: () => void;
  onLoadError?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Read once per mount: re-rendering the widget on a theme flip would discard
  // a token the visitor has already solved for.
  const themeRef = useRef<"light" | "dark" | null>(null);
  themeRef.current ??= activeTheme();
  const theme = themeRef.current;
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  const onLoadErrorRef = useRef(onLoadError);
  onTokenRef.current = onToken;
  onExpireRef.current = onExpire;
  onLoadErrorRef.current = onLoadError;

  useEffect(() => {
    let cancelled = false;

    // A visitor behind an ad-blocker, or on a network that silently drops the
    // challenge, can have the script resolve and `render` never paint anything.
    // Nothing in the Turnstile callbacks fires in that case, so without this
    // timer the form waits forever with no explanation. Treating "never
    // appeared" as a load error is what lets the caller stop waiting.
    const renderTimeout = window.setTimeout(() => {
      if (cancelled || widgetIdRef.current) return;
      onLoadErrorRef.current?.();
    }, RENDER_TIMEOUT_MS);

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onExpireRef.current?.(),
          "error-callback": () => onLoadErrorRef.current?.(),
          // Fills the form's width rather than sitting as a 300px box between a
          // full-width input and a full-width button. See the 300px floor noted
          // on the option type — the form must never be narrower than that.
          size: "flexible",
          language: locale,
          // The widget defaults to its own light styling, which renders as a
          // white block inside the dark form on a dark-themed page.
          theme,
        });
      })
      .catch(() => {
        if (!cancelled) onLoadErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(renderTimeout);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
    // `theme` is read once into a ref on mount, so listing it cannot re-run
    // this effect and discard a token the visitor has already solved for.
  }, [siteKey, locale, theme]);

  return <div ref={containerRef} />;
}
