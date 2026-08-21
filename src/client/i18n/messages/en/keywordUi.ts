// Shared keyword display primitives: intent badges, SERP analysis card, metric labels.
// One id per literal string avoids five copies of one sentence drifting
// apart; a shared action belongs in `common` instead.
export const keywordUi = {
  // Intent badge (IntentBadge.tsx) — compact pill text, the tooltip heading,
  // and the sentence explaining what the intent means and how to act on it.
  "keywordUi.intent.informational.short": "Info",
  "keywordUi.intent.informational.label": "Informational",
  "keywordUi.intent.informational.description":
    "The searcher wants information or answers. Use this for educational content, guides, and comparison-light explainers.",
  "keywordUi.intent.commercial.short": "Comm",
  "keywordUi.intent.commercial.label": "Commercial",
  "keywordUi.intent.commercial.description":
    "The searcher is researching options before a purchase. Treat this as buying intent for comparisons, alternatives, and product-led pages.",
  "keywordUi.intent.transactional.short": "Trans",
  "keywordUi.intent.transactional.label": "Transactional",
  "keywordUi.intent.transactional.description":
    "The searcher is ready to complete an action, often a purchase. Prioritize clear offers, pricing, trials, or conversion paths.",
  "keywordUi.intent.navigational.short": "Nav",
  "keywordUi.intent.navigational.label": "Navigational",
  "keywordUi.intent.navigational.description":
    "The searcher is looking for a specific site, brand, or page. These queries usually reward matching the expected destination.",
  "keywordUi.intent.unknown.short": "?",
  "keywordUi.intent.unknown.label": "Unknown",
  "keywordUi.intent.unknown.description":
    "Intent was not available for this keyword, so avoid making content strategy decisions from this badge alone.",
  "keywordUi.intent.ariaLabel": "{label} search intent",

  // Search-volume trend chart (DisplayPrimitives.tsx AreaTrendChart)
  "keywordUi.trendChart.ariaLabel": "Search trend chart",
  "keywordUi.trendChart.seriesName": "Search volume",

  // Keyword overview stat bar (KeywordUi.tsx OverviewStats) — compact labels
  // beside the volume/CPC/competition numbers.
  "keywordUi.overview.volume": "Vol",
  "keywordUi.overview.cpc": "CPC",
  "keywordUi.overview.competition": "Comp",

  // SERP analysis card (SerpAnalysisCard.tsx). The "no key" state renders
  // <DataforseoKeyMissingState /> from access-gate instead of these ids, and
  // the retry action + "Page X of Y" label reuse common.action.retry /
  // common.table.pageOf rather than duplicating them here.
  "keywordUi.serp.resultCount":
    "{count, plural, one {# organic result} other {# organic results}}",
  "keywordUi.serp.table.pageColumn": "Page",
  "keywordUi.serp.pagination.prev": "Prev",
  "keywordUi.serp.pagination.next": "Next",
  "keywordUi.serp.empty.title":
    "No SERP details available for this keyword yet.",
  "keywordUi.serp.empty.hint": "Try clicking another keyword to load data.",

  // Keyword research data hook (useKeywordResearchData.ts) — generic fallback
  // for a research request that failed without a recognized error code.
  "keywordUi.research.errorDefault": "Research failed.",

  // SERP analysis hook (useKeywordSerpAnalysis.ts) — same fallback role as above.
  "keywordUi.serp.errorDefault": "Failed to load SERP data.",

  // Keyword search form validation (useKeywordControlsForm.ts)
  "keywordUi.controlsForm.keywordRequired":
    "Please enter at least one keyword.",
  "keywordUi.controlsForm.tooManyKeywords":
    "Please enter no more than {max, number} keywords (one per line).",
  "keywordUi.controlsForm.tabsSkipped":
    "{skipped, plural, one {# keyword} other {# keywords}} skipped — close a tab to open more (max {max, number}).",

  // Save/export actions (keywordControllerActions.ts). CSV/Sheets headers stay
  // English on purpose — see KEYWORD_RESEARCH_HEADERS in that file.
  "keywordUi.saveExport.noSelectionToast": "Select at least one keyword first",
  "keywordUi.saveExport.savedToast":
    "{count, plural, one {Saved # keyword} other {Saved # keywords}}",
  "keywordUi.saveExport.saveErrorDefault": "Save failed.",
  "keywordUi.saveExport.noDataToExport": "No data to export",
} as const;
