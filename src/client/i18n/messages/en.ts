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

  "invite.title": "Workspace invitation",
  "invite.body": "You've been invited to join {organization}.",
  "invite.aWorkspace": "a workspace",
  "invite.accept": "Accept",
  "invite.decline": "Decline",
  "invite.accepted": "Invitation accepted.",
  "invite.acceptError": "We couldn't accept that invitation.",
  "invite.declineError": "We couldn't decline that invitation.",
  "invite.unavailable": "This invitation is no longer available.",
} as const;

export type MessageId = keyof typeof en;

export type Messages = Record<MessageId, string>;
