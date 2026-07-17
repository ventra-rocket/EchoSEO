import type { CategoryScore } from "@/server/services/seo-check/types";
import type { DeepCategoryScore } from "@/server/services/seo-check/deep-types";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { BAND_COLOR_VAR, BAND_TEXT, scoreBand } from "./score-presentation";

/**
 * Per-category score cards with a monospace number and a mini fill bar. Lite
 * reports three categories; Deep adds `core-web-vitals`, so a fourth card goes
 * 2x2 on narrow screens instead of squeezing all four into one row.
 */
export function CategoryScoreCards({
  categoryScores,
  locale,
}: {
  categoryScores: readonly (CategoryScore | DeepCategoryScore)[];
  locale: Locale;
}) {
  const labels = CHECK_RESULT_COPY[locale].categoryLabels;
  const columns =
    categoryScores.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3";

  return (
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
  );
}
