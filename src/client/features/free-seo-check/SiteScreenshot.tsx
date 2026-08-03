import { useState } from "react";
import type { Locale } from "@/client/i18n/config";
import { siteScreenshotUrl } from "@/shared/free-seo-check";
import { CHECK_RESULT_COPY } from "./check-result-copy";

/**
 * A desktop capture of the checked page, framed as a browser window — the
 * "we really loaded your site" trust signal, shown on both the Lite result and
 * the Deep report.
 *
 * The capture comes from a live PSI render that has been measured at ~25s on a
 * cold domain, so the browser-chrome frame is NOT painted up front: an empty
 * window holding most of a phone viewport for half a minute reads as broken.
 * While loading, a capped skeleton box says what is coming and why it takes
 * time; the frame appears only once the image has actually decoded. A capture
 * that never arrives collapses to a one-line row with a retry, rather than a
 * broken image or a permanent void.
 */
export function SiteScreenshot({
  pageUrl,
  locale,
}: {
  pageUrl: string;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].screenshot;
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  // Bumping remounts the <img>, which is what re-issues the request on retry.
  const [attempt, setAttempt] = useState(0);

  let host = pageUrl;
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    // A malformed URL should never reach here (the report carries a normalized
    // finalUrl), but fall back to the raw string rather than throwing in render.
  }

  if (status === "failed") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-3">
        <span className="min-w-0 truncate text-sm text-base-content/60">
          {copy.label} — {copy.unavailable.toLowerCase()}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-xs shrink-0"
          onClick={() => {
            setStatus("loading");
            setAttempt((current) => current + 1);
          }}
        >
          {copy.retry}
        </button>
      </div>
    );
  }

  const ready = status === "ready";

  // One stable tree for both states — the <img> must never change parents,
  // or the loading→ready flip would remount it and re-issue a request the
  // capture service just spent ~25s serving.
  return (
    <figure
      className={
        ready
          ? "overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm"
          : "mx-auto w-full max-w-xl"
      }
    >
      {ready ? (
        // Browser chrome: three dots and an address pill. Pure decoration — the
        // real signal is the capture below, but the frame makes it read as a
        // window onto the site rather than a bare image.
        <div className="flex items-center gap-2 border-b border-base-300 bg-base-200/60 px-3 py-2">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-base-300" />
            <span className="size-2.5 rounded-full bg-base-300" />
            <span className="size-2.5 rounded-full bg-base-300" />
          </span>
          <span className="mx-auto max-w-[75%] truncate rounded-full bg-base-100 px-3 py-0.5 font-mono text-xs text-base-content/60">
            {host}
          </span>
        </div>
      ) : null}

      <div
        className={
          ready
            ? "relative aspect-[16/10] bg-base-200"
            : "relative aspect-video overflow-hidden rounded-box border border-base-300 bg-base-200"
        }
      >
        {ready ? null : (
          <>
            <div
              className="absolute inset-0 animate-pulse bg-base-300"
              aria-hidden="true"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4 text-center">
              <span className="font-mono text-[11px] uppercase tracking-widest text-base-content/60">
                {copy.label}
              </span>
              <span className="text-xs text-base-content/50">
                {copy.loadingHint}
              </span>
            </div>
          </>
        )}
        <img
          key={attempt}
          src={siteScreenshotUrl(pageUrl)}
          alt={copy.alt(host)}
          // Intrinsic dimensions at the frame's 16:10 ratio so the browser can
          // reserve space; the classes below still control rendered size.
          width={1600}
          height={1000}
          decoding="async"
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("failed")}
          // `object-top`: show the hero the visitor lands on, not the middle
          // of a page that can run thousands of pixels tall. Kept mounted
          // (invisible) while loading — an unmounted <img> never loads.
          className={
            ready
              ? "size-full object-cover object-top"
              : "absolute inset-0 size-full opacity-0"
          }
        />
      </div>

      {ready ? (
        <figcaption className="border-t border-base-300 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-base-content/60">
          {copy.label}
        </figcaption>
      ) : null}
    </figure>
  );
}
