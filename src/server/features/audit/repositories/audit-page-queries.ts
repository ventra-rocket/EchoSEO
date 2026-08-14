/**
 * Page-row reads that only one feature needs, kept out of `AuditRepository` for
 * the same reason `command-center-audit-queries.ts` is: that file is the shared
 * audit data layer and has a 400-line ceiling, so a read with a single caller
 * lives beside it rather than inside it.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditPages } from "@/db/schema";

/** D1 rejects a statement over 100 bound parameters. */
const MAX_BOUND_PARAMS = 90;

/**
 * Full page rows for specific URLs of one audit.
 *
 * Distinct from `getPageFactsForAudit`, which is a lean projection for the
 * page-fact diff. The competitor comparison needs whole rows because it re-runs
 * the rule engine over `toOnPageSignals(row)` — the same call the issue
 * materializer makes — so that our side of the table and theirs are judged by
 * one function rather than two that merely look alike.
 *
 * Chunked at `MAX_BOUND_PARAMS`: D1 rejects a statement over 100.
 */
export async function getPagesByUrls(auditId: string, urls: string[]) {
  if (urls.length === 0) return [];
  const rows: Array<typeof auditPages.$inferSelect> = [];
  for (let i = 0; i < urls.length; i += MAX_BOUND_PARAMS) {
    const chunk = urls.slice(i, i + MAX_BOUND_PARAMS);
    rows.push(
      ...(await db
        .select()
        .from(auditPages)
        .where(
          and(eq(auditPages.auditId, auditId), inArray(auditPages.url, chunk)),
        )),
    );
  }
  return rows;
}
