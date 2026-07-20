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
import { GEO_RULES } from "./rules/geo";
import type {
  GeoSignals,
  Locale,
  OnPageSignals,
  Rule,
  RuleMeta,
} from "./types";

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

/**
 * Runs the GEO / AI-search rule set against extracted signals. Deep-tier only,
 * scored separately from the on-page number and shown as directional.
 */
export function evaluateGeoSignals(signals: GeoSignals) {
  return evaluate(GEO_RULES, signals);
}

const ALL_RULE_META: RuleMeta[] = [
  ...ON_PAGE_RULES,
  STRUCTURED_DATA_GUIDANCE,
  ...TECHNICAL_RULES,
  ...CORE_WEB_VITALS_RULES,
  ...GEO_RULES,
];
const RULE_META_BY_ID = new Map<string, RuleMeta>(
  ALL_RULE_META.map((rule) => [rule.id, rule]),
);

interface FixText {
  label: string;
  problem: string;
  fixSteps: string[];
  googleSourceUrl: string;
  guideQuote: string;
  lastReviewedDate: string;
}

/**
 * Localized presentational text for a rule (label + problem + fixSteps). Falls
 * back to the rule's English default when no override exists for `locale`.
 * `guideQuote`/`googleSourceUrl` are never localized — the quote is verbatim
 * from Google's own documentation.
 */
export function getFix(ruleId: string, locale: Locale = "en"): FixText | null {
  const rule = RULE_META_BY_ID.get(ruleId);
  if (!rule) return null;

  const override = locale === "en" ? undefined : rule.locales?.[locale];
  return {
    label: override?.label ?? rule.label,
    problem: override?.problem ?? rule.problem,
    fixSteps: override?.fixSteps ?? rule.fixSteps,
    googleSourceUrl: rule.googleSourceUrl,
    guideQuote: rule.guideQuote,
    lastReviewedDate: rule.lastReviewedDate,
  };
}

/**
 * Overlay a rule's localized `label`/`problem`/`fixSteps` onto an already-
 * evaluated signal, keyed by its rule id. This is the read-time localization
 * boundary: reports are stored/cached in canonical English and translated here
 * on the way to the viewer, so a cached or cross-locale-deduped report still
 * renders in the requester's language. English is a no-op (returns the input
 * untouched), keeping the EN output byte-identical. Non-presentational fields
 * (status, category, guideQuote, …) are preserved.
 */
export function localizeRuleText<
  T extends { id: string; label: string; problem: string; fixSteps: string[] },
>(signal: T, locale: Locale): T {
  if (locale === "en") return signal;
  const fix = getFix(signal.id, locale);
  if (!fix) return signal;
  return {
    ...signal,
    label: fix.label,
    problem: fix.problem,
    fixSteps: fix.fixSteps,
  };
}
