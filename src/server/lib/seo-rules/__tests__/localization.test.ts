import { describe, expect, it } from "vitest";
import { ON_PAGE_RULES } from "../rules/on-page";
import { TECHNICAL_RULES } from "../rules/technical";
import { CORE_WEB_VITALS_RULES } from "../rules/core-web-vitals";
import { getFix, localizeRuleText } from "../index";
import type { RuleMeta } from "../types";

/**
 * Every rule the Lite or Deep report actually renders must carry a complete
 * Vietnamese override. A missing one silently falls back to English on the VN
 * pages — the exact bug this slice fixes — so pin it, and mutation-test it by
 * deleting one rule's `locales.vi`.
 */
const RENDERED_RULES: RuleMeta[] = [
  ...ON_PAGE_RULES,
  ...TECHNICAL_RULES,
  ...CORE_WEB_VITALS_RULES,
];

describe("Vietnamese rule overrides", () => {
  it.each(RENDERED_RULES.map((rule) => [rule.id, rule] as const))(
    "%s has a complete vi override with fixSteps parity",
    (_id, rule) => {
      const vi = rule.locales?.vi;
      expect(vi).toBeDefined();
      expect(vi?.label.trim().length ?? 0).toBeGreaterThan(0);
      expect(vi?.problem.trim().length ?? 0).toBeGreaterThan(0);
      // One translated step per English step, in the same order.
      expect(vi?.fixSteps.length).toBe(rule.fixSteps.length);
      expect(vi?.fixSteps.every((step) => step.trim().length > 0)).toBe(true);
      // Catch an accidental copy-paste of the English label.
      expect(vi?.label).not.toBe(rule.label);
    },
  );
});

describe("localizeRuleText", () => {
  const signal = {
    id: "meta-title",
    label: "x",
    problem: "y",
    fixSteps: ["z"],
    status: "warn",
  };

  it("is an identity no-op for English (keeps EN output byte-identical)", () => {
    expect(localizeRuleText(signal, "en")).toBe(signal);
  });

  it("overrides label/problem/fixSteps from the vi rule, preserving other fields", () => {
    const out = localizeRuleText(signal, "vi");
    const fix = getFix("meta-title", "vi");
    expect(out.label).toBe(fix?.label);
    expect(out.problem).toBe(fix?.problem);
    expect(out.fixSteps).toEqual(fix?.fixSteps);
    expect(out.status).toBe("warn");
    expect(out).not.toBe(signal);
  });

  it("returns the input unchanged for an unknown rule id", () => {
    const unknown = {
      id: "not-a-real-rule",
      label: "a",
      problem: "b",
      fixSteps: ["c"],
    };
    expect(localizeRuleText(unknown, "vi")).toBe(unknown);
  });
});
