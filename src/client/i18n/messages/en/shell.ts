// App chrome — top nav, sidebar, project switcher, account menu.
export const shell = {
  "language.label": "Language",
  "language.switchLabel": "Change language",
  // Language names are endonyms (each shown in its own language) in every
  // catalog, so the switcher reads the same regardless of the active locale.
  "language.english": "English",
  "language.vietnamese": "Tiếng Việt",

  "nav.keywordResearch": "Keyword Research",
  "nav.overview": "Overview",
  "nav.savedKeywords": "Saved Keywords",
  "nav.rankTracking": "Rank Tracking",
  "nav.searchPerformance": "Search Performance",
  "nav.domainOverview": "Domain Overview",
  "nav.backlinks": "Backlinks",
  "nav.siteAudit": "Site Audit",
  "nav.brandLookup": "Brand Lookup",
  "nav.promptExplorer": "Prompt Explorer",
  "nav.aiMcp": "AI & MCP",
  "nav.assistantWorkspace": "AI Workspace",

  "nav.group.keywords": "Keywords",
  "nav.group.domain": "Domain",
  "nav.group.aiVisibility": "AI Visibility",

  "nav.toggleSidebar": "Toggle sidebar",
  "nav.closeSidebar": "Close sidebar",

  "shell.skipToContent": "Skip to main content",
  "shell.primaryNavigation": "Primary navigation",
  "shell.navigationMenu": "Navigation menu",
  "shell.expandNavigation": "Expand navigation",

  "projectSwitcher.switch": "Switch project",
  "projectSwitcher.select": "Select project",
  "projectSwitcher.manage": "Manage projects",

  "account.menuLabel": "Open account menu",
  "account.help": "Help & Community",
  "account.billing": "Billing",
  "account.members": "Members",
  "account.settings": "Settings",
  "account.signOut": "Sign out",
  "account.workspaces": "Workspaces",
  "account.workspaceSwitchError": "Could not switch workspace",

  "shell.setupNeeded.warning":
    "Setup needed: add your DataForSEO API key to use EchoSEO features. See the quick steps on the <helpLink>help page</helpLink>.",
  "shell.setupNeeded.verifyError":
    "We could not verify your DataForSEO setup. If features are not working, check the setup steps on the <helpLink>help page</helpLink>.",

  "shell.setupModal.title": "One quick setup step",
  "shell.setupModal.body":
    "Add your DataForSEO API key to start using EchoSEO.",
  "shell.setupModal.dismiss": "Dismiss",
  "shell.setupModal.openGuide": "Open setup guide",
} as const;
