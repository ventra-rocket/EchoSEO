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
          /** "flexible" fills the container instead of a fixed 300px box. */
          size?: "normal" | "compact" | "flexible";
          /** BCP-47 tag, or "auto" to follow the browser. */
          language?: string;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";

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
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  const onLoadErrorRef = useRef(onLoadError);
  onTokenRef.current = onToken;
  onExpireRef.current = onExpire;
  onLoadErrorRef.current = onLoadError;

  useEffect(() => {
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onExpireRef.current?.(),
          // Without this the widget renders as a fixed 300px box, left-aligned
          // between a full-width input and a full-width button.
          size: "flexible",
          language: locale,
        });
      })
      .catch(() => {
        if (!cancelled) onLoadErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [siteKey, locale]);

  return <div ref={containerRef} />;
}
