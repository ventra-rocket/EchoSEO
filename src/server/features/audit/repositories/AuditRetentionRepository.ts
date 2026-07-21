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
import { db } from "@/db";
import {
  audits,
  auditLighthouseResults,
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

/** Delete audits by id; cascade removes pages/issues/edges/lighthouse/snapshot/exports/screenshots. */
async function deleteAuditsByIds(auditIds: string[]): Promise<void> {
  for (const batch of chunk(auditIds, MAX_BOUND_PARAMS)) {
    await db.delete(audits).where(inArray(audits.id, batch));
  }
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
  deleteAuditsByIds,
} as const;
