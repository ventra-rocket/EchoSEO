/**
 * `evaluate` — runs a rule catalog against normalized input and returns
 * issues. Pure and deterministic: no network calls, no dates, no
 * side effects, so results are reproducible and cheap to unit test.
 */
import type { Issue, Rule } from "./types";

export function evaluate<TInput>(
  rules: Array<Rule<TInput>>,
  input: TInput,
): Issue[] {
  return rules.map((rule) => {
    // Called once. A rule that measured nothing leaves the key absent rather
    // than present-and-null, so a report written before rules had measurements
    // is indistinguishable from one whose rules had nothing to report — which
    // is what lets the field stay optional for already-persisted reports.
    const measurement = rule.measure?.(input) ?? undefined;
    return {
      id: rule.id,
      category: rule.category,
      severity: rule.severity,
      label: rule.label,
      status: rule.appliesWhen(input),
      problem: rule.problem,
      fixSteps: rule.fixSteps,
      googleSourceUrl: rule.googleSourceUrl,
      guideQuote: rule.guideQuote,
      lastReviewedDate: rule.lastReviewedDate,
      ...(measurement ? { measurement } : {}),
    };
  });
}
