// English catalog — the source of truth for message IDs. Every other locale is
// typed against this catalog's keys, so adding a key here forces every locale to
// supply it. Keep IDs namespaced by surface (nav / account / language).
export const en = {
  "language.label": "Language",
  "language.switchLabel": "Change language",
  // Language names are endonyms (each shown in its own language) in every
  // catalog, so the switcher reads the same regardless of the active locale.
  "language.english": "English",
  "language.vietnamese": "Tiếng Việt",

  "nav.keywordResearch": "Keyword Research",
  "nav.savedKeywords": "Saved Keywords",
  "nav.rankTracking": "Rank Tracking",
  "nav.searchPerformance": "Search Performance",
  "nav.domainOverview": "Domain Overview",
  "nav.backlinks": "Backlinks",
  "nav.siteAudit": "Site Audit",
  "nav.brandLookup": "Brand Lookup",
  "nav.promptExplorer": "Prompt Explorer",
  "nav.aiMcp": "AI & MCP",

  "nav.group.keywords": "Keywords",
  "nav.group.domain": "Domain",
  "nav.group.aiVisibility": "AI Visibility",

  "nav.toggleSidebar": "Toggle sidebar",
  "nav.closeSidebar": "Close sidebar",

  "account.menuLabel": "Open account menu",
  "account.help": "Help & Community",
  "account.billing": "Billing",
  "account.settings": "Settings",
  "account.signOut": "Sign out",
} as const;

export type MessageId = keyof typeof en;

export type Messages = Record<MessageId, string>;
