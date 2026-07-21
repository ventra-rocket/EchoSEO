/**
 * Daily retention sweep for the professional Site Audit, run on the shared
 * `0 3 * * *` cron next to the free-checker sweep.
 *
 * Four things age out, on different clocks:
 *  - a ready export artifact, 7 days after it was built;
 *  - an export build stuck queued/processing, 1 hour after it started;
 *  - an evidence screenshot, 30 days after it was captured;
 *  - a completed crawl, once its snapshot is older than the target's retention
 *    window (default 90 days).
 *
 * Each part is independent and best-effort: a failure in one must not skip the
 * others, since each removes data past its own deadline. R2 objects are purged
 * before the D1 rows so a payload is never left with no row pointing at it; an R2
 * failure is logged, not rethrown, because keeping the rows would retain data the
 * sweep exists to remove.
 */
import { AuditRetentionRepository } from "@/server/features/audit/repositories/AuditRetentionRepository";
import {
  auditExportKey,
  deleteAuditExports,
} from "@/server/features/audit/exports/audit-export-store";
import { deleteAuditScreenshots } from "@/server/features/audit/evidence/audit-screenshot-store";

/** Export artifacts per run. Idempotent + daily, so a backlog drains over days. */
const MAX_EXPORTS_PER_SWEEP = 500;
/** Screenshots per run. Idempotent + daily, so a backlog drains over days. */
const MAX_SCREENSHOTS_PER_SWEEP = 500;
/** Audits per run — each delete cascades pages/issues/lighthouse/etc. */
const MAX_AUDITS_PER_SWEEP = 200;
/** A build still queued/processing this long after it started is wedged. */
const STALE_BUILD_HOURS = 1;
/** An evidence screenshot is kept this long after it was captured. */
const SCREENSHOT_RETENTION_DAYS = 30;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Renders `YYYY-MM-DD HH:MM:SS` to match D1's `current_timestamp` columns
 * (`created_at`). Bytewise TEXT comparison: `' '` sorts below `'T'`, so an ISO
 * cutoff would misjudge same-day rows — `created_at` therefore keeps this format.
 */
function toSqliteTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

interface AuditRetentionSweepResult {
  exportsExpired: number;
  buildsTerminalized: number;
  screenshotsExpired: number;
  auditsPurged: number;
}

async function part<T>(
  name: string,
  run: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[cron] audit retention: ${name} failed`, error);
    return fallback;
  }
}

export async function sweepAuditRetention(
  now: Date = new Date(),
): Promise<AuditRetentionSweepResult> {
  const exportsExpired = await part(
    "expire-exports",
    () => expireReadyExports(now),
    0,
  );
  const buildsTerminalized = await part(
    "terminalize-builds",
    () => terminalizeStaleBuilds(now),
    0,
  );
  const screenshotsExpired = await part(
    "expire-screenshots",
    () => expireStaleScreenshots(now),
    0,
  );
  const auditsPurged = await part("purge-audits", purgeAuditsPastRetention, 0);

  if (
    exportsExpired === 0 &&
    buildsTerminalized === 0 &&
    screenshotsExpired === 0 &&
    auditsPurged === 0
  ) {
    // Say so: a sweep that stops running looks exactly like one with nothing to
    // do, and the difference is data kept past its deadline.
    console.log("[cron] audit retention: nothing to sweep");
  } else {
    console.log(
      `[cron] audit retention: expired ${exportsExpired} export(s), terminalized ${buildsTerminalized} build(s), expired ${screenshotsExpired} screenshot(s), purged ${auditsPurged} audit(s)`,
    );
  }

  return {
    exportsExpired,
    buildsTerminalized,
    screenshotsExpired,
    auditsPurged,
  };
}

/** A: ready exports past their 7-day window — purge R2, then mark expired. */
async function expireReadyExports(now: Date): Promise<number> {
  const expired = await AuditRetentionRepository.findExpiredExports(
    now.toISOString(),
    MAX_EXPORTS_PER_SWEEP,
  );
  if (expired.length === 0) return 0;

  const orphaned = await deleteAuditExports(expired.map((row) => row.r2Key));
  if (orphaned.length > 0) {
    console.error(
      `[cron] audit retention: could not purge ${orphaned.length} export object(s): ${orphaned.join(", ")}`,
    );
  }

  await AuditRetentionRepository.markExportsExpired(
    expired.map((row) => row.id),
  );
  return expired.length;
}

/** B: export builds wedged in queued/processing past the stale cutoff. */
async function terminalizeStaleBuilds(now: Date): Promise<number> {
  const cutoff = toSqliteTimestamp(
    new Date(now.getTime() - STALE_BUILD_HOURS * HOUR_MS),
  );
  const ids = await AuditRetentionRepository.findStaleActiveExportIds(
    cutoff,
    MAX_EXPORTS_PER_SWEEP,
  );
  if (ids.length === 0) return 0;

  // A build that wrote its object and died before markReady leaves a derivable
  // key no other part will ever collect (its row's r2Key is still null). Purge
  // it best-effort before terminalizing; deleting a never-written key is a no-op.
  const orphaned = await deleteAuditExports(ids.map(auditExportKey));
  if (orphaned.length > 0) {
    console.error(
      `[cron] audit retention: could not purge ${orphaned.length} stale build object(s): ${orphaned.join(", ")}`,
    );
  }

  await AuditRetentionRepository.markExportsFailed(
    ids,
    "The export timed out before it finished.",
  );
  return ids.length;
}

/** D: evidence screenshots past their 30-day window — purge R2, then delete rows. */
async function expireStaleScreenshots(now: Date): Promise<number> {
  const cutoff = new Date(
    now.getTime() - SCREENSHOT_RETENTION_DAYS * DAY_MS,
  ).toISOString();
  const expired = await AuditRetentionRepository.findExpiredScreenshots(
    cutoff,
    MAX_SCREENSHOTS_PER_SWEEP,
  );
  if (expired.length === 0) return 0;

  // Failed captures carry a null key and have no object to purge.
  const keys = expired.flatMap((row) => (row.r2Key ? [row.r2Key] : []));
  if (keys.length > 0) {
    const orphaned = await deleteAuditScreenshots(keys);
    if (orphaned.length > 0) {
      console.error(
        `[cron] audit retention: could not purge ${orphaned.length} screenshot object(s): ${orphaned.join(", ")}`,
      );
    }
  }

  await AuditRetentionRepository.deleteScreenshotsByIds(
    expired.map((row) => row.id),
  );
  return expired.length;
}

/** C: completed crawls older than their target's retention — purge R2, delete. */
async function purgeAuditsPastRetention(): Promise<number> {
  const auditIds =
    await AuditRetentionRepository.findAuditIdsPastRetention(
      MAX_AUDITS_PER_SWEEP,
    );
  if (auditIds.length === 0) return 0;

  // The export ZIPs, the per-page Lighthouse payloads and the evidence
  // screenshots all live in R2 and are only referenced by rows the cascade is
  // about to remove — purge them first or they orphan permanently.
  const [exportKeys, lighthouseKeys, screenshotKeys] = await Promise.all([
    AuditRetentionRepository.findExportKeysForAudits(auditIds),
    AuditRetentionRepository.findLighthouseKeysForAudits(auditIds),
    AuditRetentionRepository.findScreenshotKeysForAudits(auditIds),
  ]);
  const keys = [...exportKeys, ...lighthouseKeys, ...screenshotKeys];
  if (keys.length > 0) {
    const orphaned = await deleteAuditExports(keys);
    if (orphaned.length > 0) {
      console.error(
        `[cron] audit retention: could not purge ${orphaned.length} R2 object(s) for expired audit(s): ${orphaned.join(", ")}`,
      );
    }
  }

  await AuditRetentionRepository.deleteAuditsByIds(auditIds);
  return auditIds.length;
}
