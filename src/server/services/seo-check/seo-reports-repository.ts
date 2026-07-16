/**
 * D1 access for Free Deep SEO Checker report snapshots.
 *
 * Slice 1 only drives the status machine to `queued`. The Slice 2 Workflow adds
 * the running -> done|failed transitions plus the R2 payload key.
 */
import {
  and,
  asc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import { leads, seoReports } from "@/db/schema";

export type ReportRow = typeof seoReports.$inferSelect;

/** A report plus the confirmed address its "finished" email is owed to. */
export interface ReportEmailTarget {
  report: ReportRow;
  email: string;
}

export async function findReportById(id: string): Promise<ReportRow | null> {
  const [row] = await db
    .select()
    .from(seoReports)
    .where(eq(seoReports.id, id))
    .limit(1);
  return row ?? null;
}

export async function findReportByLeadId(
  leadId: string,
): Promise<ReportRow | null> {
  const [row] = await db
    .select()
    .from(seoReports)
    .where(eq(seoReports.leadId, leadId))
    .limit(1);
  return row ?? null;
}

/**
 * Compare-and-swap `confirming` -> `queued`. Returns true only for the caller
 * that actually made the transition, so the Deep audit is enqueued exactly once
 * even under a concurrent or retried confirm.
 */
export async function tryQueueConfirmingReport(id: string): Promise<boolean> {
  const rows = await db
    .update(seoReports)
    .set({ status: "queued", updatedAt: sql`(current_timestamp)` })
    .where(and(eq(seoReports.id, id), eq(seoReports.status, "confirming")))
    .returning({ id: seoReports.id });
  return rows.length === 1;
}

/**
 * Compensating CAS `queued` -> `confirming`, used when enqueueing the workflow
 * fails: it lets a retried confirm re-enqueue. It is a no-op once the workflow
 * has already moved the report to `running`, so it never clobbers a live run.
 */
export async function revertQueuedReportToConfirming(
  id: string,
): Promise<void> {
  await db
    .update(seoReports)
    .set({ status: "confirming", updatedAt: sql`(current_timestamp)` })
    .where(and(eq(seoReports.id, id), eq(seoReports.status, "queued")));
}

export async function markReportRunning(id: string): Promise<void> {
  await db
    .update(seoReports)
    .set({ status: "running", updatedAt: sql`(current_timestamp)` })
    .where(eq(seoReports.id, id));
}

export async function markReportDone(id: string, r2Key: string): Promise<void> {
  await db
    .update(seoReports)
    .set({
      status: "done",
      r2Key,
      error: null,
      finishedAt: sql`(current_timestamp)`,
      updatedAt: sql`(current_timestamp)`,
    })
    .where(eq(seoReports.id, id));
}

export async function markReportFailed(
  id: string,
  error: string,
): Promise<void> {
  await db
    .update(seoReports)
    .set({
      status: "failed",
      error,
      finishedAt: sql`(current_timestamp)`,
      updatedAt: sql`(current_timestamp)`,
    })
    // Never clobber a report that already reached `done` (its payload exists in
    // R2) — a `done` report has nothing to fail.
    .where(and(eq(seoReports.id, id), ne(seoReports.status, "done")));
}

/**
 * Claims the "check finished" email for this report, returning true only for the
 * caller that won. The Workflow and the cron sweep both try to send, so this CAS
 * is the only thing standing between a visitor and two copies of the same mail.
 *
 * Deliberately does not touch `updated_at`: retention measures a deduped row's
 * age from it (see retention-repository), so a send that fails and is retried
 * every few minutes would push the row's deletion further out on every attempt,
 * keeping the lead's address indefinitely. Email progress and retention must not
 * be able to starve each other.
 */
export async function tryClaimReportEmail(id: string): Promise<boolean> {
  const rows = await db
    .update(seoReports)
    .set({ emailSentAt: sql`(current_timestamp)` })
    .where(and(eq(seoReports.id, id), isNull(seoReports.emailSentAt)))
    .returning({ id: seoReports.id });
  return rows.length === 1;
}

/**
 * Hands the claim back after a send fails, so the next sweep retries it.
 *
 * The claim is taken before the send, which trades one risk for another: a crash
 * in the window between claiming and sending loses that email for good, whereas
 * claiming afterwards would let the Workflow and the sweep both send. A rare lost
 * mail on a channel that is only a convenience (the report page is the primary
 * one, and its link is already on screen at confirm time) beats a routine
 * duplicate.
 */
export async function releaseReportEmailClaim(id: string): Promise<void> {
  await db
    .update(seoReports)
    .set({ emailSentAt: null })
    .where(eq(seoReports.id, id));
}

/**
 * Reports that may be owed a "finished" email, oldest first.
 *
 * Candidates are unclaimed reports of confirmed leads that are either terminal
 * themselves or deduped onto another report — a follower keeps its `queued`
 * status forever, so its own status can never say whether it is ready. Whether a
 * follower's root has actually finished is settled by the caller, which resolves
 * the chain; SQL only narrows the field.
 *
 * The order is load-bearing, not cosmetic. Some candidates come back on every
 * run without being delivered (a follower whose canonical is still running), so
 * without an explicit order SQLite's arbitrary choice decides who gets the
 * limited batch, and a longest-waiting visitor could be passed over
 * indefinitely. Oldest first makes the queue fair and the backlog drain in a
 * predictable order.
 */
export async function findReportsAwaitingEmail(
  limit: number,
): Promise<ReportEmailTarget[]> {
  const rows = await db
    .select({ report: seoReports, email: leads.email })
    .from(seoReports)
    .innerJoin(leads, eq(leads.id, seoReports.leadId))
    .where(
      and(
        isNull(seoReports.emailSentAt),
        isNotNull(leads.consentConfirmedAt),
        or(
          inArray(seoReports.status, ["done", "failed"]),
          isNotNull(seoReports.canonicalReportId),
        ),
      ),
    )
    .orderBy(asc(seoReports.createdAt), asc(seoReports.id))
    .limit(limit);
  return rows;
}

/**
 * One report + the address it owes mail to, or null when it is not owed any:
 * unknown id, unclaimed consent, or an email already claimed.
 */
export async function findReportEmailTarget(
  id: string,
): Promise<ReportEmailTarget | null> {
  const [row] = await db
    .select({ report: seoReports, email: leads.email })
    .from(seoReports)
    .innerJoin(leads, eq(leads.id, seoReports.leadId))
    .where(
      and(
        eq(seoReports.id, id),
        isNull(seoReports.emailSentAt),
        isNotNull(leads.consentConfirmedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Records that a deduped report shares a canonical same-domain audit. The report
 * keeps its `queued` status and is resolved to the canonical's result lazily at
 * delivery time by following `canonical_report_id` (Phase 5) — there is no
 * fan-out, so no cross-report write race. The `queued` guard avoids overwriting
 * a row that has since moved on. Never runs its own PSI + crawl.
 */
export async function attachReportToCanonical(
  id: string,
  canonicalReportId: string,
): Promise<void> {
  await db
    .update(seoReports)
    .set({ canonicalReportId, updatedAt: sql`(current_timestamp)` })
    .where(and(eq(seoReports.id, id), eq(seoReports.status, "queued")));
}
