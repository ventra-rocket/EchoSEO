import { useEffect, useState } from "react";
import type { Locale } from "@/client/i18n/config";

/** The compact scan status per locale. One line — telling the visitor what is
 * happening is what shortens the perceived wait, and a single line does that
 * without a second moving surface competing with the shimmer. */
const SKELETON_COPY: Record<
  Locale,
  { scanning: (host: string) => string; aria: string }
> = {
  en: {
    scanning: (host) => `Analyzing ${host}…`,
    aria: "Scanning your page",
  },
  vi: {
    scanning: (host) => `Đang phân tích ${host}…`,
    aria: "Đang quét trang của bạn",
  },
};

/** How many ghost finding rows to draw — enough to fill the checks column at the
 * report's typical length without overshooting the fold. */
const GHOST_ROW_COUNT = 4;

/** Strip scheme and path so the status line reads a bare host, the way the real
 * report labels the site. Falls back to the trimmed input mid-typo. */
function displayHost(url: string): string {
  const trimmed = url.trim();
  return (
    trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .trim() || trimmed
  );
}

/**
 * A shimmering ghost of the Lite report, shown while the scan runs. It mirrors
 * the real report's shape and dimensions — score card + category grid on the
 * rail, page-read panel + finding rows + capture frame on the right — so when
 * the report lands it swaps in place instead of the page collapsing to a bare
 * console or lurching as content is added (the layout shift this replaces). A
 * skeleton reads as "your result is forming" where a spinner reads as "still
 * nothing"; that difference is measured as a shorter perceived wait.
 */
export function ReportSkeleton({
  url,
  locale,
}: {
  url: string;
  locale: Locale;
}) {
  const copy = SKELETON_COPY[locale];

  // Announce the scan exactly once. This live region mounts only now, and some
  // screen readers do not read a region that appears with its text already in
  // place, so fill it one commit after mount — the text mutation is what they
  // read. The ghost below is decorative and stays out of the a11y tree.
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    setAnnouncement(copy.aria);
  }, [copy.aria]);

  return (
    <div className="space-y-4">
      <div
        className="flex items-center gap-2 font-mono text-xs text-base-content/60"
        role="status"
        aria-live="polite"
      >
        <span
          className="loading loading-dots loading-sm text-primary"
          aria-hidden="true"
        />
        <span className="sr-only">{announcement}</span>
        <span aria-hidden="true">{copy.scanning(displayHost(url))}</span>
      </div>

      {/* The status line above already states the page is loading; the ghost
          shapes carry no information, so they stay out of the a11y tree. */}
      <div
        aria-hidden="true"
        className="space-y-6 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0"
      >
        {/* Rail: score card + category grid, matching the report's left column. */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-box border border-base-300 bg-base-100 p-6">
            <div className="fsc-skeleton mx-auto size-40 rounded-full" />
            <div className="fsc-skeleton mx-auto mt-4 h-4 w-40 rounded" />
            <div className="fsc-skeleton mx-auto mt-2 h-3 w-52 rounded" />
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              <div className="fsc-skeleton h-5 w-16 rounded-full" />
              <div className="fsc-skeleton h-5 w-16 rounded-full" />
              <div className="fsc-skeleton h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="fsc-skeleton h-16 rounded-box border border-base-300"
              />
            ))}
          </div>
        </div>

        {/* Right column: page-read panel + finding rows + capture frame. */}
        <div className="space-y-6">
          <div className="space-y-2 rounded-box border border-base-300 bg-base-100 p-4">
            <div className="fsc-skeleton h-3 w-24 rounded" />
            <div className="fsc-skeleton h-3 w-full rounded" />
            <div className="fsc-skeleton h-3 w-4/5 rounded" />
          </div>

          <div className="space-y-2">
            <div className="fsc-skeleton h-4 w-28 rounded" />
            {Array.from({ length: GHOST_ROW_COUNT }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-3"
              >
                <div className="fsc-skeleton size-5 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="fsc-skeleton h-3 w-1/2 rounded" />
                  <div className="fsc-skeleton h-2.5 w-3/4 rounded" />
                </div>
                <div className="fsc-skeleton h-5 w-14 shrink-0 rounded-full" />
              </div>
            ))}
          </div>

          <div className="fsc-skeleton aspect-[16/10] w-full rounded-box border border-base-300" />
        </div>
      </div>
    </div>
  );
}

/**
 * The loading view: the report skeleton in the same section shell (width,
 * heading slot) the real report uses, so when the result lands it firms up in
 * place rather than the page collapsing or the content below lurching — the
 * layout shift this replaces. The heading sits in the exact slot
 * `fsc-report-heading` will, so only the body swaps.
 */
export function ScanSection({
  url,
  locale,
  heading,
}: {
  url: string;
  locale: Locale;
  heading: string;
}) {
  return (
    <section
      aria-labelledby="fsc-scan-heading"
      className="fsc-fade-in mx-auto max-w-5xl px-4 pb-14 pt-8"
    >
      <h2
        id="fsc-scan-heading"
        className="scroll-mt-6 text-xl font-semibold tracking-tight sm:text-2xl"
      >
        {heading}
      </h2>
      <div className="mt-4">
        <ReportSkeleton url={url} locale={locale} />
      </div>
    </section>
  );
}
