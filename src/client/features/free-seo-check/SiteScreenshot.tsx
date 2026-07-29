import { useState } from "react";
import type { Locale } from "@/client/i18n/config";
import { siteScreenshotUrl } from "@/shared/free-seo-check";
import { CHECK_RESULT_COPY } from "./check-result-copy";

/**
 * A desktop capture of the checked page, framed as a browser window — the
 * "we really loaded your site" trust signal, shown on both the Lite result and
 * the Deep report.
 *
 * The capture comes from a PSI render that can take 10–30s on a cold domain, so
 * the frame holds its space and shows a skeleton until the image loads. A
 * capture that never arrives (PSI omitted it, the render was rate-capped, or it
 * timed out) leaves a quiet "unavailable" panel rather than a broken image or a
 * layout jump.
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

  let host = pageUrl;
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    // A malformed URL should never reach here (the report carries a normalized
    // finalUrl), but fall back to the raw string rather than throwing in render.
  }

  return (
    <figure className="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm">
      {/* Browser chrome: three dots and an address pill. Pure decoration — the
          real signal is the capture below, but the frame makes it read as a
          window onto the site rather than a bare image. */}
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

      <div className="relative aspect-[16/10] bg-base-200">
        {status === "loading" ? (
          <div
            className="absolute inset-0 animate-pulse bg-base-300/40"
            aria-hidden="true"
          />
        ) : null}
        {status === "failed" ? (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-base-content/60">
            {copy.unavailable}
          </div>
        ) : (
          <img
            src={siteScreenshotUrl(pageUrl)}
            alt={copy.alt(host)}
            decoding="async"
            onLoad={() => setStatus("ready")}
            onError={() => setStatus("failed")}
            // `object-top`: show the hero the visitor lands on, not the middle
            // of a page that can run thousands of pixels tall.
            className={`size-full object-cover object-top transition-opacity duration-500 ${
              status === "ready" ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>

      <figcaption className="border-t border-base-300 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-base-content/60">
        {copy.label}
      </figcaption>
    </figure>
  );
}
