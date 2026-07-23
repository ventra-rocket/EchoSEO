import { asc, eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { db } from "@/db";
import { member } from "@/db/better-auth-schema";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { checkInviteThrottle } from "@/server/auth/invite-throttle";

/**
 * Defense-in-depth guards for Better Auth's organization mutations.
 *
 * Better Auth v1.5.5 already blocks removing or demoting the last owner at its own
 * `/organization/*` endpoints. These `before` hooks re-assert the same invariant
 * so an upstream regression can't silently strand a workspace with no one able to
 * manage it. A role may be comma-joined (e.g. `"owner,admin"`), so it is matched
 * the way Better Auth matches roles — by membership of the split list, not string
 * equality — to avoid false-blocking a legitimate multi-owner change.
 */

function hasOwnerRole(role: string): boolean {
  return role.split(",").includes("owner");
}

async function ownerCount(organizationId: string): Promise<number> {
  const rows = await db
    .select({ role: member.role })
    .from(member)
    .where(eq(member.organizationId, organizationId));
  return rows.filter((row) => hasOwnerRole(row.role)).length;
}

/** Block removing the workspace's only owner. */
export async function assertNotLastOwnerRemoval(input: {
  role: string;
  organizationId: string;
}): Promise<void> {
  if (!hasOwnerRole(input.role)) return;
  if ((await ownerCount(input.organizationId)) <= 1) {
    throw new APIError("BAD_REQUEST", {
      message: "You can't remove the last owner of a workspace.",
    });
  }
}

/** Block demoting the workspace's only owner to a non-owner role. */
export async function assertNotLastOwnerDemotion(input: {
  role: string;
  newRole: string;
  organizationId: string;
}): Promise<void> {
  if (!hasOwnerRole(input.role) || hasOwnerRole(input.newRole)) return;
  if ((await ownerCount(input.organizationId)) <= 1) {
    throw new APIError("BAD_REQUEST", {
      message: "You can't change the role of the last owner of a workspace.",
    });
  }
}

/**
 * Rate-limit invite creation so cancel+reinvite can't be used to email arbitrary
 * addresses without bound (`invitationLimit` only caps *pending* invites). Runs
 * in the `beforeCreateInvitation` hook, so a block aborts before the invitation
 * row is created and before its email is sent.
 *
 * Hosted-only: invites never happen in the delegated/self-host modes, so the
 * throttle is skipped there and those deployments are unchanged. Throwing the
 * APIError here (not in a serverFn) means its message reaches the client toast.
 */
/**
 * Repair an organization left with members but no owner.
 *
 * The last-owner before-guards are read-then-act, so two concurrent owner
 * removals/demotions on one org can both pass the check and strand it with
 * members but no owner (Better Auth's own endpoint guard has the same shape;
 * neither can be made atomic against the other's write in D1 — no `SELECT FOR
 * UPDATE`, and the write is Better Auth's, not ours). Run from `afterRemoveMember`
 * / `afterUpdateMemberRole`, this repairs that rare slip by promoting the
 * earliest-joined remaining member back to owner. A fully-emptied org has nothing
 * to strand, so it is left alone.
 *
 * Scope: only removeMember / updateMemberRole fire organization hooks in Better
 * Auth v1.5.5. The `organization/leave` endpoint fires none, so a concurrent
 * double-leave of the last two owners is out of this repair's reach — bounded
 * only by Better Auth's built-in single-owner-leave block (that endpoint is not
 * used by the app UI).
 *
 * Writes the role directly (not through Better Auth's updateMemberRole) so it
 * bypasses the before-guard and cannot recurse.
 */
export async function repairOrphanedOwnership(
  organizationId: string,
): Promise<void> {
  const rows = await db
    .select({ id: member.id, role: member.role })
    .from(member)
    .where(eq(member.organizationId, organizationId))
    .orderBy(asc(member.createdAt));

  if (rows.some((row) => hasOwnerRole(row.role))) return;

  const [earliest] = rows;
  if (!earliest) return; // empty org — nothing to strand

  await db
    .update(member)
    .set({ role: "owner" })
    .where(eq(member.id, earliest.id));
  console.error(
    `[org-integrity] owner_repaired org=${organizationId} member=${earliest.id}`,
  );
}

export async function assertInviteWithinThrottle(input: {
  organizationId: string;
  email: string;
}): Promise<void> {
  if (!(await isHostedServerAuthMode())) return;

  const decision = await checkInviteThrottle({
    organizationId: input.organizationId,
    // Normalize so case/whitespace variants of one address share a counter.
    emailNormalized: input.email.trim().toLowerCase(),
  });
  if (!decision.allowed) {
    throw new APIError("TOO_MANY_REQUESTS", {
      message:
        "Too many invitations from this workspace right now. Please try again later.",
    });
  }
}
