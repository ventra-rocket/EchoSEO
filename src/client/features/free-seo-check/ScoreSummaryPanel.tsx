import type { ReactNode } from "react";
import type { DeepReport } from "@/server/services/seo-check/deep-types";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { formatScanDate } from "./report-format";
import { BAND_COLOR_VAR, BAND_TEXT, scoreBand } from "./score-presentation";
import { CWV_METRICS, metricTone, scoreCellBorders } from "./score-summary";

const PSI_KEYS: (keyof DeepReport["psiScores"])[] = [
  "performance",
  "seo",
  "accessibility",
  "bestPractices",
];

/** The panel's mono-eyebrow group label — same idiom as the section eyebrows. */
function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-mono text-[11px] uppercase tracking-widest text-base-content/60">
      {children}
    </h2>
  );
}

/** 2 columns on phones and in the lg side rail, 4 across the sm–lg span. */
const GRID = "mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2";

/**
 * Every score the report carries — per-category, Core Web Vitals, Lighthouse —
 * in ONE bordered panel with internal hairlines. These were three identical
 * floating card grids: twelve boxes, twelve borders, three near-invisible
 * headings. Groups that have no data (no CWV, PSI withheld) simply don't render.
 */
export function ScoreSummaryPanel({
  report,
  locale,
}: {
  report: DeepReport;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale];
  const psiPresent = PSI_KEYS.filter((key) => report.psiScores[key] !== null);
  // A const so the JSX conditional narrows away the null for the cells below.
  const cwv = report.coreWebVitals;

  return (
    <section className="divide-y divide-base-300 rounded-box border border-base-300 bg-base-100">
      {report.categoryScores.length > 0 ? (
        <div className="p-4">
          <GroupLabel>{copy.deepReport.categoriesGroupLabel}</GroupLabel>
          <div className={GRID}>
            {report.categoryScores.map((category, index) => {
              const band = scoreBand(category.score);
              return (
                <div
                  key={category.category}
                  className={`border-base-300 px-3 py-2.5 text-center ${scoreCellBorders(index)}`}
                >
                  <div
                    className={`font-mono text-xl font-bold tabular-nums ${BAND_TEXT[band]}`}
                  >
                    {category.score}
                  </div>
                  <div className="mb-2 mt-0.5 text-xs text-base-content/60">
                    {copy.categoryLabels[category.category]}
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-base-300">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${category.score}%`,
                        backgroundColor: BAND_COLOR_VAR[band],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {/* The one cluster here that is not Google's. Unlabelled, a reader
              checks it against Lighthouse, finds different numbers, and stops
              believing the rest of the page. */}
          <p className="mt-3 text-xs text-base-content/60">
            {copy.provenance.ownCrawler} ·{" "}
            {copy.provenance.measuredAt(
              formatScanDate(report.fetchedAt, locale),
            )}
          </p>
        </div>
      ) : null}

      {cwv ? (
        <div className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            {/* "Core Web Vitals" is the Google product term in every locale. */}
            <GroupLabel>Core Web Vitals</GroupLabel>
            <span className="text-xs text-base-content/60">
              {report.cwvSource === "field"
                ? copy.coreWebVitals.sourceField
                : copy.coreWebVitals.sourceLab}
            </span>
          </div>
          <div className={GRID}>
            {CWV_METRICS.map((metric, index) => {
              const value = cwv[metric.key];
              return (
                <div
                  key={metric.key}
                  className={`border-base-300 px-3 py-2.5 text-center ${scoreCellBorders(index)}`}
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
        </div>
      ) : null}

      {psiPresent.length > 0 ? (
        <div className="p-4">
          {/* Product name — never translated. */}
          <GroupLabel>Google Lighthouse</GroupLabel>
          <div className={GRID}>
            {psiPresent.map((key, index) => (
              <div
                key={key}
                className={`border-base-300 px-3 py-2.5 text-center ${scoreCellBorders(index)}`}
              >
                <div className="font-mono text-xl font-bold tabular-nums">
                  {report.psiScores[key]}
                </div>
                <div className="mt-0.5 text-xs text-base-content/60">
                  {copy.deepReport.psiLabels[key]}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
