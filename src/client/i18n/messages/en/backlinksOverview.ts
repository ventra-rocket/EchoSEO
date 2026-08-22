// Backlinks shell: search card, overview panels, charts, provider/empty/error states, history section and the route heading.
export const backlinksOverview = {
  // Route heading (BacklinksPage.tsx). The H1 itself reuses nav.backlinks
  // rather than a second copy of the same word — see rank-tracking.tsx for
  // the same convention.
  "backlinksOverview.route.subtitle":
    "Understand who links to a site, what changed recently, and which pages attract links.",

  // Search card (BacklinksSearchCard.tsx)
  "backlinksOverview.search.placeholder": "Enter a domain or URL",
  "backlinksOverview.search.submit": "Search",
  "backlinksOverview.search.submitting": "Loading...",
  "backlinksOverview.search.validation.targetRequired":
    "Enter a domain or URL to analyze.",
  "backlinksOverview.search.validation.tabLimit":
    "Close a tab to open more searches (max {tabLimit, number}).",

  // Search scope — shared by the search card's toggle, the overview panel's
  // scope badge, and the history list's per-item subtitle.
  "backlinksOverview.scope.domain": "Site-wide",
  "backlinksOverview.scope.page": "Exact page",

  // Overview panels (BacklinksOverviewPanels.tsx)
  "backlinksOverview.nav.recentSearches": "Recent searches",
  "backlinksOverview.overview.target": "Target: {target}",
  "backlinksOverview.overview.updated": "Updated {date}",
  // formatRelativeTimestamp's un-parseable-date fallback.
  "backlinksOverview.overview.updatedFallback": "recently",
  "backlinksOverview.overview.pageScopeNotice":
    "Showing backlinks for this exact page. Enter a bare domain for site-wide results. Trend charts are only shown for domain-level lookups.",

  "backlinksOverview.summary.backlinks.label": "Backlinks",
  "backlinksOverview.summary.backlinks.description":
    "Total links pointing to this site or page.",
  "backlinksOverview.summary.referringDomains.label": "Referring Domains",
  "backlinksOverview.summary.referringDomains.description":
    "Unique domains linking to this site or page.",
  "backlinksOverview.summary.referringPages.label": "Referring Pages",
  "backlinksOverview.summary.referringPages.description":
    "Unique pages linking to this site or page.",
  "backlinksOverview.summary.rank.label": "Rank",
  "backlinksOverview.summary.rank.description":
    "DataForSEO's 0-100 authority score.",
  "backlinksOverview.summary.backlinksSpamScore.label": "Backlink Spam Score",
  "backlinksOverview.summary.backlinksSpamScore.description":
    "Estimated spam risk of links pointing here.",
  "backlinksOverview.summary.brokenBacklinks.label": "Broken Backlinks",
  "backlinksOverview.summary.brokenBacklinks.description":
    "Links pointing to broken pages here.",
  "backlinksOverview.summary.brokenPages.label": "Broken Pages",
  "backlinksOverview.summary.brokenPages.description":
    "Broken pages here that still have backlinks.",
  "backlinksOverview.summary.targetSpamScore.label": "Target Spam Score",
  "backlinksOverview.summary.targetSpamScore.description":
    "Estimated spam risk of this site or page.",

  "backlinksOverview.chart.growth.title": "Backlink growth",
  "backlinksOverview.chart.growth.description":
    "Backlinks and referring domains over the last year",
  "backlinksOverview.chart.newVsLost.title": "New vs lost",
  "backlinksOverview.chart.newVsLost.description":
    "Backlink acquisition and attrition",

  // Charts (BacklinksPageCharts.tsx)
  "backlinksOverview.chart.trendAriaLabel": "Backlink trend chart",
  "backlinksOverview.chart.newLostAriaLabel": "New and lost backlinks chart",
  "backlinksOverview.chart.empty": "Not enough historical data yet.",
  "backlinksOverview.chart.legend.backlinks": "Backlinks",
  "backlinksOverview.chart.legend.referringDomains": "Referring domains",
  "backlinksOverview.chart.legend.lostBacklinks": "Lost backlinks",
  "backlinksOverview.chart.legend.newBacklinks": "New backlinks",

  // History section (BacklinksHistorySection.tsx)
  "backlinksOverview.history.empty": "Enter a domain or URL to get started",
  "backlinksOverview.history.count":
    "{count, plural, one {# recent search} other {# recent searches}}",

  // Provider setup gate + loading/error states (BacklinksPageStates.tsx)
  "backlinksOverview.gate.title": "Enable Backlinks",
  "backlinksOverview.gate.body":
    "Backlinks are not enabled for your DataForSEO account yet. You can enable them in DataForSEO, or use managed EchoSEO for long-term backlinks access at {price}/month.",
  "backlinksOverview.gate.helper":
    "We are also planning a Backlinks API so self-hosted apps can use EchoSEO's backlinks data directly. Until then, {link}.",
  "backlinksOverview.gate.helperLink": "use managed EchoSEO",
  "backlinksOverview.gate.confirmButton": "Confirm DataForSEO Access",
  "backlinksOverview.gate.confirming": "Confirming...",
  "backlinksOverview.gate.externalLabel": "Open DataForSEO Backlinks",
  "backlinksOverview.state.errorTitle": "Could not load backlinks",
  "backlinksOverview.state.errorFallback": "Please try again in a moment.",

  // Shared query error fallbacks (useBacklinksPageData.ts) — used only when
  // the error carries no recognized error code; coded errors (including
  // BACKLINKS_NOT_ENABLED / BACKLINKS_BILLING_ISSUE / INTERNAL_ERROR) resolve
  // through common.error.code.* via getLocalizedErrorMessage instead.
  "backlinksOverview.error.overviewFallback": "Could not load backlinks data.",
  "backlinksOverview.error.invalidTarget": "Enter a valid domain or page URL.",
  "backlinksOverview.error.tabFallback": "Could not load this tab.",
  "backlinksOverview.error.setupStatusFallback":
    "Could not load Backlinks setup status.",

  // Ahrefs DR enrichment (useAhrefsDomainRatings.ts) — opt-in convenience
  // feature, surfaced as a toast so partial results still render.
  "backlinksOverview.ahrefs.loadError": "Could not load Ahrefs DR.",
} as const;
