/**
 * Data access for the daily audit retention sweep: aging out export artifacts,
 * terminalizing stuck export builds, and purging crawls past their target's
 * retention window.
 *
 * Timestamp formats matter here. `expiresAt` is written by the service as ISO, so
 * it is compared against an ISO cutoff. `createdAt` and `audit_snapshots.sealedAt`
 * are D1 `current_timestamp` (`YYYY-MM-DD HH:MM:SS`), so they are compared against
 * SQLite-format cutoffs — `sealedAt` via SQLite's own `datetime('now', …)` so the
 * per-target window arithmetic stays in one comparable format.
 *
 * Every `inArray` over a candidate id set is chunked: D1 rejects a statement with
 * more than 100 bound parameters, so a single sweep of 200 audits or 500 exports
 * would otherwise fail whole — and `sweepAuditRetention` swallows it, so the
 * backlog would silently never drain.
 */
import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "@/db";
import {
  audits,
  auditIssueOccurrences,
  auditIssueRollups,
  auditLighthouseResults,
  auditLinkEdges,
  auditPages,
  auditSnapshots,
  auditTargets,
} from "@/db/audit.schema";
import { auditExportJobs } from "@/db/audit-export.schema";
import { auditScreenshots } from "@/db/audit-screenshot.schema";

const MAX_BOUND_PARAMS = 90;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Ready export artifacts whose download window has closed. */
async function findExpiredExports(
  nowIso: string,
  limit: number,
): Promise<Array<{ id: string; r2Key: string }>> {
  const rows = await db
    .select({ id: auditExportJobs.id, r2Key: auditExportJobs.r2Key })
    .from(auditExportJobs)
    .where(
      and(
        eq(auditExportJobs.status, "ready"),
        isNotNull(auditExportJobs.r2Key),
        isNotNull(auditExportJobs.expiresAt),
        lt(auditExportJobs.expiresAt, nowIso),
      ),
    )
    .limit(limit);
  // r2Key is filtered not-null above; narrow for the caller.
  return rows.flatMap((row) =>
    row.r2Key ? [{ id: row.id, r2Key: row.r2Key }] : [],
  );
}

async function markExportsExpired(ids: string[]): Promise<void> {
  for (const batch of chunk(ids, MAX_BOUND_PARAMS)) {
    await db
      .update(auditExportJobs)
      // Drop the key too: the object is gone, so nothing should point at it.
      .set({ status: "expired", r2Key: null })
      .where(inArray(auditExportJobs.id, batch));
  }
}

/** Export builds stuck queued/processing past the stale cutoff. */
async function findStaleActiveExportIds(
  sqliteCutoff: string,
  limit: number,
): Promise<string[]> {
  const rows = await db
    .select({ id: auditExportJobs.id })
    .from(auditExportJobs)
    .where(
      and(
        inArray(auditExportJobs.status, ["queued", "processing"]),
        lt(auditExportJobs.createdAt, sqliteCutoff),
      ),
    )
    .limit(limit);
  return rows.map((row) => row.id);
}

async function markExportsFailed(
  ids: string[],
  message: string,
): Promise<void> {
  for (const batch of chunk(ids, MAX_BOUND_PARAMS)) {
    await db
      .update(auditExportJobs)
      .set({ status: "failed", errorMessage: message })
      .where(inArray(auditExportJobs.id, batch));
  }
}

/**
 * Audits whose sealed crawl is older than their target's retention window. The
 * cutoff is per row — each target may set its own `retentionDays` — so it is
 * computed in SQL against `datetime('now')`, which shares `sealedAt`'s format.
 */
async function findAuditIdsPastRetention(limit: number): Promise<string[]> {
  const rows = await db
    .select({ auditId: auditSnapshots.auditId })
    .from(auditSnapshots)
    .innerJoin(auditTargets, eq(auditSnapshots.targetId, auditTargets.id))
    .where(
      sql`${auditSnapshots.sealedAt} < datetime('now', '-' || ${auditTargets.retentionDays} || ' days')`,
    )
    .limit(limit);
  return rows.map((row) => row.auditId);
}

/** Export artifact keys belonging to the given audits, to purge before delete. */
async function findExportKeysForAudits(auditIds: string[]): Promise<string[]> {
  const keys: string[] = [];
  for (const batch of chunk(auditIds, MAX_BOUND_PARAMS)) {
    const rows = await db
      .select({ r2Key: auditExportJobs.r2Key })
      .from(auditExportJobs)
      .where(
        and(
          inArray(auditExportJobs.auditId, batch),
          isNotNull(auditExportJobs.r2Key),
        ),
      );
    for (const row of rows) if (row.r2Key) keys.push(row.r2Key);
  }
  return keys;
}

/**
 * Lighthouse payload keys belonging to the given audits. These live in R2 too
 * and the cascade only removes their D1 rows, so they must be purged before the
 * audit is deleted or they orphan permanently.
 */
async function findLighthouseKeysForAudits(
  auditIds: string[],
): Promise<string[]> {
  const keys: string[] = [];
  for (const batch of chunk(auditIds, MAX_BOUND_PARAMS)) {
    const rows = await db
      .select({ r2Key: auditLighthouseResults.r2Key })
      .from(auditLighthouseResults)
      .where(
        and(
          inArray(auditLighthouseResults.auditId, batch),
          isNotNull(auditLighthouseResults.r2Key),
        ),
      );
    for (const row of rows) if (row.r2Key) keys.push(row.r2Key);
  }
  return keys;
}

/**
 * Screenshot rows whose capture is older than the retention window. `capturedAt`
 * is written by the service as ISO, so it is compared against an ISO cutoff (the
 * same format contract as `expiresAt`).
 */
async function findExpiredScreenshots(
  cutoffIso: string,
  limit: number,
): Promise<Array<{ id: string; r2Key: string | null }>> {
  return db
    .select({ id: auditScreenshots.id, r2Key: auditScreenshots.r2Key })
    .from(auditScreenshots)
    .where(lt(auditScreenshots.capturedAt, cutoffIso))
    .limit(limit);
}

async function deleteScreenshotsByIds(ids: string[]): Promise<void> {
  for (const batch of chunk(ids, MAX_BOUND_PARAMS)) {
    await db
      .delete(auditScreenshots)
      .where(inArray(auditScreenshots.id, batch));
  }
}

/**
 * Screenshot object keys belonging to the given audits. These live in R2 too and
 * the cascade only removes their D1 rows, so they must be purged before the
 * audit is deleted or they orphan permanently. Failed captures have a null key.
 */
async function findScreenshotKeysForAudits(
  auditIds: string[],
): Promise<string[]> {
  const keys: string[] = [];
  for (const batch of chunk(auditIds, MAX_BOUND_PARAMS)) {
    const rows = await db
      .select({ r2Key: auditScreenshots.r2Key })
      .from(auditScreenshots)
      .where(
        and(
          inArray(auditScreenshots.auditId, batch),
          isNotNull(auditScreenshots.r2Key),
        ),
      );
    for (const row of rows) if (row.r2Key) keys.push(row.r2Key);
  }
  return keys;
}

/**
 * Delete rows of one child table for one audit, `batch` at a time.
 *
 * Keyed on `rowid` rather than the primary key so it works for both the text-id
 * tables and the integer-id edge table, and expressed as a subquery so the batch
 * size never becomes a bound-parameter count.
 *
 * The iteration cap is a cron guard, not arithmetic: this runs unattended, and a
 * loop that cannot make progress must stop and be visible rather than spin.
 */
const MAX_DELETE_ITERATIONS = 500;

async function deleteByAuditIdBatched(
  table: SQLiteTable,
  auditId: string,
  batch: number,
): Promise<void> {
  for (let i = 0; i < MAX_DELETE_ITERATIONS; i++) {
    const result = await db.run(sql`
      delete from ${table}
      where rowid in (
        select rowid from ${table} where audit_id = ${auditId} limit ${batch}
      )
    `);
    if ((result.meta?.changes ?? 0) === 0) return;
  }
  throw new Error(
    `Retention delete for audit ${auditId} did not finish in ${MAX_DELETE_ITERATIONS} batches`,
  );
}

/**
 * Rows deleted per statement while unwinding one audit.
 *
 * Measured against production D1 on 14/08 while cleaning up the Phase 05
 * measurement data: deleting ~500,000 link edges in one statement returned
 * `D1 DB exceeded its CPU time limit and was reset` (code 7429), and so did 5,000
 * page rows. 60,000 edges per statement went through; 1,000 page rows went
 * through. These sit under both, because a page row carries JSON columns and is
 * far heavier than an edge.
 */
const EDGE_DELETE_BATCH = 25_000;
const ROW_DELETE_BATCH = 500;

/**
 * Delete one audit and everything hanging off it, in bounded statements.
 *
 * `DELETE FROM audits WHERE id IN (...)` and letting the cascade run is what this
 * replaces. It reads as one small statement and is not: a 5,000-page crawl of a
 * link-dense site cascades ~500,000 edge rows, and D1 resets the connection with
 * a CPU-limit error long before that finishes. Proven by hand on 14/08 — the
 * cleanup that motivated this needed 32 batched statements for the edges alone.
 *
 * Why it matters that this failed quietly: `sweepAuditRetention` wraps each part
 * in a try/catch that logs and returns 0, and the R2 objects are purged BEFORE the
 * rows. A failure therefore destroyed the Lighthouse payloads and screenshots,
 * kept every D1 row, and printed a line indistinguishable from a night with
 * nothing to sweep — every night, forever.
 *
 * Ordered children-first so a failure part-way leaves the audit row present and
 * the sweep able to resume, rather than orphaning children whose parent is gone.
 */
async function deleteAuditCascade(auditId: string): Promise<void> {
  await deleteByAuditIdBatched(auditLinkEdges, auditId, EDGE_DELETE_BATCH);
  await deleteByAuditIdBatched(
    auditIssueOccurrences,
    auditId,
    ROW_DELETE_BATCH,
  );
  await deleteByAuditIdBatched(auditIssueRollups, auditId, ROW_DELETE_BATCH);
  await deleteByAuditIdBatched(
    auditLighthouseResults,
    auditId,
    ROW_DELETE_BATCH,
  );
  await deleteByAuditIdBatched(auditScreenshots, auditId, ROW_DELETE_BATCH);
  await deleteByAuditIdBatched(auditExportJobs, auditId, ROW_DELETE_BATCH);
  // Pages last among the children: `audit_lighthouse_results` and
  // `audit_issue_occurrences` both cascade from a page too, so clearing them
  // first keeps each page delete cheap instead of dragging its own cascade.
  await deleteByAuditIdBatched(auditPages, auditId, ROW_DELETE_BATCH);
  await db.delete(auditSnapshots).where(eq(auditSnapshots.auditId, auditId));
  await db.delete(audits).where(eq(audits.id, auditId));
}

export const AuditRetentionRepository = {
  findExpiredExports,
  markExportsExpired,
  findStaleActiveExportIds,
  markExportsFailed,
  findAuditIdsPastRetention,
  findExportKeysForAudits,
  findLighthouseKeysForAudits,
  findExpiredScreenshots,
  deleteScreenshotsByIds,
  findScreenshotKeysForAudits,
  deleteAuditCascade,
} as const;
