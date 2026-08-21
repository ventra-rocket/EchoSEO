// Saved Keywords: table, filter panel, pagination, status line, bulk action bar, tag filter.
// One id per literal string avoids five copies of one sentence drifting
// apart; a shared action belongs in `common` instead.
export const savedTable = {
  // Table columns (SavedKeywordsTable.tsx). "Difficulty" is reused as the
  // filter panel's range-section title (SavedKeywordsFilterPanel.tsx) — same
  // word, same meaning, one id.
  "saved.table.column.keyword": "Keyword",
  "saved.table.column.volume": "Volume",
  "saved.table.column.cpc": "CPC",
  "saved.table.column.competition": "Competition",
  "saved.table.column.difficulty": "Difficulty",
  "saved.table.column.intent": "Intent",
  "saved.table.column.tags": "Tags",
  "saved.table.column.lastFetched": "Last Fetched",
  "saved.table.tooltip.competition":
    "Paid-search competition from Google Ads (0-1): higher means more advertisers bidding.",
  "saved.table.tooltip.difficulty":
    "Organic ranking difficulty (0-100): higher means harder to reach Google's top 10.",

  // Empty states (SavedKeywordsTable.tsx)
  "saved.table.empty.noMatch": "No saved keywords match the current filters.",
  "saved.table.empty.noneYet":
    "No saved keywords yet. Use the Keyword Research page to find and save keywords.",

  // Filter panel (SavedKeywordsFilterPanel.tsx)
  "saved.table.filter.refineResults": "Refine results",
  "saved.table.filter.activeCount": "{count, number} active",
  "saved.table.filter.clearAll": "Clear all",
  "saved.table.filter.include": "Include",
  "saved.table.filter.includePlaceholder": "Must contain… e.g. audit",
  "saved.table.filter.exclude": "Exclude",
  "saved.table.filter.excludePlaceholder": "Must not contain… e.g. jobs",
  "saved.table.filter.removeTerm": "Remove {term}",
  "saved.table.filter.searchVolume": "Search Volume",
  "saved.table.filter.cpcUsd": "CPC (USD)",
  "saved.table.filter.min": "Min",
  "saved.table.filter.max": "Max",

  // Filters toolbar (SavedKeywordsFilters.tsx)
  "saved.table.filter.toggleTooltip": "Toggle table filters",
  "saved.table.filter.filtersLabel": "Filters",

  // Tag filter (SavedKeywordsTagFilter.tsx)
  "saved.table.tagFilter.label": "Tags",
  "saved.table.tagFilter.removeFilterTitle": "Remove filter",
  "saved.table.tagFilter.clearSelected": "Clear",
  "saved.table.tagFilter.searchPlaceholder": "Search tags…",
  "saved.table.tagFilter.noTagsYet":
    "No tags yet. Add tags from a selection of keywords.",
  "saved.table.tagFilter.noSearchMatch": "No tags match that search.",
  "saved.table.tagFilter.selectedCount": "{count, number} selected",
  "saved.table.tagFilter.clearAllTags": "Clear all",
  "saved.table.tagFilter.manageAriaLabel": "Manage {name}",

  // Bulk action bar (SavedKeywordsBulkActionBar.tsx). Shared selection and
  // Sheets-export labels come from `common`.
  "saved.table.bulk.tag": "Tag",
  "saved.table.bulk.copyKeywords": "Copy keywords",
  "saved.table.bulk.exportCsv": "Export CSV",
  "saved.table.bulk.delete": "Delete",

  // Status line (SavedKeywordsStatus.tsx)
  "saved.table.status.count":
    "{count, plural, one {# saved keyword} other {# saved keywords}}",

  // Route toasts and error fallbacks (routes/_project/p/$projectId/saved.tsx)
  "saved.table.remove.success":
    "{count, plural, one {# keyword} other {# keywords}} removed",
  "saved.table.remove.errorDefault": "Remove failed.",
  "saved.table.tagUpdate.success":
    "Updated tags for {count, plural, one {# keyword} other {# keywords}}",
  "saved.table.tagUpdate.errorDefault": "Could not update tags",
  "saved.table.metrics.success":
    "Updated stats for {count, plural, one {# keyword} other {# keywords}}",
  "saved.table.metrics.errorDefault": "Could not update keyword stats.",
  "saved.table.copy.success":
    "{count, plural, one {# keyword} other {# keywords}} copied",

  // Export hook (useSavedKeywordsExport.ts)
  "saved.table.export.noData": "No keywords to export",
  "saved.table.export.csvErrorDefault": "Could not export CSV",
  "saved.table.export.sheetsErrorDefault": "Could not export to Sheets",
} as const;
