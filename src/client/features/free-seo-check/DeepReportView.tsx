import type { DeepReport } from "@/server/services/seo-check/deep-types";
import { ScoreGauge } from "./ScoreGauge";
import { CategoryScoreCards } from "./CategoryScoreCards";
import { CoreWebVitalsCards } from "./CoreWebVitalsCards";
import { SignalRow } from "./SignalRow";
import { scoreHeadline } from "./score-presentation";

const PSI_LABELS: { key: keyof DeepReport["psiScores"]; label: string }[] = [
  { key: "performance", label: "Performance" },
  { key: "seo", label: "SEO" },
  { key: "accessibility", label: "Accessibility" },
  { key: "bestPractices", label: "Best Practices" },
];

function LighthouseScores({ scores }: { scores: DeepReport["psiScores"] }) {
  const present = PSI_LABELS.filter(({ key }) => scores[key] !== null);
  if (present.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">Google Lighthouse</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {present.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-box border border-base-300 bg-base-100 p-3 text-center"
          >
            <div className="font-mono text-xl font-bold tabular-nums">
              {scores[key]}
            </div>
            <div className="mt-1 text-xs text-base-content/60">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Composes the full Deep report. Deliberately renders report data only — the
 * lead's email never reaches this page (see report-view.ts): anyone holding the
 * link can read whatever is here.
 */
export function DeepReportView({ report }: { report: DeepReport }) {
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

      {report.coreWebVitals ? (
        <CoreWebVitalsCards
          coreWebVitals={report.coreWebVitals}
          source={report.cwvSource}
        />
      ) : null}

      <LighthouseScores scores={report.psiScores} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">
          Checks {report.crawl.pagesCrawled > 1 ? "(primary page)" : ""}
        </h2>
        <div className="space-y-2">
          {report.signals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} />
          ))}
        </div>
      </section>

      {report.pages.length > 1 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">
            Other pages crawled ({report.pages.length - 1})
          </h2>
          <div className="space-y-2">
            {report.pages.slice(1).map((page) => {
              const pageIssues = page.signals.filter(
                (signal) => signal.status !== "pass",
              ).length;
              return (
                <div
                  key={page.url}
                  className="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-3"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-base-content/60">
                    {page.url}
                  </span>
                  <span className="shrink-0 text-xs text-base-content/50">
                    {pageIssues === 0 ? "no issues" : `${pageIssues} to fix`}
                  </span>
                  <span className="shrink-0 font-mono text-sm font-bold tabular-nums">
                    {page.overallScore}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
