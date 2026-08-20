/**
 * Data access for `audit_snapshots` — the immutable record a completed crawl
 * seals, and the baseline every comparison is drawn against.
 *
 * Split from `AuditRepository` because it is a distinct table with its own
 * lifecycle: a snapshot is written once at the finalize boundary and then only
 * ever has its materialization timestamp flipped. Keeping it here also leaves
 * `AuditRepository` under the file-size gate honestly rather than with a
 * suppression.
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { audits, auditSnapshots } from "@/db/schema";

/**
 * Seal the immutable snapshot for a completed audit. Called only from the
 * finalize boundary, so a running or failed audit never gets a row. One snapshot
 * per audit, so a retry re-seals to the same record instead of a second baseline.
 */
async function sealSnapshot(input: {
  auditId: string;
  projectId: string;
  targetId: string;
  pagesCrawled: number;
  edgeCount: number;
  lighthouseCount: number;
  pagesRedirected: number;
  pagesBroken: number;
  pagesBlocked: number;
  pagesNoindex: number;
}) {
  // Spread, not a field-by-field copy: `input` is exactly the row minus the
  // generated id and `sealed_at`, so restating each key would only create a
  // place for the two lists to drift apart.
  await db
    .insert(auditSnapshots)
    .values({ id: crypto.randomUUID(), ...input })
    // A re-seal keeps the first row. The counters derive from the same cached
    // crawl steps, so a replay writes identical numbers anyway — and the
    // snapshot is meant to be immutable.
    .onConflictDoNothing({ target: auditSnapshots.auditId });
}

async function markSnapshotIssuesMaterialized(auditId: string) {
  await db
    .update(auditSnapshots)
    .set({ issuesMaterializedAt: new Date().toISOString() })
    .where(eq(auditSnapshots.auditId, auditId));
}

/**
 * Reset a snapshot to "not materialized" before its issues are rewritten.
 *
 * Re-materialization deletes the old issues before inserting the new ones. If
 * the write fails in between and this timestamp still held the *previous*
 * run's success, the audit would read as "materialized, no issues" — a clean
 * bill of health for a crawl whose issues had just been deleted. Clearing
 * first makes the failure honest: null means nobody has answered the question.
 */
async function clearSnapshotIssuesMaterialized(auditId: string) {
  await db
    .update(auditSnapshots)
    .set({ issuesMaterializedAt: null })
    .where(eq(auditSnapshots.auditId, auditId));
}

/** The sealed snapshot for an audit, or null while it is running/failed. */
async function getSnapshotForAudit(auditId: string) {
  const row = await db.query.auditSnapshots.findFirst({
    where: eq(auditSnapshots.auditId, auditId),
  });
  return row ?? null;
}

/**
 * Every sealed snapshot for a target, newest first — the candidate baselines a
 * comparison can pick from. Joined to `audits` only for the human-facing crawl
 * completion date. `issuesMaterializedAt` rides along so the caller can refuse
 * to compare against a snapshot whose issues were never materialized.
 */
async function listSealedSnapshotsForTarget(targetId: string) {
  return db
    .select({
      auditId: auditSnapshots.auditId,
      projectId: auditSnapshots.projectId,
      targetId: auditSnapshots.targetId,
      sealedAt: auditSnapshots.sealedAt,
      issuesMaterializedAt: auditSnapshots.issuesMaterializedAt,
      pagesCrawled: auditSnapshots.pagesCrawled,
      completedAt: audits.completedAt,
    })
    .from(auditSnapshots)
    .innerJoin(audits, eq(auditSnapshots.auditId, audits.id))
    .where(eq(auditSnapshots.targetId, targetId))
    .orderBy(desc(auditSnapshots.sealedAt));
}

export const AuditSnapshotRepository = {
  sealSnapshot,
  getSnapshotForAudit,
  listSealedSnapshotsForTarget,
  markSnapshotIssuesMaterialized,
  clearSnapshotIssuesMaterialized,
} as const;
