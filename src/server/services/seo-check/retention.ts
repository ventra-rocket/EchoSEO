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

  // Purge R2 first so a payload is never left with no row pointing at it. If
  // this throws we still delete the rows below: an orphaned object holds only
  // the audited URL and is logged here for manual cleanup, whereas keeping the
  // rows would retain the email — the PII retention exists to remove. Failing
  // closed on a transient R2 error would mean never deleting anyone's data.
  try {
    await deleteDeepReports(keys);
  } catch (error) {
    console.error(
      `free-seo-check: retention could not purge R2 payloads, orphaning ${keys.length} object(s): ${keys.join(", ")}`,
      error,
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
