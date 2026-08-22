// Domain Overview tables: keyword and page tabs, sortable headers, difficulty badges, filter panel and pagination.
export const domainTables = {
  // Filters toolbar (shared by both tabs)
  "domainTables.toolbar.toggleFiltersTitle": "Toggle filters",
  "domainTables.toolbar.filtersLabel": "Filters",

  // Filter panel (shared by both tabs)
  "domainTables.filterPanel.title": "Refine table results",
  "domainTables.filterPanel.activeCount": "{count, number} active",
  "domainTables.filterPanel.unappliedCount": "{count, number} unapplied",
  "domainTables.filterPanel.clearAll": "Clear all",
  "domainTables.filterPanel.min": "Min",
  "domainTables.filterPanel.max": "Max",
  "domainTables.filterPanel.overLimit":
    "Too many filter conditions ({count, number} of {max, number} max). Remove some terms or ranges before applying.",
  "domainTables.filterPanel.conditionCount":
    "{count, number} / {max, number} conditions",
  "domainTables.filterPanel.cancel": "Cancel",
  "domainTables.filterPanel.apply": "Apply filters",
  "domainTables.filterPanel.applyDisabledTitle":
    "DataForSEO accepts at most {max, number} filter conditions per request",

  // Export menu (shared by both tabs; CSV/Sheets export headers themselves
  // stay English per the shipped export convention — only this chrome localizes)
  "domainTables.export.copyJson": "Copy data (JSON)",
  "domainTables.export.downloadCsv": "Download CSV",
  "domainTables.export.downloadExcel": "Download Excel",
  "domainTables.export.copiedToast": "Copied data",

  // Pagination (shared by both tabs). Rows-per-page / page / prev / next
  // reuse common.table.*; only the "no total yet" range variant is local.
  "domainTables.pagination.rangeNoTotal": "{start, number}–{end, number}",

  // Keywords tab
  "domainTables.keywords.resultCount":
    "{count, plural, one {# keyword} other {# keywords}}",
  "domainTables.keywords.bulk.save": "Save Keywords",
  "domainTables.keywords.selectionHint": "Select keywords to save",
  "domainTables.keywords.column.keyword": "Keyword",
  "domainTables.keywords.column.rank": "Rank",
  "domainTables.keywords.column.volume": "Volume",
  "domainTables.keywords.column.traffic": "Traffic",
  "domainTables.keywords.column.cpc": "CPC",
  "domainTables.keywords.column.cpcTooltip": "Cost per click in USD.",
  "domainTables.keywords.column.url": "URL",
  "domainTables.keywords.column.score": "Score",
  "domainTables.keywords.column.scoreTooltip":
    "Organic ranking difficulty (0-100): higher means harder to reach Google's top 10.",
  "domainTables.keywords.empty": "No keywords match this search.",
  "domainTables.keywords.filter.includeLabel": "Include Terms",
  "domainTables.keywords.filter.includePlaceholder": "audit, checker, template",
  "domainTables.keywords.filter.excludeLabel": "Exclude Terms",
  "domainTables.keywords.filter.excludePlaceholder": "jobs, salary, course",
  "domainTables.keywords.filter.trafficTitle": "Traffic",
  "domainTables.keywords.filter.volumeTitle": "Volume",
  "domainTables.keywords.filter.cpcTitle": "CPC (USD)",
  "domainTables.keywords.filter.scoreTitle": "Score (KD)",
  "domainTables.keywords.filter.rankTitle": "Rank",

  // Pages tab
  "domainTables.pages.resultCount":
    "{count, plural, one {# page} other {# pages}}",
  "domainTables.pages.column.page": "Page",
  "domainTables.pages.column.organicTraffic": "Organic Traffic",
  "domainTables.pages.column.keywords": "Keywords",
  "domainTables.pages.empty": "No pages match this search.",
  "domainTables.pages.filter.includeLabel": "Include Page Terms",
  "domainTables.pages.filter.includePlaceholder": "pricing, tools, guides",
  "domainTables.pages.filter.excludeLabel": "Exclude Page Terms",
  "domainTables.pages.filter.excludePlaceholder": "blog, tag, archive",
  "domainTables.pages.filter.trafficTitle": "Traffic",
  "domainTables.pages.filter.keywordsTitle": "Keywords",
} as const;
