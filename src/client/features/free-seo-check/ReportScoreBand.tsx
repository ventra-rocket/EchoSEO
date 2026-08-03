import type { DeepReport } from "@/server/services/seo-check/deep-types";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { ScoreGauge } from "./ScoreGauge";
import { scoreHeadline, STATUS_BADGE } from "./score-presentation";
import { formatScanDate } from "./report-format";

/**
 * The Deep report's opening statement as a horizontal band: gauge on the left,
 * everything a forwarded reader needs to orient on the right — verdict, URL,
 * scan date, crawl size, and the shape of the findings. Replaces a ~360px
 * centered card that spent two thirds of its width on empty padding and made
 * the reader scroll for every fact except the number.
 */
export function ReportScoreBand({
  report,
  counts,
  issueCount,
  locale,
}: {
  report: DeepReport;
  counts: { fail: number; warn: number; pass: number };
  issueCount: number;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale];

  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-5 sm:p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
        <div className="shrink-0">
          <ScoreGauge score={report.overallScore} locale={locale} />
        </div>

        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {scoreHeadline(report.overallScore, issueCount, locale)}
          </h1>
          <p className="break-all font-mono text-xs text-base-content/70">
            {report.finalUrl}
          </p>
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-xs text-base-content/60 sm:justify-start">
            <span>
              {copy.reportBand.scanned(
                formatScanDate(report.fetchedAt, locale),
              )}
            </span>
            <span>
              {copy.reportBand.pagesCrawled(report.crawl.pagesCrawled)}
            </span>
          </p>
          {/* The shape of the result before any of it is read — same chips the
              Lite result leads with. */}
          <div className="flex flex-wrap justify-center gap-1.5 pt-1 sm:justify-start">
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
      </div>
    </section>
  );
}
