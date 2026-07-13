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
  return rules.map((rule) => ({
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
  }));
}
