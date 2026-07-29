import type { DeepReport } from "@/server/services/seo-check/deep-types";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";

type CoreWebVitals = NonNullable<DeepReport["coreWebVitals"]>;

/**
 * Google's own "good" thresholds — the same ones PageSpeed Insights scores
 * against, so a visitor comparing the two sees matching verdicts.
 * https://web.dev/articles/defining-core-web-vitals-thresholds
 */
const METRICS: {
  key: keyof CoreWebVitals;
  label: string;
  good: number;
  needsImprovement: number;
  format: (value: number) => string;
}[] = [
  {
    key: "lcpMs",
    label: "LCP",
    good: 2500,
    needsImprovement: 4000,
    format: (value) => `${(value / 1000).toFixed(1)}s`,
  },
  {
    key: "inpMs",
    label: "INP",
    good: 200,
    needsImprovement: 500,
    format: (value) => `${Math.round(value)}ms`,
  },
  {
    key: "cls",
    label: "CLS",
    good: 0.1,
    needsImprovement: 0.25,
    format: (value) => value.toFixed(2),
  },
  {
    key: "ttfbMs",
    label: "TTFB",
    good: 800,
    needsImprovement: 1800,
    format: (value) => `${Math.round(value)}ms`,
  },
];

function metricTone(value: number, good: number, needsImprovement: number) {
  if (value <= good) return "text-success";
  if (value <= needsImprovement) return "text-warning";
  return "text-error";
}

/** The four Core Web Vitals — the headline the Deep tier unlocks over Lite. */
export function CoreWebVitalsCards({
  coreWebVitals,
  source,
  locale,
}: {
  coreWebVitals: CoreWebVitals;
  source: DeepReport["cwvSource"];
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].coreWebVitals;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        {/* "Core Web Vitals" is the Google product term in every locale. */}
        <h2 className="text-sm font-medium">Core Web Vitals</h2>
        <span className="text-xs text-base-content/60">
          {source === "field" ? copy.sourceField : copy.sourceLab}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {METRICS.map((metric) => {
          const value = coreWebVitals[metric.key];
          return (
            <div
              key={metric.key}
              className="rounded-box border border-base-300 bg-base-100 p-3 text-center"
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
              <div className="mt-1 text-xs text-base-content/60">
                {metric.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
