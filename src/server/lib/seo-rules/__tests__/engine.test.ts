import { describe, expect, it } from "vitest";
import { evaluate } from "../engine";
import type { Rule } from "../types";

interface FakeInput {
  value: number;
}

function makeRule(id: string, threshold: number): Rule<FakeInput> {
  return {
    id,
    category: "meta",
    severity: "low",
    label: `value >= ${threshold}`,
    appliesWhen: (input) => (input.value >= threshold ? "pass" : "fail"),
    problem: "value too low",
    fixSteps: ["raise the value"],
    googleSourceUrl: "https://developers.google.com/search",
    guideQuote: "example quote",
    lastReviewedDate: "2026-07-13",
  };
}

describe("evaluate", () => {
  it("maps each rule to an issue carrying the rule's static fields", () => {
    const rules = [makeRule("rule-a", 10)];

    const issues = evaluate(rules, { value: 5 });

    expect(issues).toEqual([
      {
        id: "rule-a",
        category: "meta",
        severity: "low",
        label: "value >= 10",
        status: "fail",
        problem: "value too low",
        fixSteps: ["raise the value"],
        googleSourceUrl: "https://developers.google.com/search",
        guideQuote: "example quote",
        lastReviewedDate: "2026-07-13",
      },
    ]);
  });

  it("is deterministic across repeated calls with the same input", () => {
    const rules = [makeRule("rule-a", 10), makeRule("rule-b", 3)];
    const input = { value: 7 };

    expect(evaluate(rules, input)).toEqual(evaluate(rules, input));
  });

  it("does not mutate the input or the rule definitions", () => {
    const rules = [makeRule("rule-a", 10)];
    const input = { value: 5 };
    const inputSnapshot = { ...input };
    const ruleSnapshot = { ...rules[0] };

    evaluate(rules, input);

    expect(input).toEqual(inputSnapshot);
    expect(rules[0]).toEqual(ruleSnapshot);
  });

  it("returns an empty array for an empty rule set", () => {
    expect(evaluate([], { value: 1 })).toEqual([]);
  });
});
