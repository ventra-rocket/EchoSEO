/**
 * D1 queries for the Free Deep SEO Checker retention sweep.
 *
 * The delete unit is the **lead**, not the report: the email lives on `leads`,
 * and `seo_reports.lead_id` cascades — so removing the lead takes its reports
 * with it. Deleting only reports would leave the PII behind, which is the whole
 * thing retention exists to remove.
 *
 * Two timestamp formats live in these tables and must not be mixed up. Columns
 * written by `sql\`(current_timestamp)\`` (`finished_at`, `updated_at`) hold
 * SQLite's `YYYY-MM-DD HH:MM:SS`; `confirm_token_expires_at` is written from
 * `Date.toISOString()`. Comparison is bytewise TEXT, and `' ' < 'T'`, so an ISO
 * cutoff against a `current_timestamp` column silently matches every row from
 * the cutoff's own date — deleting up to a day early. Each query below states
 * which format its cutoff must be in.
 */
import {
  and,
  eq,
  exists,
  inArray,
  isNull,
  lt,
  notExists,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import { leads, seoReports } from "@/db/schema";
import { screenshotKey } from "./report-keys";

/**
 * D1 rejects a query with more than 100 bound parameters. The sweep collects
 * lead ids in bulk, so every `IN (...)` over them is chunked below this —
 * otherwise the first busy day throws and no data is ever deleted again.
 */
const MAX_BOUND_PARAMS = 90;

/** Sorts above any real timestamp, so an unsettled report always blocks. */
const NEVER_SETTLED = "9999-12-31 23:59:59";

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * When a report stopped being able to change — the clock retention runs on.
 *
 * - A report deduped onto a canonical one keeps its `queued` status and its
 *   NULL `finished_at` **forever** (it never runs; the reader resolves it via
 *   `canonical_report_id`). Its attach time is when it settled, so `updated_at`
 *   is its clock — without this branch its lead is blocked forever and a
 *   confirmed user's email is never deleted.
 * - A terminal report settled at `finished_at` — never `created_at`, or a report
 *   that took a week to run would get a week less life than an instant one.
 * - Anything else is still in flight and must never be swept, however old.
 *
 * A terminal report with a NULL `finished_at` shouldn't exist; it resolves to
 * the sentinel and is retained rather than guessed at.
 */
const settledAt = sql`coalesce(
  case
    when ${seoReports.canonicalReportId} is not null then ${seoReports.updatedAt}
    when ${seoReports.status} in ('done', 'failed', 'expired') then ${seoReports.finishedAt}
  end,
  ${NEVER_SETTLED}
)`;

/**
 * Leads whose every report has settled and aged past the cutoff.
 *
 * `cutoff` must be in `current_timestamp` format (see the module note) because
 * it is compared against `finished_at` / `updated_at`.
 *
 * The `exists` guard skips leads with no reports at all — `createLeadWithReport`
 * batches both inserts into one transaction, so such a row is a genuine anomaly,
 * not a mid-insert race, and sweeping it here would hide that.
 */
export async function findExpiredLeadIds(
  cutoff: string,
  limit: number,
): Promise<string[]> {
  const unsettledOrRecentReport = db
    .select({ one: sql`1` })
    .from(seoReports)
    .where(
      and(eq(seoReports.leadId, leads.id), sql`${settledAt} >= ${cutoff}`),
    );

  const anyReport = db
    .select({ one: sql`1` })
    .from(seoReports)
    .where(eq(seoReports.leadId, leads.id));

  const rows = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(exists(anyReport), notExists(unsettledOrRecentReport)))
    .limit(limit);
  return rows.map((row) => row.id);
}

/**
 * Leads that never confirmed, whose confirm token expired before the cutoff.
 *
 * `cutoff` must be an ISO string (see the module note) — `confirm_token_expires_at`
 * is written with `toISOString()`, unlike the `current_timestamp` columns above.
 *
 * These hold an email address for which consent was never given, and their
 * report sits in `confirming` forever — so the sweep above, which only acts on
 * settled reports, would keep them indefinitely. Without this the people who
 * never consented would be the only ones we kept forever.
 */
export async function findAbandonedLeadIds(
  cutoffIso: string,
  limit: number,
): Promise<string[]> {
  const rows = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        isNull(leads.consentConfirmedAt),
        lt(leads.confirmTokenExpiresAt, cutoffIso),
      ),
    )
    .limit(limit);
  return rows.map((row) => row.id);
}

/** R2 keys of every payload belonging to these leads, so R2 can be purged too. */
export async function findReportKeysForLeads(
  leadIds: string[],
): Promise<string[]> {
  const keys: string[] = [];
  for (const batch of chunk(leadIds, MAX_BOUND_PARAMS)) {
    const rows = await db
      .select({ id: seoReports.id, r2Key: seoReports.r2Key })
      .from(seoReports)
      .where(inArray(seoReports.leadId, batch));
    for (const row of rows) {
      if (row.r2Key !== null) keys.push(row.r2Key);
      // Unconditional: the screenshot is optional and its presence is not
      // tracked in D1, so the sweep always asks R2 to drop the derived key.
      // Deleting a key that was never written is a no-op — cheaper than a
      // column and a migration to record which reports happen to have one.
      keys.push(screenshotKey(row.id));
    }
  }
  return keys;
}

/** Deletes the leads; `seo_reports.lead_id` cascades their reports away. */
export async function deleteLeadsByIds(leadIds: string[]): Promise<number> {
  let deleted = 0;
  for (const batch of chunk(leadIds, MAX_BOUND_PARAMS)) {
    const rows = await db
      .delete(leads)
      .where(inArray(leads.id, batch))
      .returning({ id: leads.id });
    deleted += rows.length;
  }
  return deleted;
}
