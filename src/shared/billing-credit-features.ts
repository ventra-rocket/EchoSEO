export type CreditFeature =
  | "keyword_research"
  | "domain_overview"
  | "backlinks"
  | "site_audit"
  | "rank_tracking"
  | "ai_citations"
  | "ai_prompt_responses"
  | "local_seo"
  | "onboarding"
  | "issue_explainer";

// The English display labels that used to live here moved into the message
// catalogs as `billingPlans.creditFeature.*`: a shared module cannot know the
// reader's locale, and a Record<string, string> of prose is invisible to the
// hardcoded-string gate. This file keeps only the machine-facing mapping; the
// catalog owns one id per key below, and `CreditFeature` is what ties them.

/**
 * Maps a DataForSEO API response path (e.g. ["v3", "dataforseo_labs", "google", "related_keywords", "live"])
 * to a product feature for analytics. path[1] is the API module; for dataforseo_labs,
 * path[3] distinguishes keyword vs domain endpoints.
 */
export function mapDataforseoPathToCreditFeature(
  path: readonly string[],
): CreditFeature {
  const normalizedPath = path[0] === "v3" ? path : ["v3", ...path];
  const module = normalizedPath[1];

  switch (module) {
    case "on_page":
      return "site_audit";
    case "backlinks":
      return "backlinks";
    case "serp":
      return normalizedPath[2] === "google" &&
        ["maps", "local_finder"].includes(normalizedPath[3])
        ? "local_seo"
        : "keyword_research";
    case "ai_optimization":
      // llm_mentions/* are brand-citation lookups; every other ai_optimization
      // endpoint is a provider /llm_responses prompt response (chat_gpt, claude,
      // gemini, perplexity).
      return normalizedPath[2] === "llm_mentions"
        ? "ai_citations"
        : "ai_prompt_responses";
    case "business_data":
      return "local_seo";
    case "keywords_data":
      return "keyword_research";
    case "dataforseo_labs": {
      const endpoint = normalizedPath[3] ?? "";
      if (
        endpoint.startsWith("domain_") ||
        endpoint === "ranked_keywords" ||
        endpoint === "relevant_pages"
      ) {
        return "domain_overview";
      }
      return "keyword_research";
    }
    default:
      return "site_audit";
  }
}
