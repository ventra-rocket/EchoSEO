/**
 * Professional Site Audit workspace role matrix.
 *
 * The audit surface needs an owner/admin | editor | viewer distinction that is
 * identical across all three auth modes. The app layer owns this matrix rather
 * than better-auth access control:
 *
 * - `local_noauth` and `cloudflare_access` are delegated single-user workspaces.
 *   They never create a `member` row, so the authenticated identity is the
 *   owner of its own delegated organization.
 * - `hosted` uses better-auth memberships (owner/admin/member). Those roles are
 *   mapped into this matrix; editor/viewer become individually reachable once
 *   P11 wires invites with explicit roles.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { member } from "@/db/better-auth-schema";
import type { AuthMode } from "@/lib/auth-mode";

type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

/**
 * Map a better-auth org membership role into the audit role matrix. better-auth
 * ships owner/admin/member; `member` maps to editor (can investigate/export),
 * and any unknown or absent role falls back to the read-only viewer.
 */
export function mapHostedMemberRole(
  memberRole: string | null | undefined,
): WorkspaceRole {
  switch (memberRole) {
    case "owner":
      return "owner";
    case "admin":
      return "admin";
    case "editor":
      return "editor";
    case "member":
      return "editor";
    case "viewer":
      return "viewer";
    default:
      return "viewer";
  }
}

/**
 * Resolve the caller's audit role for an organization, consistently across auth
 * modes. Delegated modes resolve to owner without a DB read; hosted reads the
 * `member` row and maps it.
 */
export async function resolveWorkspaceRole(input: {
  userId: string;
  organizationId: string;
  authMode: AuthMode;
}): Promise<WorkspaceRole> {
  if (input.authMode !== "hosted") {
    return "owner";
  }

  const row = await db.query.member.findFirst({
    columns: { role: true },
    where: and(
      eq(member.userId, input.userId),
      eq(member.organizationId, input.organizationId),
    ),
  });

  return mapHostedMemberRole(row?.role);
}

/** Manage the target, verification, membership and Google-facing actions. */
export function canManageTarget(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

/** Launch audits and export/investigate results. */
export function canInvestigate(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

/**
 * Read audit status/results/artifacts. Read authorization is already enforced by
 * organization ownership of the project; every workspace member may read, so the
 * role gate only narrows mutations. Kept explicit so the matrix stays complete.
 */
export function canReadAudit(_role: WorkspaceRole): boolean {
  return true;
}
