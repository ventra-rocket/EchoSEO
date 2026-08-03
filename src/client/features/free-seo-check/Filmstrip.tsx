import { useEffect, useState } from "react";
import type { Locale } from "@/client/i18n/config";
import {
  siteFilmstripUrl,
  type SiteCaptureStrategy,
} from "@/shared/free-seo-check";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { parseFilmstripBundle, type FilmstripFrame } from "./filmstrip-bundle";

/**
 * A 404 means the bundle for this strategy has not been stored yet. The one
 * legitimate transient case is a cache-hit capture racing a concurrent fresh
 * render (the render writes the filmstrip BEFORE the capture, so a fresh
 * render's own viewer never sees it) — one retry after this delay covers it,
 * then this visit gives up for good.
 */
const RETRY_404_DELAY_MS = 3000;

/**
 * The PSI-style loading filmstrip: the progressive render frames that rode
 * along in the same PSI response as the capture, served from R2 as one JSON
 * bundle of data URIs.
 *
 * Mounted only after the capture `<img>` for the same strategy has fired
 * `onLoad` — mounting IS the fetch trigger, and the store-order guarantee
 * above makes that the moment the bundle is known to exist for a fresh
 * render. One fetch per mount; one silent retry on 404; NEVER a retry on
 * 429/other-4xx/5xx — these polls share the capture's per-IP read budget, and
 * hammering it from here would starve the capture itself. A bundle that never
 * materializes renders nothing: no row, no error UI, no spinner. The
 * filmstrip is corroboration, not content.
 */
export function Filmstrip({
  pageUrl,
  strategy,
  locale,
}: {
  pageUrl: string;
  strategy: SiteCaptureStrategy;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].filmstrip;
  const [frames, setFrames] = useState<FilmstripFrame[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    async function fetchBundle(isRetry: boolean): Promise<void> {
      try {
        const response = await fetch(siteFilmstripUrl(pageUrl, strategy));
        if (cancelled) return;
        if (response.status === 404 && !isRetry) {
          retryTimer = setTimeout(() => {
            void fetchBundle(true);
          }, RETRY_404_DELAY_MS);
          return;
        }
        if (!response.ok) return;
        const body: unknown = await response.json();
        if (cancelled) return;
        const parsed = parseFilmstripBundle(body);
        if (parsed) setFrames(parsed);
      } catch {
        // Network failure or a non-JSON body — same silent absence as a 404.
      }
    }

    void fetchBundle(false);
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
    };
  }, [pageUrl, strategy]);

  if (!frames) return null;

  return (
    <ul
      aria-label={copy.ariaLabel}
      className="flex gap-2 overflow-x-auto rounded-box border border-base-300 bg-base-100 p-2"
    >
      {frames.map((frame, index) => {
        const timing = copy.timing(frame.timingMs);
        return (
          // Index keys are safe: the list is set once per fetch, never
          // reordered or edited in place.
          <li key={index} className="flex shrink-0 flex-col items-center gap-1">
            <img
              src={frame.data}
              alt={copy.frameAlt(timing)}
              // Data URIs decode instantly; the fixed height keeps mobile
              // (portrait) and desktop (landscape) frames on one even row.
              className="h-16 w-auto rounded border border-base-300 bg-base-200 sm:h-20"
            />
            <span className="font-mono text-[10px] tabular-nums text-base-content/60">
              {timing}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
