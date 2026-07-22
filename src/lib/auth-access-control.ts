import {
  ownerAc,
  adminAc,
  memberAc,
} from "better-auth/plugins/organization/access";

/**
 * Organization access-control roles for the hosted workspace.
 *
 * Better Auth ships owner/admin/member; we add `editor` and `viewer` so an invite
 * can grant a distinct read-only seat (a plain member maps to editor for lack of
 * one). At the ORGANIZATION layer editor and viewer are ordinary members —
 * `memberAc` gives them no member/org-management permissions, so only owner/admin
 * can invite, remove, or change the workspace. What editor vs viewer can actually
 * do inside the product is governed separately by the audit role matrix
 * (`resolveWorkspaceRole` → canInvestigate/canManageTarget), which keys off the
 * role name and already maps both; this module only makes the names assignable
 * and keeps Better Auth's own org endpoints authorized correctly.
 *
 * Server-only: it configures the auth instance. Client-side permission checks
 * (which would need the same `roles` on `organizationClient`) ride with the
 * member-management UI slice.
 */
export const roles = {
  owner: ownerAc,
  admin: adminAc,
  member: memberAc,
  editor: memberAc,
  viewer: memberAc,
} as const;
