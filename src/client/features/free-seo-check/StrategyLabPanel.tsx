import { useState } from "react";
import type { ReactNode } from "react";
import type { DeepReport } from "@/server/services/seo-check/deep-types";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { CWV_METRICS, metricTone, scoreCellBorders } from "./score-summary";
import {
  desktopLab,
  hasLabData,
  mobileLab,
  type StrategyKey,
  type StrategyLab,
} from "./strategy-lab";

const PSI_KEYS: (keyof DeepReport["psiScores"])[] = [
  "performance",
  "seo",
  "accessibility",
  "bestPractices",
];

/** Same responsive grid as the score summary panel — the two stack in one rail. */
const GRID = "mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2";

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-mono text-[11px] uppercase tracking-widest text-base-content/60">
      {children}
    </h2>
  );
}

/**
 * One strategy's lab groups — the same Core Web Vitals + Lighthouse cells the
 * score summary panel used to render, now per tab. A fragment on purpose: the
 * parent section's `divide-y` draws the hairlines, so these divs must be its
 * direct children.
 */
function LabGroups({ lab, locale }: { lab: StrategyLab; locale: Locale }) {
  const copy = CHECK_RESULT_COPY[locale];
  const psiPresent = PSI_KEYS.filter((key) => lab.psiScores[key] !== null);
  // A const so the JSX conditional narrows away the null for the cells below.
  const cwv = lab.coreWebVitals;

  return (
    <>
      {cwv ? (
        <div className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            {/* "Core Web Vitals" is the Google product term in every locale. */}
            <GroupLabel>Core Web Vitals</GroupLabel>
            <span className="text-xs text-base-content/60">
              {lab.cwvSource === "field"
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
                  {lab.psiScores[key]}
                </div>
                <div className="mt-0.5 text-xs text-base-content/60">
                  {copy.deepReport.psiLabels[key]}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * The Deep report's lab panel (Core Web Vitals + Lighthouse) with Di động /
 * Máy tính tabs. Mobile is the default and the SCORED strategy — the desktop
 * tab is a comparative display and says so. Reports stored before desktop
 * capture existed get no tab bar, just their mobile groups and an unobtrusive
 * note; the crawl/issues/GEO sections are form-factor-agnostic and live
 * entirely outside this panel.
 */
export function StrategyLabPanel({
  report,
  locale,
}: {
  report: DeepReport;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].strategyTabs;
  const [active, setActive] = useState<StrategyKey>("mobile");
  const mobile = mobileLab(report);
  const desktop = desktopLab(report);

  // No desktop capture and no mobile lab data either (PSI withheld everything):
  // these reports rendered no lab groups before, so keep rendering nothing.
  if (!desktop && !hasLabData(mobile)) return null;

  const activeLab = active === "desktop" && desktop ? desktop : mobile;

  return (
    <section className="divide-y divide-base-300 rounded-box border border-base-300 bg-base-100">
      {desktop ? (
        <div className="p-3">
          <div
            role="tablist"
            aria-label={copy.ariaLabel}
            className="tabs tabs-box w-fit"
          >
            {(["mobile", "desktop"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active === key}
                className={`tab ${active === key ? "tab-active" : ""}`}
                onClick={() => setActive(key)}
              >
                {key === "mobile" ? copy.mobileTab : copy.desktopTab}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {desktop && active === "desktop" ? (
        <p className="px-4 py-2.5 text-xs text-base-content/60">
          {copy.desktopComparativeNote}
        </p>
      ) : null}

      {hasLabData(activeLab) ? (
        <LabGroups lab={activeLab} locale={locale} />
      ) : (
        <p className="px-4 py-3 text-xs text-base-content/60">
          {copy.noStrategyData}
        </p>
      )}

      {!desktop ? (
        <p className="px-4 py-2.5 text-xs text-base-content/60">
          {copy.desktopNotCaptured}
        </p>
      ) : null}
    </section>
  );
}
