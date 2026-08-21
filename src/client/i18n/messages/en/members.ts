// Workspace members — the members page, invite flow, and the invitation
// acceptance page a new teammate lands on.
export const members = {
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
} as const;
