// Brand Lookup citations: filter panel, citations card and its tables.
export const aiCitations = {
  // Filter panel (BrandLookupFilterPanel.tsx). Include/Exclude labels and the
  // Min/Max range placeholders are identical on both the "Cited sources" and
  // "Queries" tabs — only the example placeholder text differs, so those get
  // per-tab ids while the labels stay shared.
  "aiCitations.filterPanel.heading": "Refine results",
  "aiCitations.filterPanel.activeCount": "{count, number} active",
  "aiCitations.filterPanel.clearAll": "Clear all",
  "aiCitations.filterPanel.includeLabel": "Include Terms",
  "aiCitations.filterPanel.excludeLabel": "Exclude Terms",
  "aiCitations.filterPanel.min": "Min",
  "aiCitations.filterPanel.max": "Max",
  "aiCitations.filterPanel.platformLabel": "Platform",
  // The "" (no filter) option in the platform toggle; the other options
  // render through formatPlatformLabel, which is a data label, not prose.
  "aiCitations.filterPanel.platformAll": "All",
  "aiCitations.filterPanel.pages.includePlaceholder": "reddit, forbes",
  "aiCitations.filterPanel.pages.excludePlaceholder": "pinterest, /tag",
  "aiCitations.filterPanel.pages.mentionsTitle": "Source mentions",
  "aiCitations.filterPanel.queries.includePlaceholder": "pricing, reviews",
  "aiCitations.filterPanel.queries.excludePlaceholder": "login, download",
  "aiCitations.filterPanel.queries.volumeTitle": "AI search volume",

  // Citations card chrome (BrandLookupCitationsCard.tsx). The export trigger
  // and the Google Sheets menu item reuse common.table.export /
  // common.sheets.export — the same export-dropdown convention already
  // shipped for domain/backlinks/rank tables — instead of a second "Export" /
  // "Export to Sheets" id.
  "aiCitations.card.tab.queries": "Queries",
  "aiCitations.card.tab.pages": "Cited sources",
  "aiCitations.card.export.csv": "CSV",
  "aiCitations.card.filters.toggleTitle": "Toggle table filters",
  "aiCitations.card.filters.label": "Filters",
  "aiCitations.card.caption.pages":
    "Pages cited alongside {brand} in AI answers. Prompt examples come from the fetched sample.",
  "aiCitations.card.caption.queries":
    "Fetched sample of prompts whose AI answer cited {brand} in its text or sources.",

  // Citation tables (BrandLookupCitationTables.tsx). The platform column
  // header/tooltip is identical between the pages and queries variants, so it
  // gets one shared id rather than two copies of the same sentence.
  "aiCitations.table.column.source": "Source",
  "aiCitations.table.column.sourceHelp":
    "A page cited as a source in AI answers where the searched brand or domain appears.",
  "aiCitations.table.column.platform": "Platform",
  "aiCitations.table.column.platformHelp":
    "Which AI surface produced the answer — ChatGPT or Google AI Overview.",
  "aiCitations.table.column.citedFor": "Cited for",
  "aiCitations.table.column.citedForHelp":
    "Example prompts from the fetched sample where this page was cited.",
  "aiCitations.table.column.sourceVolume": "Source vol.",
  "aiCitations.table.column.sourceVolumeHelp":
    "Estimated monthly prompt demand DataForSEO reports for this cited source, across prompts where the searched brand or domain appears.",
  "aiCitations.table.column.query": "Query",
  "aiCitations.table.column.queryHelp":
    "A sampled user prompt whose AI answer cited the searched brand or domain in its text or sources. The prompt itself may not name the brand.",
  "aiCitations.table.column.aiSearchVolume": "AI search vol.",
  "aiCitations.table.column.aiSearchVolumeHelp":
    "Estimated monthly search demand for this prompt's topic. This is prompt demand, not the number of brand mentions.",
  "aiCitations.table.column.actions": "Actions",
  // The badge marking the searched brand/domain's own page among cited
  // sources (PageUrlCell).
  "aiCitations.table.you": "You",
  "aiCitations.table.brandsMentioned": "Brands: {brands}",
  "aiCitations.table.keywordsShowLess": "Show less",
  "aiCitations.table.keywordsMore": "+{count, number} more",
  // `count` arrives pre-formatted (a locale-formatted number, or the "—"
  // null placeholder) rather than typed `number` — matches
  // audit.history.baselineSelector.option's {date} pattern for values that
  // are already resolved strings by the time they reach the message.
  "aiCitations.table.keywordVolume": "{count} vol.",
  // Reuses nav.promptExplorer for the destination name so this sentence and
  // the sidebar link can never name the same page two different ways.
  "aiCitations.table.runPromptTitle": "Run this prompt in {promptExplorer}",
  "aiCitations.table.volumeTooltip": "Prompt volume in the fetched sample",
  "aiCitations.table.pagesEmpty": "No cited sources to show.",
  "aiCitations.table.queriesEmpty": "No matching queries found.",
} as const;
