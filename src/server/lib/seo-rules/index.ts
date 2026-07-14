/**
 * Public API for the SEO rules knowledge-base.
 */
import { evaluate } from "./engine";
import { ON_PAGE_RULES, STRUCTURED_DATA_GUIDANCE } from "./rules/on-page";
import { TECHNICAL_RULES } from "./rules/technical";
import {
  CORE_WEB_VITALS_RULES,
  type CoreWebVitalsSignals,
} from "./rules/core-web-vitals";
import type { Locale, OnPageSignals, Rule, RuleMeta } from "./types";

export { score } from "./scoring";
export * from "./types";

/** All rules Lite evaluates today — on-page + technical, over `OnPageSignals`. */
export const LITE_RULES: Array<Rule<OnPageSignals>> = [
  ...ON_PAGE_RULES,
  ...TECHNICAL_RULES,
];

/** Runs the Lite rule set (on-page + technical) against a page's signals. */
export function evaluateLiteSignals(page: OnPageSignals) {
  return evaluate(LITE_RULES, page);
}

/**
 * Runs the Core Web Vitals rule set against real metrics. Only the Deep tier
 * has CWV data (from the PageSpeed Insights API); Lite never calls this.
 */
export function evaluateCoreWebVitals(signals: CoreWebVitalsSignals) {
  return evaluate(CORE_WEB_VITALS_RULES, signals);
}

const ALL_RULE_META: RuleMeta[] = [
  ...ON_PAGE_RULES,
  STRUCTURED_DATA_GUIDANCE,
  ...TECHNICAL_RULES,
  ...CORE_WEB_VITALS_RULES,
];
const RULE_META_BY_ID = new Map<string, RuleMeta>(
  ALL_RULE_META.map((rule) => [rule.id, rule]),
);

interface FixText {
  problem: string;
  fixSteps: string[];
  googleSourceUrl: string;
  guideQuote: string;
  lastReviewedDate: string;
}

/**
 * Localized fix text for a rule. Falls back to the rule's English default
 * when no override exists for `locale` — every non-English locale is a stub
 * until Phase 6 populates real translations.
 */
export function getFix(ruleId: string, locale: Locale = "en"): FixText | null {
  const rule = RULE_META_BY_ID.get(ruleId);
  if (!rule) return null;

  const override = locale === "en" ? undefined : rule.locales?.[locale];
  return {
    problem: override?.problem ?? rule.problem,
    fixSteps: override?.fixSteps ?? rule.fixSteps,
    googleSourceUrl: rule.googleSourceUrl,
    guideQuote: rule.guideQuote,
    lastReviewedDate: rule.lastReviewedDate,
  };
}
