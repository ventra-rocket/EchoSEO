/**
 * Rules knowledge-base types (Phase 2).
 *
 * A `Rule` is a static, versioned catalog entry: what to check, why it
 * matters, and a real Google source backing it. `evaluate()` (engine.ts)
 * runs a rule's `appliesWhen` against normalized signals to produce an
 * `Issue`. Kept independent of `services/seo-check/types.ts` — this is a
 * shared lib consumed by Lite (Phase 1), Deep (Phase 3), and GEO (Phase 4),
 * not the other way around.
 */
import type { PageAnalysis } from "@/server/lib/audit/types";

export const RULE_CATEGORIES = [
  "meta",
  "structure",
  "server",
  "core-web-vitals",
  "geo",
] as const;
export type RuleCategory = (typeof RULE_CATEGORIES)[number];

export const SEVERITIES = ["critical", "high", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const ISSUE_STATUSES = ["pass", "warn", "fail"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

/** Only Vietnamese needs a locale override — English is the rule's default. */
export type Locale = "en" | "vi";

export interface LocalizedFixText {
  /** Localized check name, e.g. "Có thẻ tiêu đề, 10–60 ký tự". */
  label: string;
  problem: string;
  fixSteps: string[];
}

/**
 * Static fields shared by every rule, independent of what input type it
 * evaluates — lets `getFix`/registries work across rule catalogs with
 * different `TInput` (on-page vs. Core Web Vitals) without an unsafe cast.
 */
export interface RuleMeta {
  id: string;
  category: RuleCategory;
  severity: Severity;
  /** What the check verifies, e.g. "Title tag present, 10-60 characters". */
  label: string;
  /** What's wrong when the check doesn't pass. */
  problem: string;
  fixSteps: string[];
  /** Real, verified Google Search Central (or web.dev) URL — never a guess. */
  googleSourceUrl: string;
  /** Verbatim excerpt from googleSourceUrl backing this rule. */
  guideQuote: string;
  /** ISO date (YYYY-MM-DD) this rule's source + quote were last confirmed accurate. */
  lastReviewedDate: string;
  /** Locale overrides for label/problem/fixSteps. English is the default;
   * `guideQuote` is never localized (it's a verbatim Google-doc quote). */
  locales?: Partial<Record<Exclude<Locale, "en">, LocalizedFixText>>;
}

/**
 * A versioned catalog entry. `appliesWhen` is pure and side-effect-free —
 * no network calls, no dates, no randomness — so `evaluate()` stays
 * deterministic and reproducible.
 */
export interface Rule<TInput> extends RuleMeta {
  appliesWhen: (input: TInput) => IssueStatus;
}

/**
 * Normalized on-page/technical input `Rule<OnPageSignals>` evaluates
 * against — structurally matches services/seo-check's `ParsedPage`
 * (`PageAnalysis` + mixed-content) without this lib depending on the
 * services layer.
 */
export interface OnPageSignals extends PageAnalysis {
  hasMixedContent: boolean;
}

/** The evaluated result of one rule against a page. */
export interface Issue extends Omit<RuleMeta, "locales"> {
  status: IssueStatus;
}

/**
 * Normalized GEO / AI-search signals a `Rule<GeoSignals>` evaluates against.
 *
 * Assembled by `services/seo-check/geo-signals.ts` from the page HTML plus two
 * side fetches (robots.txt, llms.txt). Everything here is a plain boolean/array
 * so the rules stay pure — the network work happens in the extractor, off the
 * report's critical path (decision C: GEO never blocks report delivery).
 */
export interface GeoSignals {
  /** Whether each agent is allowed to fetch the page per robots.txt. Googlebot
   * gates AI eligibility; Google-Extended/GPTBot are surfaced as policy facts,
   * never moralized — the operator decides. */
  botAccess: { googlebot: boolean; googleExtended: boolean; gptbot: boolean };
  /** Distinct JSON-LD `@type` values found on the page (e.g. Article, FAQPage). */
  schemaTypes: string[];
  /** The page states exactly one <h1>. */
  hasSingleH1: boolean;
  /** Heading levels descend without skipping (h1→h2→h3, no h1→h3 jump). */
  hasHeadingHierarchy: boolean;
  /** The page's `<meta name="robots">` content, for noindex/nosnippet checks. */
  robotsMeta: string | null;
  /** `/llms.txt` exists — surfaced, but labeled experimental (not a Google standard). */
  llmsTxtFound: boolean;
}
