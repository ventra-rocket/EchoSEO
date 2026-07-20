/**
 * The audit UI explains every finding it shows. That only holds if each rule
 * the materializer can emit resolves to remediation text and a citation — and
 * the two rule families live in different catalogs, so this is exactly the seam
 * where a rule can go missing without anything else failing.
 */
import { describe, expect, it } from "vitest";
import { getIssueFixText } from "./issue-fix-text";
import { CROSS_PAGE_RULES } from "@/server/lib/audit/rules/cross-page";
import { LITE_RULES } from "@/server/lib/seo-rules";
import { CORE_WEB_VITALS_RULES } from "@/server/lib/seo-rules/rules/core-web-vitals";

const MATERIALIZABLE_RULE_IDS = [
  ...LITE_RULES.map((rule) => rule.id),
  ...CORE_WEB_VITALS_RULES.map((rule) => rule.id),
  ...CROSS_PAGE_RULES.map((rule) => rule.id),
];

describe("getIssueFixText", () => {
  it("resolves every rule the materializer can emit", () => {
    const unresolved = MATERIALIZABLE_RULE_IDS.filter(
      (ruleId) => getIssueFixText(ruleId) === null,
    );

    expect(unresolved).toEqual([]);
  });

  it("gives every rule a citation the reader can check", () => {
    for (const ruleId of MATERIALIZABLE_RULE_IDS) {
      const fix = getIssueFixText(ruleId);
      expect(fix).not.toBeNull();
      expect(fix?.googleSourceUrl).toMatch(/^https:\/\//);
      expect(fix?.guideQuote.length).toBeGreaterThan(0);
      expect(fix?.lastReviewedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fix?.fixSteps.length).toBeGreaterThan(0);
    }
  });

  it("resolves cross-page rules, which the P02 catalog does not know about", () => {
    // Regression: these live outside `seo-rules`, so `getFix` alone returns
    // null for them and the Links/Sitemaps groups would render with no advice.
    for (const rule of CROSS_PAGE_RULES) {
      expect(getIssueFixText(rule.id)?.label).toBe(rule.label);
    }
  });

  it("returns null for a rule id from no catalog", () => {
    expect(getIssueFixText("not-a-rule")).toBeNull();
  });

  it("reports untranslated text as untranslated", () => {
    // The cross-page rules carry no locale overrides yet. A Vietnamese reader
    // gets English, and the flag is what lets the UI admit that instead of
    // presenting English as a translation.
    const fix = getIssueFixText("audit-orphan-page", "vi");

    expect(fix).not.toBeNull();
    expect(fix?.localized).toBe(false);
  });

  it("leaves English text identical to the catalog", () => {
    for (const rule of CROSS_PAGE_RULES) {
      const fix = getIssueFixText(rule.id, "en");
      expect(fix?.label).toBe(rule.label);
      expect(fix?.problem).toBe(rule.problem);
      expect(fix?.fixSteps).toEqual(rule.fixSteps);
      expect(fix?.localized).toBe(true);
    }
  });

  it("never localizes the quote or its source", () => {
    for (const rule of CROSS_PAGE_RULES) {
      const vietnamese = getIssueFixText(rule.id, "vi");
      expect(vietnamese?.guideQuote).toBe(rule.guideQuote);
      expect(vietnamese?.googleSourceUrl).toBe(rule.googleSourceUrl);
    }
  });
});
