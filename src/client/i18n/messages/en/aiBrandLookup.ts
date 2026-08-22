// Brand Lookup shell: search card, results header, share-of-voice, mention trend and search history.
export const aiBrandLookup = {
  "aiBrandLookup.page.subtitle":
    "See how AI search cites any brand name or domain.",

  "aiBrandLookup.gate.description":
    "See how ChatGPT and Google AI Overview cite any brand or domain — total mentions, sample prompts where it appears, and the pages cited alongside it.",
  "aiBrandLookup.gate.bullet.visibility.title": "Track AI visibility",
  "aiBrandLookup.gate.bullet.visibility.body":
    "See estimated counts for ChatGPT and Google AI Overview answers that cite your brand, and watch the trend month over month.",
  "aiBrandLookup.gate.bullet.prompts.title": "See the prompts",
  "aiBrandLookup.gate.bullet.prompts.body":
    "View sample user questions where LLMs reference your brand or domain.",
  "aiBrandLookup.gate.bullet.competitors.title": "Map the competition",
  "aiBrandLookup.gate.bullet.competitors.body":
    "Spot the pages LLMs cite alongside you so you know who's competing for attention in AI answers.",

  "aiBrandLookup.search.queryPlaceholder": "Enter a brand name or domain",
  "aiBrandLookup.search.competitorsPlaceholder":
    "Add competitors (comma-separated)",
  "aiBrandLookup.search.competitorsAriaLabel": "Competitors",
  "aiBrandLookup.search.competitorsHelp":
    "Add up to 5 competitor brands or domains to see your Share of Voice.",
  "aiBrandLookup.search.submit": "Look up",
  "aiBrandLookup.search.submitLoading": "Looking up…",
  "aiBrandLookup.search.costEstimate": "Est. {amount}",
  "aiBrandLookup.search.costEstimateCompetitors":
    "plus ~{amount} to compare competitors",
  "aiBrandLookup.search.error.queryRequired": "Enter a brand name or domain",
  "aiBrandLookup.search.error.queryTooLong":
    "Keep it under {max, number} characters",
  "aiBrandLookup.search.error.competitorTooLong":
    "Keep each competitor under {max, number} characters",
  "aiBrandLookup.search.error.competitorMatchesTarget":
    "“{competitor}” matches the brand you're looking up — remove it from competitors",

  "aiBrandLookup.results.lookupError":
    "We couldn't complete this lookup. Please try again.",
  "aiBrandLookup.results.recentSearches": "Recent searches",
  "aiBrandLookup.results.allPlatformsUnavailable":
    "AI mention data is temporarily unavailable for {target}. Please try again shortly.",
  "aiBrandLookup.results.noMentionsFound": "No AI mentions found for {target}.",
  "aiBrandLookup.results.platformsUnavailableNote":
    "Note: {platforms} {count, plural, one {was} other {were}} unavailable — some mentions may be missing.",
  "aiBrandLookup.results.targetType.domain": "Domain",
  "aiBrandLookup.results.targetType.keyword": "Keyword",
  "aiBrandLookup.results.updated": "Updated {relative}",
  "aiBrandLookup.results.updatedFallback": "recently",
  "aiBrandLookup.results.stat.mentions.label": "Mentions",
  "aiBrandLookup.results.stat.mentions.tooltip":
    "Estimated count of AI answers where the searched brand or domain appeared in the answer text or cited sources.",
  "aiBrandLookup.results.stat.aiSearchVolume.label": "AI search volume",
  "aiBrandLookup.results.stat.aiSearchVolume.tooltip":
    "Estimated monthly search demand for prompts where the searched brand or domain appears in AI answers. This is prompt demand, not mention count.",
  "aiBrandLookup.results.chatGptCountryTooltip":
    "DataForSEO indexes ChatGPT mentions for US English only — country selection is not available for this platform.",
  "aiBrandLookup.results.platformUnavailable": "unavailable",
  "aiBrandLookup.results.mentionTrend.title": "Mention trend (last 12 months)",

  "aiBrandLookup.shareOfVoice.title": "Share of Voice",
  "aiBrandLookup.shareOfVoice.noComparableData": "· no comparable data",
  "aiBrandLookup.shareOfVoice.targetShare": "· {percent}",
  "aiBrandLookup.shareOfVoice.footer":
    "Mentions share across {platforms} · bars relative to the leader.",
  "aiBrandLookup.shareOfVoice.youBadge": "You",

  "aiBrandLookup.mentionTrend.empty": "Not enough historical data yet.",
  "aiBrandLookup.mentionTrend.tooltip":
    "{count, plural, one {# mention} other {# mentions}}",

  "aiBrandLookup.history.emptyMessage":
    "Search a brand name or domain to see how AI cites it",
  "aiBrandLookup.history.competitorsPrefix": "vs {competitors}",
  // Bare singular noun, interpolated by the shared SearchHistorySection
  // component into its own "{count} recent {noun}(s)" template.
  "aiBrandLookup.history.noun": "lookup",
} as const;
