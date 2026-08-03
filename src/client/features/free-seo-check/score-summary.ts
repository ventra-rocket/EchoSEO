/**
 * Data and layout logic behind the merged score panel (categories + Core Web
 * Vitals + Lighthouse in one bordered box). The CWV thresholds and the
 * responsive hairline matrix are the parts a refactor can silently break, so
 * they live in a plain module with unit tests.
 */
import type { DeepReport } from "@/server/services/seo-check/deep-types";

type CoreWebVitals = NonNullable<DeepReport["coreWebVitals"]>;

/**
 * Google's own "good" thresholds — the same ones PageSpeed Insights scores
 * against, so a visitor comparing the two sees matching verdicts.
 * https://web.dev/articles/defining-core-web-vitals-thresholds
 */
export const CWV_METRICS: {
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

/** Verdict color for a measured CWV value against its two thresholds. */
export function metricTone(
  value: number,
  good: number,
  needsImprovement: number,
): "text-success" | "text-warning" | "text-error" {
  if (value <= good) return "text-success";
  if (value <= needsImprovement) return "text-warning";
  return "text-error";
}

/**
 * Internal hairlines for a score-panel cell, by cell index.
 *
 * The panel's grid is 2 columns by default (phones and the lg+ side rail),
 * widening to 4 columns only between `sm` and `lg`, where the page is a single
 * full-width column. Tailwind's `divide-*` utilities can't express "left edge
 * of every column but the first, top edge of every row but the first" across
 * that breakpoint flip, so each cell carries its own border classes.
 */
export function scoreCellBorders(index: number): string {
  const parts = [
    index % 2 === 1 ? "border-l" : "",
    index >= 2 ? "border-t" : "",
    index % 4 === 0 ? "sm:border-l-0" : "sm:border-l",
    index >= 4 ? "sm:border-t" : "sm:border-t-0",
    index % 2 === 1 ? "lg:border-l" : "lg:border-l-0",
    index >= 2 ? "lg:border-t" : "lg:border-t-0",
  ];
  return parts.filter(Boolean).join(" ");
}
