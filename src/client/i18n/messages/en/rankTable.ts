// Rank tracking table: columns, cells, toolbar, filters, export and the Search Console overlay note.
export const rankTable = {
  // Columns (RankTrackingColumns.tsx) — short header labels
  "rank.table.column.keyword": "Keyword",
  "rank.table.column.volume": "Volume",
  "rank.table.column.kd": "KD",
  "rank.table.column.cpc": "CPC",
  "rank.table.column.position": "Position",
  "rank.table.column.url": "URL",
  "rank.table.column.serpFeatures": "SERP Features",
  "rank.table.column.gscClicks": "GSC clicks",
  "rank.table.column.gscImpressions": "GSC impr.",
  "rank.table.column.gscAvgPosition": "GSC avg pos",
  "rank.table.column.sortByAriaLabel": "Sort by {label}",
  "rank.table.column.viewPositionHistory": "View position history",

  // Column header tooltips — same ids as HEADER_TOOLTIPS' former English values
  "rank.table.tooltip.keyword": "The search term being tracked in Google",
  "rank.table.tooltip.volume": "Estimated monthly search volume from Google",
  "rank.table.tooltip.kd":
    "Keyword difficulty score (0-100) — higher means harder to rank",
  "rank.table.tooltip.cpc": "Average cost per click in Google Ads (USD)",
  "rank.table.tooltip.position":
    "Current Google ranking position, showing change from the comparison period",
  "rank.table.tooltip.url": "The page on your site that ranks for this keyword",
  "rank.table.tooltip.serpFeatures":
    "Special result features appearing on the search results page (e.g. AI Overview, People Also Ask)",
  "rank.table.tooltip.gscClicks":
    "Clicks Search Console recorded for this exact query over the last 28 days — Google's own data, not a SERP check",
  "rank.table.tooltip.gscImpressions":
    "Impressions Search Console recorded for this exact query over the last 28 days",
  "rank.table.tooltip.gscAvgPosition":
    "Average position over the last 28 days, across the impressions the site actually received. An average, not the live rank in the position column",

  // SERP feature badges (RankTrackingTableParts.tsx)
  "rank.table.serp.featuredSnippet.short": "FS",
  "rank.table.serp.peopleAlsoAsk.short": "PAA",
  "rank.table.serp.aiOverview.short": "AI",
  "rank.table.serp.localPack.short": "Local",
  "rank.table.serp.knowledgePanel.short": "KP",
  "rank.table.serp.video.short": "Video",
  "rank.table.serp.images.short": "Img",
  "rank.table.serp.shopping.short": "Shop",
  "rank.table.serp.topStories.short": "News",
  "rank.table.serp.featuredSnippet.tooltip":
    "Featured Snippet — highlighted answer box at top of results",
  "rank.table.serp.peopleAlsoAsk.tooltip":
    "People Also Ask — expandable related questions",
  "rank.table.serp.aiOverview.tooltip":
    "AI Overview — AI-generated summary at top of search",
  "rank.table.serp.localPack.tooltip":
    "Local Pack — map with local business listings",
  "rank.table.serp.knowledgePanel.tooltip":
    "Knowledge Panel — info box about an entity",
  "rank.table.serp.video.tooltip": "Video — video results shown in the SERP",
  "rank.table.serp.images.tooltip": "Images — image results shown in the SERP",
  "rank.table.serp.shopping.tooltip": "Shopping — product listings with prices",
  "rank.table.serp.topStories.tooltip": "Top Stories — news articles carousel",

  // Position cell
  "rank.table.rank.lost": "lost",

  // GSC absent-cell tooltips. `complete` only rules out truncation as the reason
  // a keyword is missing — Search Console still omits anonymized queries from a
  // complete read, so the "complete" copy must never claim a proven zero. See
  // GscCountCell's own comment.
  "rank.table.gsc.tooltip.countComplete":
    "Google reported nothing for this query in the window — shown as 0, though very rare queries are omitted from Search Console entirely and would look the same",
  "rank.table.gsc.tooltip.countTruncated":
    "Outside the queries read from Search Console — unknown, not zero",
  "rank.table.gsc.tooltip.positionComplete":
    "Google reported nothing for this query in the window, so there is no average position to show — very rare queries are omitted from Search Console entirely and would look the same",
  "rank.table.gsc.tooltip.positionTruncated":
    "Outside the queries read from Search Console — no measurement available",

  "rank.table.export.noData": "No data to export",

  // Table shell, empty states, bulk actions (RankTrackingTable.tsx)
  "rank.table.empty.noKeywordsYet":
    'No keywords tracked yet. Use "Add Keywords" to start, then run a check.',
  "rank.table.empty.noMatch": "No keywords match your search.",
  "rank.table.bulk.selectedLabel": "selected",
  "rank.table.bulk.remove": "Remove",
  "rank.table.bulk.removeConfirmTitle": "Remove keywords?",
  "rank.table.bulk.removeConfirmBody":
    "This will stop tracking {count, plural, one {# keyword} other {# keywords}}. Historical ranking data is preserved but won't appear in the table.",
  "rank.table.bulk.cancel": "Cancel",
  "rank.table.bulk.removeConfirmButton":
    "Remove {count, plural, one {# keyword} other {# keywords}}",
  "rank.table.remove.success":
    "{removed, plural, one {# keyword} other {# keywords}} removed",
  "rank.table.remove.errorDefault": "Failed to remove keywords",
  "rank.table.footer.count":
    "{shown} of {total, plural, one {# keyword} other {# keywords}}",
  "rank.table.export.toSheets": "Export to Sheets",
  "rank.table.export.csv": "Export CSV",

  // Toolbar (RankTrackingTableToolbar.tsx)
  "rank.table.toolbar.latest": "Latest",
  "rank.table.toolbar.history": "History",
  "rank.table.toolbar.filtersToggleTooltip": "Toggle table filters",
  "rank.table.toolbar.filters": "Filters",
  "rank.table.toolbar.preparing": "Preparing...",
  // `=0` covers a run whose total is not known yet (falsy `keywordsTotal`):
  // shown as "?", not a proven zero keywords in flight.
  "rank.table.toolbar.gettingRankings":
    "Getting rankings for {total, plural, =0 {? keywords} one {# keyword} other {# keywords}}...",
  "rank.table.toolbar.keywordCount":
    "{count, plural, one {# keyword} other {# keywords}}",

  // Toolbar menus (ToolbarMenus.tsx)
  "rank.table.menu.moreActions": "More actions",
  "rank.table.menu.checkRankings": "Check rankings",
  "rank.table.menu.checkRankingsRunning": "Running...",
  "rank.table.menu.checkRankingsDescription": "Fetch current Google positions",
  "rank.table.menu.updateStats": "Update keyword stats",
  "rank.table.menu.updateStatsRunning": "Refreshing...",
  "rank.table.menu.updateStatsDescription":
    "Volume, difficulty & CPC — not rankings",
  "rank.table.menu.export": "Export",
  "rank.table.menu.copyKeywords": "Copy keywords",

  // Filters (RankTrackingFilters.tsx)
  "rank.table.filter.refineResults": "Refine results",
  "rank.table.filter.activeCount": "{count} active",
  "rank.table.filter.clearAll": "Clear all",
  "rank.table.filter.include": "Include",
  "rank.table.filter.includePlaceholder": "e.g. seo, tool",
  "rank.table.filter.exclude": "Exclude",
  "rank.table.filter.excludePlaceholder": "e.g. free, cheap",
  "rank.table.filter.desktopPosition": "Desktop position",
  "rank.table.filter.mobilePosition": "Mobile position",
  "rank.table.filter.min": "Min",
  "rank.table.filter.max": "Max",
  "rank.table.domainFilter.search": "Search",
  "rank.table.domainFilter.searchPlaceholder": "Domain or website",
  "rank.table.domainFilter.device": "Device",
  "rank.table.domainFilter.allDevices": "All devices",
  "rank.table.domainFilter.country": "Country",
  "rank.table.domainFilter.allCountries": "All countries",
  "rank.table.domainFilter.clear": "Clear",

  // Search Console overlay note (RankTrackingSearchActualsNote.tsx). Every
  // branch exists because the columns' absence or presence is itself a claim —
  // see the component's own comment before touching this copy.
  "rank.table.searchActuals.notConnected":
    "Connect Search Console to see the clicks, impressions and average position Google recorded for these keywords — free, no provider key. <link>Open Search Performance</link>.",
  "rank.table.searchActuals.propertyMismatch":
    "Search Console property <mono>{property}</mono> does not cover <mono>{domain}</mono>, so no Search Console columns are shown for these keywords.",
  "rank.table.searchActuals.ready":
    "Search Console columns: Google's own data for <mono>{property}</mono>, {from} → {to}. Average position over the window, not the live SERP rank in the position column. Google never names a query rare enough to be anonymized, so a keyword shown at 0 may still have real traffic Search Console won't report.",
  "rank.table.searchActuals.readyTruncatedSuffix":
    " This property has more queries than one read covers, so a keyword without numbers is unmeasured here rather than at zero.",

  // Search Performance hint (RankTrackingSearchPerformanceHint.tsx)
  "rank.table.searchPerfHint.body":
    "No provider key? Search Console already shows how your site ranks — <link>open Search Performance</link>.",
} as const;
