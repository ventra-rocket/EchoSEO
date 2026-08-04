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

  "members.title": "Members",
  "members.subtitle":
    "Invite teammates to your workspace and manage their access.",
  "members.hostedOnly": "Workspace members are available on the hosted plan.",
  "members.noAccess": "Only workspace owners and admins can manage members.",
  "members.you": "You",

  "members.invite.title": "Invite a teammate",
  "members.invite.emailLabel": "Email address",
  "members.invite.roleLabel": "Role",
  "members.invite.submit": "Invite",
  "members.invite.sent": "Invitation sent.",
  "members.invite.error": "We couldn't send that invitation.",
  "members.invite.cancelError": "We couldn't cancel that invitation.",

  "members.list.title": "Members",
  "members.list.error": "We couldn't load the members.",

  "members.role.owner": "Owner",
  "members.role.admin": "Admin",
  "members.role.editor": "Editor",
  "members.role.viewer": "Viewer",
  "members.role.change": "Change role",
  "members.role.error": "We couldn't change that role.",

  "members.remove.label": "Remove member",
  "members.remove.done": "Member removed.",
  "members.remove.error": "We couldn't remove that member.",

  "members.invites.title": "Pending invitations",
  "members.invites.empty": "No pending invitations.",
  "members.invites.error": "We couldn't load the invitations.",
  "members.invites.cancel": "Cancel",
  "members.invites.expired": "Expired",

  "invite.title": "Workspace invitation",
  "invite.body": "You've been invited to join {organization}.",
  "invite.aWorkspace": "a workspace",
  "invite.accept": "Accept",
  "invite.decline": "Decline",
  "invite.accepted": "Invitation accepted.",
  "invite.acceptError": "We couldn't accept that invitation.",
  "invite.declineError": "We couldn't decline that invitation.",
  "invite.unavailable": "This invitation is no longer available.",

  "commandCenter.eyebrow": "Project overview",
  "commandCenter.noDomain": "No domain configured yet",
  "commandCenter.refresh": "Refresh",
  "commandCenter.refreshAria": "Refresh project overview",
  "commandCenter.loadError": "We could not load this project overview.",
  "commandCenter.retry": "Retry",
  "commandCenter.signalsLabel": "Project signals",

  "commandCenter.freshness.auditCompleted": "Audit last completed {date}",
  "commandCenter.freshness.auditCompletedUnknown":
    "Audit completed (date unavailable)",
  "commandCenter.freshness.auditRunning":
    "Audit in progress · {crawled}/{total} pages",
  "commandCenter.freshness.auditQueued": "Audit queued",
  "commandCenter.freshness.auditFailed": "Last audit did not complete",
  "commandCenter.freshness.auditNone": "No audit run yet",
  "commandCenter.freshness.auditUnavailable": "Audit status unavailable",

  "commandCenter.nextAction.eyebrow": "Next action",
  "commandCenter.nextAction.completeTitle": "Foundation connected",
  "commandCenter.nextAction.completeBody":
    "Your core project signals are connected. Use the evidence below to choose the next SEO task.",
  "commandCenter.nextAction.incompleteTitle": "Recommendations incomplete",
  "commandCenter.nextAction.incompleteBody":
    "Some project signals are unavailable right now, so the next step cannot be confirmed. Refresh to try again.",

  "commandCenter.action.addDomain.title": "Add your website domain",
  "commandCenter.action.addDomain.body":
    "Give this project a domain so every SEO workflow has a clear target.",
  "commandCenter.action.connectGsc.title": "Connect Google Search Console",
  "commandCenter.action.connectGsc.body":
    "Bring first-party search performance into this project.",
  "commandCenter.action.runAudit.title": "Run your first site audit",
  "commandCenter.action.runAudit.body":
    "Find technical and content issues before choosing what to fix.",
  "commandCenter.action.fixIssues.title": "Review priority audit issues",
  "commandCenter.action.fixIssues.body":
    "{critical} critical and {high} high-priority issue groups need attention.",
  "commandCenter.action.addKeywords.title": "Start tracking priority keywords",
  "commandCenter.action.addKeywords.body":
    "Set a keyword set to see ranking movement over time.",

  "commandCenter.signal.auditEvidence": "Audit evidence",
  "commandCenter.signal.priorityIssues": "Priority issues",
  "commandCenter.signal.trackedKeywords": "Tracked keywords",
  "commandCenter.signal.aiWorkspace": "AI workspace",

  "commandCenter.value.unavailable": "Unavailable",
  "commandCenter.value.noAudit": "No audit yet",
  "commandCenter.value.auditFailed": "Audit failed",
  "commandCenter.value.auditQueued": "Queued",
  "commandCenter.value.pages": "{crawled}/{total} pages",
  "commandCenter.value.waitingForAudit": "Waiting for audit",
  "commandCenter.value.stillAnalyzing": "Still analyzing",
  "commandCenter.value.issueGroups":
    "{count, plural, one {# issue group} other {# issue groups}}",
  "commandCenter.value.notConfigured": "Not configured",
  "commandCenter.value.assistedWorkflows": "Assisted workflows",

  "commandCenter.detail.sourceCrawl": "Source: site crawl",
  "commandCenter.detail.crawlInProgress": "Crawl in progress",
  "commandCenter.detail.auditIncomplete": "Audit did not complete",
  "commandCenter.detail.sourceAudit": "Source: site audit",
  "commandCenter.detail.completedAudit": "Last completed audit {date}",
  "commandCenter.detail.fromLastCompletedAudit":
    "From last completed audit {date}",
  "commandCenter.detail.sourceRank": "Source: rank tracking",
  "commandCenter.detail.rankNeverRun": "No completed run yet",
  "commandCenter.detail.rankSingle": "Updated {date}",
  "commandCenter.detail.rankRange": "Updated {oldest} – {newest}",
  "commandCenter.detail.rankMixed": "Mixed run times across trackers",
  "commandCenter.detail.aiWorkspace": "Read-only planning and analysis",

  "commandCenter.health.title": "Data health",
  "commandCenter.health.searchConsole": "Search Console",
  "commandCenter.health.siteAudit": "Site audit",
  "commandCenter.health.rankTracking": "Rank tracking",
  "commandCenter.health.connected": "Connected",
  "commandCenter.health.notConnected": "Not connected",
  "commandCenter.health.auditCompleted": "Completed · {crawled}/{total} pages",
  "commandCenter.health.auditRunning": "In progress · {crawled}/{total} pages",
  "commandCenter.health.auditFailed": "Failed · {crawled}/{total} pages",
  "commandCenter.health.auditQueued": "Queued",
  "commandCenter.health.rankSummary":
    "{keywords} keywords across {trackers, plural, one {# tracker} other {# trackers}}",

  "commandCenter.priority.eyebrow": "Priority queue",
  "commandCenter.priority.heading": "Evidence before action",
  "commandCenter.priority.openAudit": "Open audit",
  "commandCenter.priority.unavailable":
    "Audit data is temporarily unavailable. Retry the page to refresh it.",
  "commandCenter.priority.critical": "Critical issue groups",
  "commandCenter.priority.high": "High-priority issue groups",
  "commandCenter.priority.source":
    "Source: completed crawl. Open the audit to inspect affected URLs and remediation guidance.",
  "commandCenter.priority.fromLastCompleted":
    "These counts reflect your last completed audit, not the run in progress.",
  "commandCenter.priority.materializing":
    "Issues are still being materialized. EchoSEO will not present a clean result until that analysis is complete.",
  "commandCenter.priority.clean":
    "No critical or high-priority issue groups in the last completed audit.",
  "commandCenter.priority.runAudit":
    "Run a site audit to create evidence-backed priorities for this project.",

  "commandCenter.provenance.title": "Data source",
  "commandCenter.provenance.body":
    "EchoSEO only reports signals already connected to this project. No external data request is triggered from this page.",
  "commandCenter.provenance.dataForSeoConfigured": "DataForSEO: configured",
  "commandCenter.provenance.dataForSeoNotConfigured":
    "DataForSEO: not configured",
} as const;

export type MessageId = keyof typeof en;

export type Messages = Record<MessageId, string>;
