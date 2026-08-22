// Domain Overview shell: search card, stat cards, loading/empty states, history section and the route heading above them.
export const domainOverview = {
  // Route heading (routes/_project/p/$projectId/domain.tsx renders
  // DomainOverviewPage.tsx, which owns the actual <h1>). It reuses
  // `nav.domainOverview` (same pattern as rank.page.subtitle reusing
  // nav.rankTracking), so only the sentence under it needs an id here.
  "domainOverview.page.subtitle":
    "Analyze any domain's SEO profile: traffic, keywords, and backlinks.",
  "domainOverview.recentSearches.button": "Recent searches",

  // Search card (DomainSearchCard.tsx)
  "domainOverview.search.domainPlaceholder": "Enter a domain",
  "domainOverview.search.sort.rank": "By Rank",
  "domainOverview.search.sort.traffic": "By Traffic",
  "domainOverview.search.sort.volume": "By Volume",
  "domainOverview.search.sort.score": "By Score",
  "domainOverview.search.sort.cpc": "By CPC",
  "domainOverview.search.submit": "Search",
  "domainOverview.search.submitting": "Loading…",
  // Shared with the history section's per-item subtitle below: same fact,
  // one id.
  "domainOverview.search.includeSubdomains": "Include subdomains",

  // Search form validation (domainSearchValidation.ts). Not a hardcoded-string
  // scanner finding — createFormValidationErrors isn't a tracked prose sink —
  // but it is real prose a user reaches by submitting an empty domain.
  "domainOverview.search.validation.domainRequired": "Please enter a domain",
  "domainOverview.search.validation.domainInvalid":
    "Please enter a valid URL or domain (e.g. example.com)",

  // Search flow fallbacks (DomainOverviewPage.tsx)
  "domainOverview.search.lookupFailed": "Lookup failed.",
  "domainOverview.search.notEnoughDataToast": "Not enough data for this domain",
  "domainOverview.search.tabLimitReached":
    "Close a tab to open more searches (max {max, number}).",

  // Stat cards (StatCard.tsx via DomainOverviewPage.tsx)
  "domainOverview.stats.organicTraffic": "Estimated Organic Traffic",
  "domainOverview.stats.organicKeywords": "Organic Keywords",
  // formatMetric's no-data fallback (utils.ts)
  "domainOverview.stats.noData": "Not enough data",

  // Result state below the stat cards (DomainOverviewPage.tsx)
  "domainOverview.result.notEnoughData":
    "Not enough data for this domain yet. Try another domain or include subdomains.",

  // Table tab switcher (DomainOverviewPage.tsx)
  "domainOverview.tabs.keywords": "Top Keywords",
  "domainOverview.tabs.pages": "Top Pages",

  // History section (DomainHistorySection.tsx). The no-key state renders the
  // shared `seoProvider.keyMissing.*` gate instead of a local copy.
  "domainOverview.history.emptyPrompt": "Enter a domain to get started",
  "domainOverview.history.recentCount":
    "{count, plural, one {# recent search} other {# recent searches}}",
  "domainOverview.history.rootDomainOnly": "Root domain only",
  "domainOverview.history.removeAriaLabel": "Remove recent search for {domain}",
} as const;
