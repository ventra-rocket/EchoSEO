import { useState } from "react";
import type { Locale } from "@/client/i18n/config";
import { screenshotUrl } from "@/shared/free-seo-check";
import { CHECK_RESULT_COPY } from "./check-result-copy";

/**
 * How much of the capture to show. Lighthouse returns the *whole* page — often
 * many thousands of pixels tall — so it is cropped to a near-viewport window
 * here rather than server-side: cropping in a Worker would mean decoding and
 * re-encoding an image with no canvas available, to save bytes on a resource
 * the page loads once, lazily, below the score.
 */
const CROP_ASPECT = "4 / 3";

/**
 * The page capture, shown as evidence that the checker actually loaded the
 * site — the same reassurance GTmetrix's report thumbnail provides.
 *
 * Renders nothing when the report has no capture: PSI omits it for some runs,
 * and a check that shipped without one is still a valid report.
 */
export function ReportScreenshot({
  reportId,
  finalUrl,
  screenshot,
  locale,
}: {
  reportId: string;
  finalUrl: string;
  screenshot: { width: number; height: number } | null;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].deepReport;
  // The <img> can still 404 — R2 and the payload are written in separate steps,
  // and retention purges the image on the same schedule as the report. Drop the
  // whole figure rather than leaving a broken-image frame under the score.
  const [failed, setFailed] = useState(false);

  if (!screenshot || failed) return null;

  return (
    <figure className="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <figcaption className="border-b border-base-300 px-4 py-2 font-mono text-xs uppercase tracking-widest text-base-content/60">
        {copy.screenshotLabel}
      </figcaption>
      <div className="bg-base-200" style={{ aspectRatio: CROP_ASPECT }}>
        <img
          src={screenshotUrl(reportId)}
          alt={copy.screenshotAlt(finalUrl)}
          width={screenshot.width}
          height={screenshot.height}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          // `top` not `center`: the crop should show what a visitor sees on
          // arrival, and centring a page thousands of pixels tall would land
          // somewhere arbitrary in its middle.
          className="size-full object-cover object-top"
        />
      </div>
    </figure>
  );
}
