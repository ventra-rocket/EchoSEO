/**
 * `score` — turns evaluated issues into a 0-100 score per category.
 *
 * Weighting: pass=1, warn=0.5, fail=0, averaged within a category then
 * scaled to 0-100. A category with no issues scores 0 (never reported as
 * a false "perfect" score for a category that wasn't checked).
 */
import type { Issue, IssueStatus, RuleCategory } from "./types";

const STATUS_WEIGHT: Record<IssueStatus, number> = {
  pass: 1,
  warn: 0.5,
  fail: 0,
};

interface CategoryScore {
  category: RuleCategory;
  score: number;
}

export function score(
  issues: Issue[],
  categories: readonly RuleCategory[],
): CategoryScore[] {
  return categories.map((category) => {
    const inCategory = issues.filter((issue) => issue.category === category);
    const categoryScore = inCategory.length
      ? Math.round(
          (inCategory.reduce(
            (sum, issue) => sum + STATUS_WEIGHT[issue.status],
            0,
          ) /
            inCategory.length) *
            100,
        )
      : 0;
    return { category, score: categoryScore };
  });
}
