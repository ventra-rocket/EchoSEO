/**
 * Data access for professional audit targets (project/domain-bound audit scope).
 */
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { auditTargets } from "@/db/schema";

type AuditTarget = typeof auditTargets.$inferSelect;

async function getByProjectAndOrigin(
  projectId: string,
  origin: string,
): Promise<AuditTarget | null> {
  const row = await db.query.auditTargets.findFirst({
    where: and(
      eq(auditTargets.projectId, projectId),
      eq(auditTargets.origin, origin),
    ),
  });
  return row ?? null;
}

/**
 * Return the target for a (project, origin), creating it on first use. The
 * unique (project_id, origin) index + onConflictDoNothing makes concurrent first
 * launches converge on one row instead of racing to insert duplicates.
 */
async function getOrCreateTarget(input: {
  projectId: string;
  organizationId: string;
  origin: string;
}): Promise<AuditTarget> {
  const existing = await getByProjectAndOrigin(input.projectId, input.origin);
  if (existing) return existing;

  await db
    .insert(auditTargets)
    .values({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      organizationId: input.organizationId,
      origin: input.origin,
    })
    .onConflictDoNothing({
      target: [auditTargets.projectId, auditTargets.origin],
    });

  const row = await getByProjectAndOrigin(input.projectId, input.origin);
  if (!row) {
    throw new Error("Failed to get-or-create audit target");
  }
  return row;
}

/**
 * Store the target's generated IndexNow key (host-submission proof), but only
 * while it is still unset. The `IS NULL` guard makes two concurrent set-ups
 * converge on the first key written instead of the second clobbering it (which
 * would leave a caller believing a key that is no longer stored). Callers re-read
 * the target to learn the key that actually won.
 */
async function setIndexNowKey(targetId: string, key: string): Promise<void> {
  await db
    .update(auditTargets)
    .set({ indexnowKey: key, updatedAt: new Date().toISOString() })
    .where(
      and(eq(auditTargets.id, targetId), isNull(auditTargets.indexnowKey)),
    );
}

export const AuditTargetRepository = {
  getByProjectAndOrigin,
  getOrCreateTarget,
  setIndexNowKey,
} as const;
