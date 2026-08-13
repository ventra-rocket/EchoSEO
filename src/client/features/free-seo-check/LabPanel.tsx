import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { metricTone } from "./score-summary";
import { FREE_LAB_METRICS } from "./lab-metrics";
import { formatScanDate } from "./report-format";
import type { VisualLabData } from "./filmstrip-bundle";

const SCORE_KEYS = [
  "performance",
  "seo",
  "accessibility",
  "bestPractices",
] as const;

/** 2×2 on phones, one row of four from `sm` — the panel sits in the result's
 * wide column, unlike the Deep rail, so it never returns to two columns. */
const GRID = "mt-3 grid grid-cols-2 sm:grid-cols-4";

/** Hairlines for the fixed four-cell grid above (2×2 → 1×4 at `sm`). */
function labCellBorders(index: number): string {
  return [
    index % 2 === 1 ? "border-l" : "",
    index >= 2 ? "border-t" : "",
    index % 4 === 0 ? "sm:border-l-0" : "sm:border-l",
    "sm:border-t-0",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The FREE lab panel under a strategy's capture: the four Lighthouse category
 * scores and the lab Core Web Vitals from the visual bundle, in the Deep
 * report's cell vocabulary so the two surfaces read as one system.
 *
 * Honesty rules this component exists to enforce: the caption/source line
 * always say "homepage · lab" (the render targets the origin root — this is
 * never the checked page's measurement, and never CrUX field data), and the
 * `inpMs` slot is labelled TBT with TBT cutoffs (see `lab-metrics.ts`).
 *
 * The CWV block is all-or-nothing upstream, so a scores-only bundle is a
 * normal state, not a failure — the panel just renders one group. While the
 * shared bundle fetch is unsettled it holds a skeleton; a bundle that never
 * materializes collapses to the same quiet one-liner the strategy tabs
 * already use for missing lab data.
 */
export function LabPanel({
  lab,
  settled,
  locale,
}: {
  lab: VisualLabData | null;
  settled: boolean;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale];

  if (!lab) {
    if (!settled) {
      return (
        <div
          className="h-28 animate-pulse rounded-box border border-base-300 bg-base-200"
          aria-hidden="true"
        />
      );
    }
    return (
      <p className="rounded-box border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content/60">
        {copy.strategyTabs.noStrategyData}
      </p>
    );
  }

  const scores = SCORE_KEYS.filter((key) => lab.scores[key] !== null);
  const cwv = lab.coreWebVitals;

  return (
    <section
      aria-label={copy.labPanel.ariaLabel}
      className="divide-y divide-base-300 rounded-box border border-base-300 bg-base-100"
    >
      {scores.length > 0 ? (
        <div className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            {/* Product name — never translated. */}
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-base-content/60">
              Google Lighthouse
            </h3>
            <span className="font-mono text-xs text-base-content/60">
              {copy.labPanel.caption}
            </span>
          </div>
          <div className={GRID}>
            {scores.map((key, index) => (
              <div
                key={key}
                className={`border-base-300 px-3 py-2.5 text-center ${labCellBorders(index)}`}
              >
                <div className="font-mono text-xl font-bold tabular-nums">
                  {lab.scores[key]}
                </div>
                <div className="mt-0.5 text-xs text-base-content/60">
                  {copy.deepReport.psiLabels[key]}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {cwv ? (
        <div className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            {/* "Core Web Vitals" is the Google product term in every locale. */}
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-base-content/60">
              Core Web Vitals
            </h3>
            {scores.length === 0 ? (
              <span className="font-mono text-xs text-base-content/60">
                {copy.labPanel.caption}
              </span>
            ) : null}
          </div>
          <div className={GRID}>
            {FREE_LAB_METRICS.map((metric, index) => {
              const value = cwv[metric.key];
              return (
                <div
                  key={metric.key}
                  className={`border-base-300 px-3 py-2.5 text-center ${labCellBorders(index)}`}
                >
                  <div
                    className={`font-mono text-xl font-bold tabular-nums ${metricTone(
                      value,
                      metric.good,
                      metric.needsImprovement,
                    )}`}
                  >
                    {metric.format(value)}
                  </div>
                  <div className="mt-0.5 text-xs text-base-content/60">
                    {metric.label}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-base-content/60">
            {copy.labPanel.tbtNote}
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5 px-4 py-2.5 text-xs text-base-content/60">
        <p>
          {copy.provenance.psiMobile}
          {lab.capturedAt
            ? ` · ${copy.labPanel.capturedAt(formatScanDate(lab.capturedAt, locale))}`
            : null}
        </p>
        <p>{copy.labPanel.sourceLine}</p>
        {/* Always visible, never a tooltip: this is the answer to "why doesn't
            this match the Lighthouse I just ran?", and a reader who cannot find
            it discounts every number above it. */}
        <p>{copy.provenance.localRunDiffers}</p>
      </div>
    </section>
  );
}
