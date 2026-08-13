import type { LiteReport } from "@/server/services/seo-check/types";
import type { Locale } from "@/client/i18n/config";
import { ScoreGauge } from "./ScoreGauge";
import { CategoryScoreCards } from "./CategoryScoreCards";
import { SignalRow } from "./SignalRow";
import { PageReadPanel } from "./PageReadPanel";
import { DeepRequestForm } from "./DeepRequestForm";
import { DeepTierPausedNotice } from "./DeepTierPitch";
import { scoreHeadline, STATUS_BADGE } from "./score-presentation";
import { SiteScreenshot } from "./SiteScreenshot";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { triageSignals } from "./triage";

/**
 * The Lite result.
 *
 * Ordered by what the reader needs, not by how the rule catalogs happen to be
 * concatenated. Previously every check rendered in definition order at equal
 * visual weight, so a failure could sit ninth under eight green rows; the page
 * capture occupied the slot directly under the score while loading an empty
 * frame; and the one place a visitor could act — the deep-check form — sat at
 * maximum scroll depth.
 *
 * Now: score and triage first, then the evidence, then what needs attention
 * worst-first with every finding's fix steps already open, then passing checks
 * folded away, and only then the supporting material.
 *
 * At `lg` the score and its counts become a sticky rail beside the checks. A
 * single 672px column cannot carry a scannable table of findings, and the
 * findings are the product.
 */
export function LiteReportView({
  report,
  deepAvailable,
  locale,
  warmInactiveStrategy = true,
}: {
  report: LiteReport;
  /** False while the Deep tier's kill-switch is on — offer nothing rather than a form that refuses. */
  deepAvailable: boolean;
  locale: Locale;
  /**
   * Threaded to the visual panel. Defaults true because this view's home is
   * the inline result of a check that just ran: eagerly mounting both
   * strategies' captures IS the pre-warm (exactly two renders, and only for
   * a check that succeeded). The `/c/` share page passes false — a stranger
   * opening a forwarded link must not spend two render-ceiling slots.
   */
  warmInactiveStrategy?: boolean;
}) {
  const copy = CHECK_RESULT_COPY[locale];
  const { actionable, passed, counts } = triageSignals(report.signals);

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <div className="space-y-4 lg:sticky lg:top-6">
        <div className="rounded-box border border-base-300 bg-base-100 p-6 text-center">
          <ScoreGauge score={report.overallScore} locale={locale} />
          <p className="mt-3 text-sm font-medium">
            {scoreHeadline(report.overallScore, actionable.length, locale)}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-base-content/60">
            {report.finalUrl}
          </p>

          {/* The shape of the result before any of it is read. */}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {counts.fail > 0 ? (
              <span className={`badge badge-sm ${STATUS_BADGE.fail}`}>
                {copy.triage.failing(counts.fail)}
              </span>
            ) : null}
            {counts.warn > 0 ? (
              <span className={`badge badge-sm ${STATUS_BADGE.warn}`}>
                {copy.triage.warnings(counts.warn)}
              </span>
            ) : null}
            <span className={`badge badge-sm ${STATUS_BADGE.pass}`}>
              {copy.triage.passed(counts.pass)}
            </span>
          </div>
        </div>

        <CategoryScoreCards
          categoryScores={report.categoryScores}
          fetchedAt={report.fetchedAt}
          locale={locale}
        />
      </div>

      <div className="space-y-6">
        <PageReadPanel pageSummary={report.pageSummary} locale={locale} />

        <section className="space-y-2">
          <h3 className="text-sm font-medium">{copy.triage.checksHeading}</h3>

          {actionable.length === 0 ? (
            <p className="rounded-box border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content/70">
              {copy.triage.allClear}
            </p>
          ) : (
            actionable.map((signal) => (
              <SignalRow key={signal.id} signal={signal} locale={locale} />
            ))
          )}

          {/* Folded, never dropped: "what did you check?" is a fair question,
              and a tool that hides its passing checks invites the suspicion
              that it did not run them. */}
          {passed.length > 0 ? (
            <details className="group rounded-box border border-base-300 bg-base-100">
              <summary className="fsc-summary cursor-pointer px-4 py-3 text-sm text-base-content/70">
                {copy.triage.passedToggle(passed.length)}
              </summary>
              <div className="space-y-2 px-2 pb-2">
                {passed.map((signal) => (
                  <SignalRow key={signal.id} signal={signal} locale={locale} />
                ))}
              </div>
            </details>
          ) : null}
        </section>

        {/* Demoted out of slot #2. It loads from a live capture service and
            spends ten to thirty seconds as an empty frame; sitting directly
            under the score, it pushed every finding below the fold. The lab
            panel (free Lighthouse scores + lab CWV) rides under each tab —
            founder decision; the Deep pitch below sells the crawl/field data
            instead. */}
        <SiteScreenshot
          pageUrl={report.finalUrl}
          locale={locale}
          warmInactiveStrategy={warmInactiveStrategy}
          showLabPanel
        />

        {deepAvailable ? (
          // Deep-check the URL the report actually landed on, not the raw input —
          // it's what the visitor is looking at, redirects and all.
          <DeepRequestForm
            url={report.finalUrl}
            metricCount={report.deepTeaser.coreWebVitalsMetricCount}
            locale={locale}
          />
        ) : (
          <DeepTierPausedNotice
            metricCount={report.deepTeaser.coreWebVitalsMetricCount}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
}
