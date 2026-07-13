import type { LiteReport } from "@/server/services/seo-check/types";
import { ScoreGauge } from "./ScoreGauge";
import { CategoryScoreCards } from "./CategoryScoreCards";
import { SignalRow } from "./SignalRow";
import { DeepTeaser } from "./DeepTeaser";
import { scoreHeadline } from "./score-presentation";

/** Composes the full Lite report: score hero, category cards, signals, teaser. */
export function LiteReportView({ report }: { report: LiteReport }) {
  const issueCount = report.signals.filter(
    (signal) => signal.status !== "pass",
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-box border border-base-300 bg-base-100 p-6 text-center">
        <ScoreGauge score={report.overallScore} />
        <p className="mt-3 text-sm font-medium">
          {scoreHeadline(report.overallScore, issueCount)}
        </p>
        <p className="mt-1 break-all font-mono text-xs text-base-content/40">
          {report.finalUrl}
        </p>
      </div>

      <CategoryScoreCards categoryScores={report.categoryScores} />

      <div className="space-y-2">
        {report.signals.map((signal) => (
          <SignalRow key={signal.id} signal={signal} />
        ))}
      </div>

      <DeepTeaser metricCount={report.deepTeaser.coreWebVitalsMetricCount} />
    </div>
  );
}
