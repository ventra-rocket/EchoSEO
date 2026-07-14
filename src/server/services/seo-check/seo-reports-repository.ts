/**
 * D1 access for Free Deep SEO Checker report snapshots.
 *
 * Slice 1 only drives the status machine to `queued`. The Slice 2 Workflow adds
 * the running -> done|failed transitions plus the R2 payload key.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { seoReports } from "@/db/schema";

export async function findReportByLeadId(
  leadId: string,
): Promise<typeof seoReports.$inferSelect | null> {
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
