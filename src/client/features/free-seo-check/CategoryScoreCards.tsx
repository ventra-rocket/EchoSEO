import type { CategoryScore } from "@/server/services/seo-check/types";
import type { DeepCategoryScore } from "@/server/services/seo-check/deep-types";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { formatScanDate } from "./report-format";
import { BAND_COLOR_VAR, BAND_TEXT, scoreBand } from "./score-presentation";

/**
 * Per-category score cards with a monospace number and a mini fill bar. Lite
 * reports three categories; Deep adds `core-web-vitals`, so a fourth card goes
 * 2x2 on narrow screens instead of squeezing all four into one row.
 *
 * These are the one score cluster on the page that is not Google's: our own
 * crawler fetched the page and applied the rule catalog. Saying so under the
 * cards is what stops a reader from checking them against Lighthouse and
 * concluding the tool is broken when they do not match.
 */
export function CategoryScoreCards({
  categoryScores,
  fetchedAt,
  locale,
}: {
  categoryScores: readonly (CategoryScore | DeepCategoryScore)[];
  /** When the crawler fetched the page — the run these scores describe. */
  fetchedAt: string;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale];
  const labels = copy.categoryLabels;
  const columns =
    categoryScores.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3";

  return (
    <div className="space-y-2">
      <div className={`grid ${columns} gap-3`}>
        {categoryScores.map((category) => {
          const band = scoreBand(category.score);
          return (
            <div
              key={category.category}
              className="rounded-box border border-base-300 bg-base-100 p-3 text-center"
            >
              <div
                className={`font-mono text-2xl font-bold tabular-nums ${BAND_TEXT[band]}`}
              >
                {category.score}
              </div>
              <div className="mb-2 mt-1 text-xs text-base-content/60">
                {labels[category.category]}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-300">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${category.score}%`,
                    backgroundColor: BAND_COLOR_VAR[band],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="px-1 text-xs text-base-content/60">
        {copy.provenance.ownCrawler} ·{" "}
        {copy.provenance.measuredAt(formatScanDate(fetchedAt, locale))}
      </p>
    </div>
  );
}
