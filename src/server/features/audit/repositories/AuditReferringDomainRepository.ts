/**
 * Data access for a target's off-page referring-domain snapshots: small
 * aggregate readings written on each explicit, credit-spending refresh.
 */
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditReferringDomainSnapshots } from "@/db/schema";

type ReferringDomainSnapshot =
  typeof auditReferringDomainSnapshots.$inferSelect;

/**
 * Persist one aggregate reading. `queriedAt` is supplied by the caller as a full
 * ISO timestamp (millisecond precision) rather than left to the column default:
 * the default renders `current_timestamp` as `YYYY-MM-DD HH:MM:SS`, which sorts
 * lexicographically against ISO `T`-separated values inconsistently. Writing one
 * format everywhere keeps the newest-first ordering the trend relies on correct.
 */
async function insertSnapshot(input: {
  projectId: string;
  targetId: string;
  provider: string;
  target: string;
  coverage: string;
  referringDomains: number;
  newReferringDomains: number | null;
  lostReferringDomains: number | null;
  queriedAt: string;
  triggeredByUserId: string;
}): Promise<ReferringDomainSnapshot> {
  const id = crypto.randomUUID();
  await db.insert(auditReferringDomainSnapshots).values({
    id,
    projectId: input.projectId,
    targetId: input.targetId,
    provider: input.provider,
    target: input.target,
    coverage: input.coverage,
    referringDomains: input.referringDomains,
    newReferringDomains: input.newReferringDomains,
    lostReferringDomains: input.lostReferringDomains,
    queriedAt: input.queriedAt,
    triggeredByUserId: input.triggeredByUserId,
  });

  const row = await db.query.auditReferringDomainSnapshots.findFirst({
    where: eq(auditReferringDomainSnapshots.id, id),
  });
  if (!row) {
    throw new Error("Failed to insert referring-domain snapshot");
  }
  return row;
}

/** The most recent snapshots for a target, newest first. */
async function listSnapshotsForTarget(
  targetId: string,
  limit: number,
): Promise<ReferringDomainSnapshot[]> {
  return (
    db
      .select()
      .from(auditReferringDomainSnapshots)
      .where(eq(auditReferringDomainSnapshots.targetId, targetId))
      // rowid breaks a same-millisecond queriedAt tie by insertion order, so two
      // near-simultaneous refreshes still resolve a deterministic latest/previous.
      .orderBy(desc(auditReferringDomainSnapshots.queriedAt), desc(sql`rowid`))
      .limit(limit)
  );
}

export const AuditReferringDomainRepository = {
  insertSnapshot,
  listSnapshotsForTarget,
} as const;
