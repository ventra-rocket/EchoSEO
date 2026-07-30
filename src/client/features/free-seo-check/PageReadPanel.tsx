import type { LiteReport } from "@/server/services/seo-check/types";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { buildPageReadRows } from "./page-read-rows";
import { formatMeasurement } from "./format-measurement";

/**
 * The values actually found on the scanned page, with their measured lengths.
 *
 * Every LiteReport has carried `pageSummary` since the checker shipped and
 * nothing rendered it, so the report asserted verdicts about a page it never
 * showed. Meanwhile the sample card on the landing advertises exactly this —
 * "54 chars", "38 chars — too short" — which made the sample promise more than
 * a real result delivered. This closes that gap with data already in hand: no
 * schema change, no migration, nothing new to persist.
 *
 * The content is a raw excerpt of someone else's page and is untrusted. JSX
 * escapes it on render; it must never reach a raw-HTML sink.
 */
export function PageReadPanel({
  pageSummary,
  locale,
}: {
  pageSummary: LiteReport["pageSummary"];
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].pageRead;
  const rows = buildPageReadRows(pageSummary, copy);

  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-4">
      <h3 className="mb-3 text-sm font-medium">{copy.heading}</h3>
      <dl className="space-y-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
          >
            <dt className="shrink-0 font-mono text-xs uppercase tracking-wide text-base-content/60 sm:w-40">
              {row.label}
            </dt>
            <dd className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm">
              {row.value ? (
                // Wrapped rather than truncated: the length is the finding, so
                // hiding the tail would hide what the verdict is about.
                <span className="break-words">{row.value}</span>
              ) : (
                <span className="italic text-base-content/60">
                  {copy.missing}
                </span>
              )}
              {row.measurement ? (
                <span className="shrink-0 font-mono text-xs text-base-content/60">
                  {formatMeasurement(row.measurement, locale)}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
