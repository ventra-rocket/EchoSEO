import { describe, expect, it } from "vitest";
import { evaluateLiteSignals, getFix, LITE_RULES, score } from "../index";
import { makeGoodPage } from "./on-page-signals-fixture";

const LITE_CATEGORIES = ["meta", "structure", "server"] as const;

describe("evaluateLiteSignals", () => {
  it("runs the combined on-page + technical catalog", () => {
    const issues = evaluateLiteSignals(makeGoodPage());
    expect(issues).toHaveLength(LITE_RULES.length);
    expect(issues.every((issue) => issue.status === "pass")).toBe(true);
  });

  it("feeds straight into score()", () => {
    const issues = evaluateLiteSignals(makeGoodPage());
    const scores = score(issues, LITE_CATEGORIES);
    for (const entry of scores) {
      expect(entry.score).toBe(100);
    }
  });

  it("does not flag missing structured data without page-type eligibility", () => {
    expect(
      LITE_RULES.some((rule) => rule.id === "structure-structured-data"),
    ).toBe(false);
  });
});

describe("getFix", () => {
  it("returns English fix text for a known rule", () => {
    const fix = getFix("meta-title");
    expect(fix).not.toBeNull();
    expect(fix?.googleSourceUrl).toContain("developers.google.com");
    expect(fix?.fixSteps.length).toBeGreaterThan(0);
  });

  it("falls back to English when no Vietnamese override exists yet", () => {
    const en = getFix("meta-title", "en");
    const vi = getFix("meta-title", "vi");
    expect(vi).toEqual(en);
  });

  it("keeps structured-data guidance available without making it a Lite check", () => {
    expect(getFix("structure-structured-data")).not.toBeNull();
  });

  it("returns null for an unknown rule id", () => {
    expect(getFix("not-a-real-rule")).toBeNull();
  });
});
