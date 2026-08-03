/**
 * Data selection behind the Deep report's Di động/Máy tính lab tabs.
 *
 * Mobile is the report's PRIMARY, scored strategy: the top-level
 * `coreWebVitals`/`cwvSource`/`psiScores` fields ARE the mobile lab data, and
 * every score on the page derives from them. The optional `desktop` section is
 * a comparative capture — displayed, never scored — and reports stored before
 * it existed simply don't carry it, which is what decides whether a tab bar
 * renders at all. Plain module (not the component) so these rules are
 * unit-testable in the node test project.
 */
import type { DeepReport } from "@/server/services/seo-check/deep-types";

export type StrategyKey = "mobile" | "desktop";

/** One strategy's lab data — the same shape for both tabs. */
export interface StrategyLab {
  coreWebVitals: DeepReport["coreWebVitals"];
  cwvSource: DeepReport["cwvSource"];
  psiScores: DeepReport["psiScores"];
}

/** The scored, always-present strategy — the report's own top-level fields. */
export function mobileLab(report: DeepReport): StrategyLab {
  return {
    coreWebVitals: report.coreWebVitals,
    cwvSource: report.cwvSource,
    psiScores: report.psiScores,
  };
}

/**
 * Null for reports stored before desktop capture existed (and for runs whose
 * best-effort desktop call failed) — the caller then renders no tab bar
 * instead of a permanently empty tab.
 */
export function desktopLab(report: DeepReport): StrategyLab | null {
  return report.desktop ?? null;
}

/** Whether a strategy has anything to show. A tab with no data renders an
 * explanatory line; a report with no lab data anywhere renders no panel. */
export function hasLabData(lab: StrategyLab): boolean {
  return (
    lab.coreWebVitals !== null ||
    Object.values(lab.psiScores).some((score) => score !== null)
  );
}
