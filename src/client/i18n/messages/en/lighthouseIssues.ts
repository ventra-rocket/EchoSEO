// Lighthouse issue list: rows, grouped parts and the issues screen
// (src/client/features/lighthouse/issues/**).
//
// `severity.*` and `category.*` are each one label reused everywhere it
// appears — the header's severity-count badges and each row's severity badge
// share `severity.*` (the row renders it lowercase via CSS, not a second
// catalog entry); the category tabs, the score gauges in
// LighthouseIssuesSummary.tsx and each row's category cell all share
// `category.*` — rather than respelling the same word per call site.
//
// Lighthouse's own audit `title`, `description` and `displayValue` (and each
// metric's `displayValue`, e.g. "3.1 s") are not translated here: they are
// Lighthouse's report text, not EchoSEO's copy, the same as the audit rule
// catalogue's undisclosed English guidance. `list.providerNotice` is the
// on-screen line that tells a reader why those specific sentences stay
// English while everything drawn from this catalog is Vietnamese.
// `impactMs`/`impactBytes`, by contrast, are raw numbers EchoSEO formats
// itself, so they go through `intl.formatNumber` in LighthouseIssueRow.tsx
// instead of a catalog entry. CSV/Sheets headers (ISSUE_HEADERS in
// utils.tsx) stay English on purpose too, matching the precedent at
// keywordUi.saveExport in keywordUi.ts.
export const lighthouseIssues = {
  "lighthouseIssues.severity.critical": "Critical",
  "lighthouseIssues.severity.warning": "Warning",
  "lighthouseIssues.severity.info": "Info",

  "lighthouseIssues.category.all": "All",
  "lighthouseIssues.category.performance": "Performance",
  "lighthouseIssues.category.accessibility": "Accessibility",
  "lighthouseIssues.category.bestPractices": "Best Practices",
  "lighthouseIssues.category.seo": "SEO",

  // Header (LighthouseIssuesHeader in LighthouseIssuesParts.tsx)
  "lighthouseIssues.header.backTo": "← Back to {backLabel}",
  "lighthouseIssues.header.title": "Lighthouse Issues",
  "lighthouseIssues.header.loadingUrl": "Loading URL…",
  "lighthouseIssues.header.scanned": "Scanned {date}",
  "lighthouseIssues.header.loadingScanTime": "Reading latest issues…",

  // Issue list (LighthouseIssueList in LighthouseIssuesParts.tsx)
  "lighthouseIssues.list.loading": "Loading issues…",
  "lighthouseIssues.list.emptyDefault":
    "No actionable issues for this category.",
  "lighthouseIssues.list.providerNotice":
    "Issue titles, descriptions and metric values come directly from Lighthouse's report and are shown in English.",
  "lighthouseIssues.list.column.severity": "Severity",
  "lighthouseIssues.list.column.issue": "Issue",
  "lighthouseIssues.list.column.category": "Category",
  "lighthouseIssues.list.column.impact": "Impact",
  "lighthouseIssues.list.column.score": "Score",

  // Row (LighthouseIssueRow.tsx)
  "lighthouseIssues.row.affectedItems": "Affected items ({count, number})",

  // Export menu (ExportMenu in LighthouseIssuesExportMenu.tsx). Ids reused
  // byte-for-byte between the JSON and CSV sections wherever the two menus
  // render identical text (downloadCurrentCategory, downloadAllActionable).
  "lighthouseIssues.export.menuButton": "Export",
  "lighthouseIssues.export.sheetsSectionTitle": "Export to Sheets",
  "lighthouseIssues.export.sheetsCurrentCategory":
    "Open in Sheets — {category}",
  "lighthouseIssues.export.sheetsAllActionable":
    "Open in Sheets — all actionable",
  "lighthouseIssues.export.copySectionTitle": "Copy",
  "lighthouseIssues.export.copyCurrentCategory": "Copy {category} issues",
  "lighthouseIssues.export.copyAllActionable": "Copy all actionable issues",
  "lighthouseIssues.export.copySavedPayload": "Copy saved Lighthouse payload",
  "lighthouseIssues.export.copiedCurrentCategoryToast":
    "Copied {category} issues",
  "lighthouseIssues.export.copiedAllActionableToast":
    "Copied all actionable issues",
  "lighthouseIssues.export.copiedSavedPayloadToast":
    "Copied saved Lighthouse payload",
  "lighthouseIssues.export.jsonSectionTitle": "Download JSON",
  "lighthouseIssues.export.csvSectionTitle": "Download CSV",
  "lighthouseIssues.export.downloadCurrentCategory":
    "Download {category} issues",
  "lighthouseIssues.export.downloadAllActionable":
    "Download all actionable issues",
  "lighthouseIssues.export.downloadSavedPayload":
    "Download saved Lighthouse payload",

  // Screen-level actions (useLighthouseIssuesActions in
  // LighthouseIssuesScreen.tsx)
  "lighthouseIssues.actions.downloadStarted": "Download started",
  "lighthouseIssues.actions.csvDownloadStarted": "CSV download started",
  "lighthouseIssues.actions.exportErrorDefault": "Failed to export payload.",
  "lighthouseIssues.actions.copyErrorDefault": "Failed to copy payload.",

  // Screen chrome (LighthouseIssuesScreen.tsx)
  "lighthouseIssues.screen.loadError": "Failed to load Lighthouse issues.",
  "lighthouseIssues.screen.legacyPayloadWarning":
    "This Lighthouse run was stored before issue details were preserved. Re-run the audit to see category counts and issue cards.",
  "lighthouseIssues.screen.legacyPayloadEmptyMessage":
    "This audit was saved without issue-level Lighthouse details. Re-run the audit to populate this screen.",
} as const;
