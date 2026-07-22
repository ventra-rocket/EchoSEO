import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { db } from "@/db";
import { member } from "@/db/better-auth-schema";

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
