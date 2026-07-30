import type { DeepReport } from "@/server/services/seo-check/deep-types";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { ScoreGauge } from "./ScoreGauge";
import { CategoryScoreCards } from "./CategoryScoreCards";
import { CoreWebVitalsCards } from "./CoreWebVitalsCards";
import { SiteScreenshot } from "./SiteScreenshot";
import { GeoSection } from "./GeoSection";
import { SignalRow } from "./SignalRow";
import { triageSignals } from "./triage";
import { scoreHeadline } from "./score-presentation";

const PSI_KEYS: (keyof DeepReport["psiScores"])[] = [
  "performance",
  "seo",
  "accessibility",
  "bestPractices",
];

function LighthouseScores({
  scores,
  locale,
}: {
  scores: DeepReport["psiScores"];
  locale: Locale;
}) {
  const labels = CHECK_RESULT_COPY[locale].deepReport.psiLabels;
  const present = PSI_KEYS.filter((key) => scores[key] !== null);
  if (present.length === 0) return null;

  return (
    <section className="space-y-2">
      {/* Product name — never translated. */}
      <h2 className="text-sm font-medium">Google Lighthouse</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {present.map((key) => (
          <div
            key={key}
            className="rounded-box border border-base-300 bg-base-100 p-3 text-center"
          >
            <div className="font-mono text-xl font-bold tabular-nums">
              {scores[key]}
            </div>
            <div className="mt-1 text-xs text-base-content/60">
              {labels[key]}
            </div>
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
export function DeepReportView({
  report,
  locale,
}: {
  report: DeepReport;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].deepReport;
  const triageCopy = CHECK_RESULT_COPY[locale].triage;
  // Same ordering the Lite result uses: worst first, top finding open, passing
  // checks folded. A shared report is the artifact someone forwards to whoever
  // has to act on it, so burying the failures costs more here, not less.
  const primary = triageSignals(report.signals);
  const issueCount = primary.actionable.length;

  return (
    <div className="space-y-6">
      <div className="rounded-box border border-base-300 bg-base-100 p-6 text-center">
        <ScoreGauge score={report.overallScore} locale={locale} />
        <p className="mt-3 text-sm font-medium">
          {scoreHeadline(report.overallScore, issueCount, locale)}
        </p>
        <p className="mt-1 break-all font-mono text-xs text-base-content/60">
          {report.finalUrl}
        </p>
      </div>

      <CategoryScoreCards
        categoryScores={report.categoryScores}
        locale={locale}
      />

      {report.coreWebVitals ? (
        <CoreWebVitalsCards
          coreWebVitals={report.coreWebVitals}
          source={report.cwvSource}
          locale={locale}
        />
      ) : null}

      <LighthouseScores scores={report.psiScores} locale={locale} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">
          {copy.checksHeading}{" "}
          {report.crawl.pagesCrawled > 1 ? copy.primaryPageSuffix : ""}
        </h2>
        <div className="space-y-2">
          {primary.actionable.length === 0 ? (
            <p className="rounded-box border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content/70">
              {triageCopy.allClear}
            </p>
          ) : (
            primary.actionable.map((signal, index) => (
              <SignalRow
                key={signal.id}
                signal={signal}
                locale={locale}
                defaultOpen={index === 0}
              />
            ))
          )}

          {primary.passed.length > 0 ? (
            <details className="group rounded-box border border-base-300 bg-base-100">
              <summary className="fsc-summary cursor-pointer px-4 py-3 text-sm text-base-content/70">
                {triageCopy.passedToggle(primary.passed.length)}
              </summary>
              <div className="space-y-2 px-2 pb-2">
                {primary.passed.map((signal) => (
                  <SignalRow key={signal.id} signal={signal} locale={locale} />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </section>

      {/* Demoted out of slot #2, as on the Lite result. It loads from a live
          capture service and spends ten to thirty seconds as an empty frame;
          directly under the score it pushed the metrics and every finding below
          the fold — and this is the report someone forwards to whoever has to
          act on it. */}
      <SiteScreenshot pageUrl={report.finalUrl} locale={locale} />

      {report.geo ? <GeoSection geo={report.geo} locale={locale} /> : null}

      {report.pages.length > 1 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">
            {copy.otherPagesHeading(report.pages.length - 1)}
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
                  <span className="shrink-0 text-xs text-base-content/60">
                    {pageIssues === 0
                      ? copy.noIssues
                      : copy.issuesToFix(pageIssues)}
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
