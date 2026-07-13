import { describe, expect, it } from "vitest";
import { ON_PAGE_RULES, STRUCTURED_DATA_GUIDANCE } from "../rules/on-page";
import { TECHNICAL_RULES } from "../rules/technical";
import { CORE_WEB_VITALS_RULES } from "../rules/core-web-vitals";
import type { RuleMeta } from "../types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const ALL_RULES: RuleMeta[] = [
  ...ON_PAGE_RULES,
  STRUCTURED_DATA_GUIDANCE,
  ...TECHNICAL_RULES,
  ...CORE_WEB_VITALS_RULES,
];

describe("rule catalog invariants", () => {
  it("has at least one rule per catalog", () => {
    expect(ON_PAGE_RULES.length).toBeGreaterThan(0);
    expect(TECHNICAL_RULES.length).toBeGreaterThan(0);
    expect(CORE_WEB_VITALS_RULES.length).toBeGreaterThan(0);
  });

  it("has unique ids across the whole catalog", () => {
    const ids = ALL_RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(ALL_RULES.map((rule) => [rule.id, rule] as const))(
    "%s has a real Google source URL and a reviewed date",
    (_id, rule) => {
      expect(rule.googleSourceUrl).toBeTruthy();
      expect(() => new URL(rule.googleSourceUrl)).not.toThrow();
      expect(
        rule.googleSourceUrl.startsWith("https://developers.google.com/") ||
          rule.googleSourceUrl.startsWith("https://web.dev/"),
      ).toBe(true);

      expect(rule.guideQuote.trim().length).toBeGreaterThan(0);

      expect(rule.lastReviewedDate).toMatch(ISO_DATE);
      expect(Number.isNaN(Date.parse(rule.lastReviewedDate))).toBe(false);

      expect(rule.problem.trim().length).toBeGreaterThan(0);
      expect(rule.fixSteps.length).toBeGreaterThan(0);
      for (const step of rule.fixSteps) {
        expect(step.trim().length).toBeGreaterThan(0);
      }
    },
  );
});
