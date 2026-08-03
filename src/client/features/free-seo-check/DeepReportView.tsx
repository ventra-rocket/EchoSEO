import { ChevronRight } from "lucide-react";
import type { DeepReport } from "@/server/services/seo-check/deep-types";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { ReportScoreBand } from "./ReportScoreBand";
import { ScoreSummaryPanel } from "./ScoreSummaryPanel";
import { StrategyLabPanel } from "./StrategyLabPanel";
import { SectionHeading } from "./SectionHeading";
import { SiteScreenshot } from "./SiteScreenshot";
import { GeoSection } from "./GeoSection";
import { SignalRow } from "./SignalRow";
import { triageSignals } from "./triage";
import { pagePathOnly } from "./report-format";

/**
 * ScoreSummaryPanel renders every group it finds data for, and the lab groups
 * (Core Web Vitals + Lighthouse) moved into the strategy-tabbed panel beside
 * it — so it gets a payload with no lab data and renders category scores
 * only. Without this the mobile lab numbers would appear twice in the rail.
 */
const NO_LAB_DATA = {
  coreWebVitals: null,
  cwvSource: null,
  psiScores: {
    performance: null,
    seo: null,
    accessibility: null,
    bestPractices: null,
  },
} satisfies Partial<DeepReport>;

/**
 * Composes the full Deep report. Deliberately renders report data only — the
 * lead's email never reaches this page (see report-view.ts): anyone holding the
 * link can read whatever is here.
 *
 * Layout: a horizontal score band on top, then at lg+ a sticky score rail
 * beside the findings — the same two-pane shape as the Lite result, because a
 * single reading-width column cannot carry a scannable table of findings, and
 * this is the artifact someone forwards to whoever has to act on it.
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
  // checks folded. Burying the failures costs more here, not less.
  const primary = triageSignals(report.signals);
  const checksEyebrow = `${copy.checksHeading}${
    report.crawl.pagesCrawled > 1 ? ` ${copy.primaryPageSuffix}` : ""
  }`;

  return (
    <div className="space-y-6">
      <ReportScoreBand
        report={report}
        counts={primary.counts}
        issueCount={primary.actionable.length}
        locale={locale}
      />

      <div className="space-y-6 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-4 lg:sticky lg:top-6">
          <ScoreSummaryPanel
            report={{ ...report, ...NO_LAB_DATA }}
            locale={locale}
          />
          <StrategyLabPanel report={report} locale={locale} />
        </div>

        <div className="min-w-0 space-y-6">
          <section className="space-y-3">
            <SectionHeading
              eyebrow={checksEyebrow}
              title={triageCopy.checksHeading}
            />
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
                  {/* The chevron is the affordance: without it this row reads
                      as dead text, and nobody discovers it opens. */}
                  <summary className="fsc-summary flex cursor-pointer items-center gap-1.5 px-4 py-3 text-sm text-base-content/70">
                    <ChevronRight
                      className="size-3.5 shrink-0 transition-transform group-open:rotate-90"
                      aria-hidden="true"
                    />
                    {triageCopy.passedToggle(primary.passed.length)}
                  </summary>
                  <div className="space-y-2 px-2 pb-2">
                    {primary.passed.map((signal) => (
                      <SignalRow
                        key={signal.id}
                        signal={signal}
                        locale={locale}
                      />
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </section>

          {/* Below the findings, as on the Lite result: it loads from a live
              capture service and can spend ~30s empty; above them it pushed
              every finding below the fold. */}
          <SiteScreenshot pageUrl={report.finalUrl} locale={locale} />

          {report.geo ? <GeoSection geo={report.geo} locale={locale} /> : null}

          {report.pages.length > 1 ? (
            <section className="space-y-3">
              <SectionHeading
                title={copy.otherPagesHeading(report.pages.length - 1)}
              />
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
                      {/* Path only: every row shares the report's host, so full
                          URLs truncated to the same prefix and the list said
                          nothing. The full URL stays reachable as the title. */}
                      <span
                        className="min-w-0 flex-1 truncate font-mono text-xs text-base-content/70"
                        title={page.url}
                      >
                        {pagePathOnly(page.url)}
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
      </div>
    </div>
  );
}
