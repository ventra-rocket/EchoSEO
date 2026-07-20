import { describe, expect, it } from "vitest";
import { GEO_RULES } from "../rules/geo";
import type { GeoSignals } from "../types";

function makeGoodGeo(overrides: Partial<GeoSignals> = {}): GeoSignals {
  return {
    botAccess: { googlebot: true, googleExtended: true, gptbot: true },
    schemaTypes: ["Article"],
    hasSingleH1: true,
    hasHeadingHierarchy: true,
    robotsMeta: null,
    llmsTxtFound: true,
    ...overrides,
  };
}

function ruleById(id: string) {
  const rule = GEO_RULES.find((entry) => entry.id === id);
  if (!rule) throw new Error(`missing rule ${id}`);
  return rule;
}

describe("GEO_RULES", () => {
  it("passes every rule against a fully AI-ready page", () => {
    const geo = makeGoodGeo();
    for (const rule of GEO_RULES) {
      expect(rule.appliesWhen(geo)).toBe("pass");
    }
  });

  // The integrity contract: every GEO rule cites the Google AI guide (or an
  // equally real Google source) with a verbatim quote — never a guess.
  it("every rule cites a Google source with a non-empty verbatim quote", () => {
    for (const rule of GEO_RULES) {
      expect(rule.googleSourceUrl).toMatch(
        /^https:\/\/developers\.google\.com/,
      );
      expect(rule.guideQuote.length).toBeGreaterThan(0);
      expect(rule.category).toBe("geo");
    }
  });

  describe("geo-crawlable", () => {
    const rule = ruleById("geo-crawlable");
    it("fails when robots.txt blocks Googlebot", () => {
      expect(
        rule.appliesWhen(
          makeGoodGeo({
            botAccess: { googlebot: false, googleExtended: true, gptbot: true },
          }),
        ),
      ).toBe("fail");
    });
  });

  describe("geo-indexable", () => {
    const rule = ruleById("geo-indexable");
    it("fails on a noindex robots meta", () => {
      expect(
        rule.appliesWhen(makeGoodGeo({ robotsMeta: "noindex, follow" })),
      ).toBe("fail");
    });
  });

  describe("geo-snippet-eligible", () => {
    const rule = ruleById("geo-snippet-eligible");
    it("warns on nosnippet", () => {
      expect(rule.appliesWhen(makeGoodGeo({ robotsMeta: "nosnippet" }))).toBe(
        "warn",
      );
    });
    it("warns on max-snippet:0", () => {
      expect(
        rule.appliesWhen(makeGoodGeo({ robotsMeta: "max-snippet:0" })),
      ).toBe("warn");
    });
  });

  describe("geo-answerability", () => {
    const rule = ruleById("geo-answerability");
    it("warns without a single h1", () => {
      expect(rule.appliesWhen(makeGoodGeo({ hasSingleH1: false }))).toBe(
        "warn",
      );
    });
    it("warns on a skipped heading hierarchy", () => {
      expect(
        rule.appliesWhen(makeGoodGeo({ hasHeadingHierarchy: false })),
      ).toBe("warn");
    });
  });

  describe("geo-structured-data", () => {
    const rule = ruleById("geo-structured-data");
    // Never a fail — Google says schema isn't required for AI features.
    it("only warns (low) when no schema is present", () => {
      expect(rule.appliesWhen(makeGoodGeo({ schemaTypes: [] }))).toBe("warn");
      expect(rule.severity).toBe("low");
    });
  });
});
