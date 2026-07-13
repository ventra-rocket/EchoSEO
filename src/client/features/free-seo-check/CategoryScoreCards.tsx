import type {
  CategoryScore,
  SignalCategory,
} from "@/server/services/seo-check/types";
import { BAND_COLOR_VAR, BAND_TEXT, scoreBand } from "./score-presentation";

const CATEGORY_LABELS: Record<SignalCategory, string> = {
  meta: "Meta",
  structure: "Page Structure",
  server: "Server",
};

/** Three per-category score cards with a monospace number and a mini fill bar. */
export function CategoryScoreCards({
  categoryScores,
}: {
  categoryScores: CategoryScore[];
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
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
              {CATEGORY_LABELS[category.category]}
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
