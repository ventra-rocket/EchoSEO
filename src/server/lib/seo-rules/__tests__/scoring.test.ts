import { describe, expect, it } from "vitest";
import { score } from "../scoring";
import type { Issue } from "../types";

function makeIssue(overrides: Partial<Issue>): Issue {
  return {
    id: "rule",
    category: "meta",
    severity: "low",
    label: "label",
    status: "pass",
    problem: "problem",
    fixSteps: ["fix"],
    googleSourceUrl: "https://developers.google.com/search",
    guideQuote: "quote",
    lastReviewedDate: "2026-07-13",
    ...overrides,
  };
}

describe("score", () => {
  it("scores an all-pass category at 100", () => {
    const issues = [
      makeIssue({ category: "meta", status: "pass" }),
      makeIssue({ category: "meta", status: "pass" }),
    ];

    expect(score(issues, ["meta"])).toEqual([{ category: "meta", score: 100 }]);
  });

  it("scores an all-fail category at 0", () => {
    const issues = [makeIssue({ category: "server", status: "fail" })];

    expect(score(issues, ["server"])).toEqual([
      { category: "server", score: 0 },
    ]);
  });

  it("weights warn at half a pass", () => {
    const issues = [
      makeIssue({ category: "structure", status: "pass" }),
      makeIssue({ category: "structure", status: "warn" }),
    ];

    expect(score(issues, ["structure"])).toEqual([
      { category: "structure", score: 75 },
    ]);
  });

  it("scores a category with no issues as 0, not a false 100", () => {
    expect(score([], ["meta"])).toEqual([{ category: "meta", score: 0 }]);
  });

  it("is deterministic across repeated calls", () => {
    const issues = [
      makeIssue({ category: "meta", status: "warn" }),
      makeIssue({ category: "meta", status: "fail" }),
    ];

    expect(score(issues, ["meta"])).toEqual(score(issues, ["meta"]));
  });

  it("scores each requested category independently", () => {
    const issues = [
      makeIssue({ category: "meta", status: "pass" }),
      makeIssue({ category: "server", status: "fail" }),
    ];

    expect(score(issues, ["meta", "server"])).toEqual([
      { category: "meta", score: 100 },
      { category: "server", score: 0 },
    ]);
  });
});
