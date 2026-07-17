/**
 * Pure presentation helpers for the Lite report UI.
 *
 * Maps a 0-100 score to a visual band (color) + letter grade, and maps a
 * signal status to its icon/badge colors. Kept framework-free and deterministic
 * so components stay thin and these can be unit-tested if needed.
 */
import type { SignalStatus } from "@/server/services/seo-check/types";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";

type ScoreBand = "good" | "fair" | "poor";

/** Color band for a score: good (green) ≥80, fair (amber) 60-79, poor (red) <60. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "good";
  if (score >= 60) return "fair";
  return "poor";
}

/** Letter grade A-F for a score. */
export function scoreGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/** Tailwind text-color utility per band (daisyUI semantic tokens). */
export const BAND_TEXT: Record<ScoreBand, string> = {
  good: "text-success",
  fair: "text-warning",
  poor: "text-error",
};

/** CSS color value per band — for SVG stroke / inline styles where a utility class is awkward. */
export const BAND_COLOR_VAR: Record<ScoreBand, string> = {
  good: "var(--color-success)",
  fair: "var(--color-warning)",
  poor: "var(--color-error)",
};

/** Tailwind text-color per signal status (for the row icon). */
export const STATUS_TEXT: Record<SignalStatus, string> = {
  pass: "text-success",
  warn: "text-warning",
  fail: "text-error",
};

/** daisyUI badge class per signal status. */
export const STATUS_BADGE: Record<SignalStatus, string> = {
  pass: "badge-success",
  warn: "badge-warning",
  fail: "badge-error",
};

/** Short human summary shown under the gauge, in the visitor's language. */
export function scoreHeadline(
  score: number,
  issueCount: number,
  locale: Locale,
): string {
  const copy = CHECK_RESULT_COPY[locale].headline;
  if (issueCount === 0) return copy.none;
  const band = scoreBand(score);
  if (band === "good") return copy.good(issueCount);
  if (band === "fair") return copy.fair(issueCount);
  return copy.needsWork(issueCount);
}
