// Keyword Research page: search bar, filters, results tables, pagination, empty and loading states.
// One id per literal string avoids five copies of one sentence drifting
// apart; a shared action belongs in `common` instead.
export const keywordResearch = {
  // Page shell (KeywordResearchPage.tsx)
  "keywordResearch.page.title": "Keyword Research",
  "keywordResearch.page.subtitle":
    "Discover keyword ideas, search demand, and ranking opportunities.",
  "keywordResearch.page.recentSearches": "Recent searches",
  "keywordResearch.page.error.goToBilling": "Go to Billing",
  "keywordResearch.page.saveDialog.title":
    "Save {count, plural, one {# Keyword} other {# Keywords}}",
  "keywordResearch.page.saveDialog.body":
    "These keywords will be saved to your current project.",
  "keywordResearch.page.saveDialog.cancel": "Cancel",
  "keywordResearch.page.saveDialog.confirm": "Save",

  // Search bar (KeywordResearchSearchBar.tsx)
  "keywordResearch.searchBar.keywordPlaceholder":
    "Enter keywords, one per line",
  "keywordResearch.searchBar.resultLimitOption":
    "{count, plural, one {# result} other {# results}}",
  "keywordResearch.searchBar.submit": "Search",
  "keywordResearch.searchBar.clickstreamLabel": "Clickstream-refined volumes",
  "keywordResearch.searchBar.clickstreamTooltip":
    "Google reports one combined search volume for similar keywords (e.g. 'seo tool' and 'seo tools'). Turn this on to estimate each keyword's own volume. Costs 2x the credits.",
  "keywordResearch.searchBar.googleAdsNotice":
    "Keyword data for this country comes from Google Ads — search volume, CPC, and trends are available, but difficulty and intent are not.",

  // Search mode (KeywordResearchSearchBar.tsx select) — the same source labels
  // back KeywordResearchDesktopResults' "Source: {source} fallback." note, since
  // both read the same KeywordSource/ResearchSource union.
  "keywordResearch.mode.auto": "Auto",
  "keywordResearch.mode.related": "Related keywords",
  "keywordResearch.mode.suggestions": "Suggestions",
  "keywordResearch.mode.ideas": "Ideas",
  "keywordResearch.mode.googleAds": "Google Ads",

  // Filter primitives shared by the desktop filter panel and the results table's
  // empty-after-filtering state (keywordResearchDesktopFilters.tsx).
  "keywordResearch.filters.min": "Min",
  "keywordResearch.filters.max": "Max",
  "keywordResearch.filters.emptyResults":
    "No keywords match your current filters.",
  "keywordResearch.filters.clearFilters": "Clear filters",

  // Results table columns (KeywordResearchDesktopTable.tsx) — shared by the
  // desktop and mobile presentations, which render the same table component.
  "keywordResearch.table.column.keyword": "Keyword",
  "keywordResearch.table.column.volume": "Volume",
  "keywordResearch.table.column.cpc": "CPC",
  "keywordResearch.table.column.cpcHelp": "Cost per click in USD.",
  "keywordResearch.table.column.competition": "Comp.",
  "keywordResearch.table.column.competitionHelp":
    "Paid-search competition from Google Ads (0-1): higher means more advertisers bidding.",
  "keywordResearch.table.column.difficulty": "Score",
  "keywordResearch.table.column.difficultyHelp":
    "Organic ranking difficulty (0-100): higher means harder to reach Google's top 10.",
  "keywordResearch.table.column.intent": "Intent",

  // Results — identical text in both the desktop and mobile presentations
  // (KeywordResearchDesktopResults.tsx / KeywordResearchMobileResults.tsx).
  "keywordResearch.results.serpHeading": "SERP Analysis",
  "keywordResearch.results.refineResults": "Refine table results",
  "keywordResearch.results.exportCsv": "Export CSV",
  "keywordResearch.results.filtersButton": "Filters",

  // Desktop results (KeywordResearchDesktopResults.tsx)
  "keywordResearch.desktopResults.trendHeading": "Search Trends",
  "keywordResearch.desktopResults.trendRangeDefault":
    "Last 12 available months",
  "keywordResearch.desktopResults.trendRange": "{start} - {end}",
  "keywordResearch.desktopResults.approximateMatch":
    'No exact match for "<b>{keyword}</b>". Showing closest related keywords instead.',
  // Leading space: appended directly after `approximateMatch` with no
  // separator in between, same convention as rank.table.searchActuals'
  // truncated-window suffix.
  "keywordResearch.desktopResults.approximateMatchSource":
    " Source: {source} fallback.",
  "keywordResearch.desktopResults.toggleFiltersTitle": "Toggle table filters",
  "keywordResearch.desktopResults.selectedOfTotal":
    "{selected, number} of {total, number} selected",
  "keywordResearch.desktopResults.filteredOfTotal":
    "Showing {filtered, number} of {total, plural, one {# keyword} other {# keywords}}",
  "keywordResearch.desktopResults.filteredCount":
    "Showing {count, plural, one {# keyword} other {# keywords}}",
  "keywordResearch.desktopResults.saveKeywords": "Save Keywords",
  "keywordResearch.desktopResults.filters.activeCount":
    "{count, number} active",
  "keywordResearch.desktopResults.filters.clearAll": "Clear all",
  "keywordResearch.desktopResults.filters.includeLabel": "Include Terms",
  "keywordResearch.desktopResults.filters.includePlaceholder":
    "audit, checker, template",
  "keywordResearch.desktopResults.filters.excludeLabel": "Exclude Terms",
  "keywordResearch.desktopResults.filters.excludePlaceholder":
    "jobs, salary, course",
  "keywordResearch.desktopResults.filters.searchVolume": "Search Volume",
  "keywordResearch.desktopResults.filters.cpcUsd": "CPC (USD)",
  "keywordResearch.desktopResults.filters.difficulty": "Difficulty",

  // Mobile results (KeywordResearchMobileResults.tsx)
  "keywordResearch.mobileResults.tabKeywords": "Keywords ({count, number})",
  "keywordResearch.mobileResults.approximateMatch":
    'No exact match for "<b>{keyword}</b>". Showing closest related keywords.',
  "keywordResearch.mobileResults.saveButton": "Save",
  "keywordResearch.mobileResults.selectedCount": "{count, number} selected",
  "keywordResearch.mobileResults.filteredOfTotal":
    "Showing {filtered, number} of {total, number}",
  "keywordResearch.mobileResults.filteredCount":
    "Showing {count, plural, one {# keyword} other {# keywords}}",
  "keywordResearch.mobileResults.clear": "Clear",
  "keywordResearch.mobileResults.includePlaceholder":
    "Include terms (audit, checker)",
  "keywordResearch.mobileResults.excludePlaceholder":
    "Exclude terms (jobs, course)",
  "keywordResearch.mobileResults.minVolume": "Min volume",
  "keywordResearch.mobileResults.maxVolume": "Max volume",
  "keywordResearch.mobileResults.minCpc": "Min CPC",
  "keywordResearch.mobileResults.maxCpc": "Max CPC",
  "keywordResearch.mobileResults.minDifficulty": "Min difficulty",
  "keywordResearch.mobileResults.maxDifficulty": "Max difficulty",

  // Empty state (KeywordResearchEmptyState.tsx)
  "keywordResearch.emptyState.noResults.heading":
    "Not enough keyword data for this query yet",
  "keywordResearch.emptyState.noResults.body":
    'We could not find keyword opportunities for "<b>{keyword}</b>" in <b>{location}</b>.',
  "keywordResearch.emptyState.noResults.unknownLocation": "this location",
  "keywordResearch.emptyState.history.recentSearches":
    "{count, plural, one {# recent search} other {# recent searches}}",
  "keywordResearch.emptyState.history.removeSearch":
    "Remove recent search for {keyword}",
  "keywordResearch.emptyState.history.getStarted":
    "Enter a keyword to get started",
  "keywordResearch.emptyState.history.getStartedBody":
    "Search for any keyword to see volume, difficulty, CPC, and related keyword ideas.",
} as const;
