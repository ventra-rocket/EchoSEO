/**
 * Resolves the remediation text and Google citation for any rule the audit can
 * materialize an occurrence for.
 *
 * Two rule families feed the audit and they live in different catalogs. The P02
 * knowledge base (`seo-rules`) owns the per-page rules and exposes `getFix`.
 * The cross-page rules (P09) need the whole crawl, so they live in
 * `lib/audit/rules/cross-page` and are deliberately NOT registered in the P02
 * catalog — the audit lib may depend on the shared knowledge base, but not the
 * other way round, and P02 is frozen. `getFix` therefore returns null for them,
 * which would leave the Links and Sitemaps groups with no fix steps at all.
 *
 * This module is the single seam the audit UI reads through, so a caller never
 * has to know which catalog a rule id came from.
 */
import { getFix, type Locale } from "@/server/lib/seo-rules";
import { CROSS_PAGE_RULES } from "@/server/lib/audit/rules/cross-page";

interface IssueFixText {
  label: string;
  problem: string;
  fixSteps: string[];
  googleSourceUrl: string;
  guideQuote: string;
  lastReviewedDate: string;
  /**
   * False when the requested locale had no translation and English was served
   * instead, so the UI can admit it rather than passing English off as the
   * reader's language. Every catalogue is fully translated today; the flag
   * stays because a newly added rule reaches this function before anyone
   * writes its override, and silently showing English would be the wrong
   * default.
   */
  localized: boolean;
}

const CROSS_PAGE_RULES_BY_ID = new Map(
  CROSS_PAGE_RULES.map((rule) => [rule.id, rule]),
);

/**
 * Remediation text for a rule id, or null when the id belongs to no catalog.
 * A null here means the materializer emitted a rule the UI cannot explain, so
 * callers must treat it as a defect rather than rendering an empty panel — a
 * test pins that every materializable rule id resolves.
 */
export function getIssueFixText(
  ruleId: string,
  locale: Locale = "en",
): IssueFixText | null {
  const fix = getFix(ruleId, locale);
  if (fix) {
    return { ...fix, localized: true };
  }

  const crossPageRule = CROSS_PAGE_RULES_BY_ID.get(ruleId);
  if (!crossPageRule) return null;

  const override =
    locale === "en" ? undefined : crossPageRule.locales?.[locale];

  return {
    label: override?.label ?? crossPageRule.label,
    problem: override?.problem ?? crossPageRule.problem,
    fixSteps: override?.fixSteps ?? crossPageRule.fixSteps,
    googleSourceUrl: crossPageRule.googleSourceUrl,
    guideQuote: crossPageRule.guideQuote,
    lastReviewedDate: crossPageRule.lastReviewedDate,
    localized: locale === "en" || override !== undefined,
  };
}
