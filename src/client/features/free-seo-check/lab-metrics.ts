/**
 * Metric rows for the FREE lab panel (the "homepage · lab" bundle data).
 *
 * LCP / CLS / TTFB reuse the Deep report's rows verbatim — same thresholds,
 * same formatting — so the two surfaces can never disagree on a verdict. The
 * one deliberate difference is the `inpMs` slot: the lab shaping puts
 * Lighthouse's Total Blocking Time there (labs cannot measure INP), so this
 * panel labels it TBT and scores it against Lighthouse's own TBT cutoffs
 * (≤200ms good, ≤600ms needs improvement — https://developer.chrome.com/docs/
 * lighthouse/performance/lighthouse-total-blocking-time). Coloring TBT with
 * INP's 200/500ms bands would state a Core Web Vitals verdict about a metric
 * that is not the Core Web Vital.
 */
import { CWV_METRICS } from "./score-summary";
import type { VisualLabCwv } from "./filmstrip-bundle";

interface LabMetricRow {
  key: keyof VisualLabCwv;
  label: string;
  good: number;
  needsImprovement: number;
  format: (value: number) => string;
}

function inherited(key: "lcpMs" | "cls" | "ttfbMs"): LabMetricRow {
  const metric = CWV_METRICS.find((entry) => entry.key === key);
  if (!metric) throw new Error(`CWV_METRICS is missing ${key}`);
  return metric;
}

export const FREE_LAB_METRICS: readonly LabMetricRow[] = [
  inherited("lcpMs"),
  {
    key: "inpMs",
    label: "TBT",
    good: 200,
    needsImprovement: 600,
    format: (value) => `${Math.round(value)}ms`,
  },
  inherited("cls"),
  inherited("ttfbMs"),
];
