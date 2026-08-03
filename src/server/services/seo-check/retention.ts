/**
 * Retention sweep for the Free Deep SEO Checker (runs on the daily cron).
 *
 * Two things age out, on different clocks and for different reasons:
 *  - a finished report + its lead, 30 days after the report finished;
 *  - a lead that never confirmed, 7 days after its confirm token expired —
 *    consent was never given, so there is no basis to keep the address, and its
 *    report sits in `confirming` forever where the first sweep can't see it.
 *
 * Both delete the lead, which cascades its reports; R2 payloads are purged
 * alongside. Windows are env-tunable (see deep-check-config).
 */
import { getRetentionWindows } from "./deep-check-config";
import { deleteDeepReports } from "./report-store";
import { sweepStaleLiteChecks } from "./check-store";
import { sweepStaleSiteScreenshots } from "./site-screenshot-store";
import {
  deleteLeadsByIds,
  findAbandonedLeadIds,
  findExpiredLeadIds,
  findReportKeysForLeads,
} from "./retention-repository";

/**
 * Must match the retention entry in wrangler.jsonc `triggers.crons`. The
 * scheduled handler is shared with rank tracking, which runs every 15 minutes —
 * this string is how the two are told apart.
 */
export const FREE_CHECK_RETENTION_CRON = "0 3 * * *";

/**
 * Leads per run. The sweep is idempotent and runs daily, so a backlog drains
 * over a few days rather than risking a cron that exceeds its limits and so
 * never deletes anything at all.
 */
const MAX_LEADS_PER_SWEEP = 500;

/**
 * Days a domain's page capture is kept without being re-viewed. Captures carry
 * no PII (a public homepage) and re-render on demand, so this only bounds
 * storage; it is deliberately longer than the 24h serve-cache so a domain
 * checked daily is never re-rendered by the sweep.
 */
const SITE_SCREENSHOT_RETENTION_DAYS = 7;

/**
 * Days a `/c/{id}` share snapshot stays readable. Matches the Deep report's
 * 30-day promise (the public pages state one number for both), but on its own
 * clock: snapshots are R2-only, lead-free, and write-once, so age is simply
 * the object's `uploaded` time.
 */
const LITE_CHECK_RETENTION_DAYS = 30;

interface RetentionSweepResult {
  expiredLeads: number;
  abandonedLeads: number;
  leadsDeleted: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBefore(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

/**
 * Renders `YYYY-MM-DD HH:MM:SS` to match the columns D1 fills with
 * `current_timestamp` (`finished_at`, `updated_at`).
 *
 * These comparisons are bytewise TEXT: `' '` sorts below `'T'`, so an ISO cutoff
 * would read every row from the cutoff's own date as older than it and delete it
 * up to a day early. `confirm_token_expires_at` is the exception — it is stored
 * as ISO, so it keeps an ISO cutoff.
 */
function toSqliteTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export async function sweepFreeCheckRetention(
  now: Date = new Date(),
): Promise<RetentionSweepResult> {
  // Independent of the lead sweep and best-effort: captures carry no PII, so a
  // failure here must never abort the run that deletes email addresses. It is
  // caught (not thrown) for exactly the reason the payload purge below is —
  // failing the cron would leave PII undeleted, which is the worse outcome.
  // Runs unconditionally, even on a day with no leads to expire.
  try {
    const purged = await sweepStaleSiteScreenshots(
      daysBefore(now, SITE_SCREENSHOT_RETENTION_DAYS),
    );
    if (purged > 0) {
      console.log(
        `[cron] free-seo-check retention: purged ${purged} stale capture(s)`,
      );
    }
  } catch (error) {
    console.error("free-seo-check: stale-capture sweep failed", error);
  }

  // Same isolation, same reason: share snapshots hold only public page data,
  // so a failure here must never abort the lead sweep below — that one deletes
  // email addresses, and skipping it is the worse outcome. Logs even when
  // nothing was purged: a sweep that only speaks when there is work is
  // indistinguishable from one that stopped running.
  try {
    const purged = await sweepStaleLiteChecks(
      daysBefore(now, LITE_CHECK_RETENTION_DAYS),
    );
    console.log(
      `[cron] free-seo-check retention: purged ${purged} stale check snapshot(s)`,
    );
  } catch (error) {
    console.error("free-seo-check: stale check-snapshot sweep failed", error);
  }

  const { reportRetentionDays, unconfirmedGraceDays } =
    await getRetentionWindows();

  const [expired, abandoned] = await Promise.all([
    // Compared against finished_at / updated_at — SQLite timestamp format.
    findExpiredLeadIds(
      toSqliteTimestamp(daysBefore(now, reportRetentionDays)),
      MAX_LEADS_PER_SWEEP,
    ),
    // Compared against confirm_token_expires_at — ISO, written by the handler.
    findAbandonedLeadIds(
      daysBefore(now, unconfirmedGraceDays).toISOString(),
      MAX_LEADS_PER_SWEEP,
    ),
  ]);

  // The two queries can name the same lead (a lead can hold both an expired
  // report and an unexpired token in odd states) — delete it once.
  const leadIds = [...new Set([...expired, ...abandoned])];
  if (leadIds.length === 0) {
    // Say so rather than returning silently: this is the only evidence the cron
    // fired at all. A retention sweep that stops running looks exactly like one
    // with nothing to do, and the difference is PII kept past its deadline.
    console.log("[cron] free-seo-check retention: nothing to sweep");
    return { expiredLeads: 0, abandonedLeads: 0, leadsDeleted: 0 };
  }

  const keys = await findReportKeysForLeads(leadIds);

  // Purge R2 first so a payload is never left with no row pointing at it. Keys
  // R2 refuses are reported, not rethrown: we still delete the rows below,
  // because an orphaned payload holds only the audited URL and is logged here
  // for manual cleanup, whereas keeping the rows would retain the email — the
  // PII retention exists to remove. Failing closed on a transient R2 error
  // would mean never deleting anyone's data.
  const orphaned = await deleteDeepReports(keys);
  if (orphaned.length > 0) {
    console.error(
      `free-seo-check: retention could not purge R2 payloads, orphaning ${orphaned.length} object(s): ${orphaned.join(", ")}`,
    );
  }

  const leadsDeleted = await deleteLeadsByIds(leadIds);
  console.log(
    `[cron] free-seo-check retention: deleted ${leadsDeleted} lead(s) — ${expired.length} expired, ${abandoned.length} abandoned; purged ${keys.length} payload(s)`,
  );

  return {
    expiredLeads: expired.length,
    abandonedLeads: abandoned.length,
    leadsDeleted,
  };
}
