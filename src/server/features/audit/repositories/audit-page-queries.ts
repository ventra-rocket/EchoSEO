/**
 * Page-row reads that only one feature needs, kept out of `AuditRepository` for
 * the same reason `command-center-audit-queries.ts` is: that file is the shared
 * audit data layer and has a 400-line ceiling, so a read with a single caller
 * lives beside it rather than inside it.
 */
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLinkEdges, auditPages } from "@/db/schema";

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

/**
 * One page of the crawl's internal-link edges, ordered by id.
 *
 * Paged rather than returned whole, and keyset rather than OFFSET. The link graph
 * is the largest artefact a crawl produces — a 5,000-page crawl of a nav-heavy
 * site stores ~500,000 rows — and reading them in one statement put roughly
 * 120 MB into a 128 MB isolate: measured on production 14/08, materialization
 * succeeded at ~106,000 edges and died inside its own try/catch at ~500,000,
 * leaving the crawl sealed with no findings at all.
 *
 * `afterId` is exclusive. The caller loops until fewer than `limit` rows come
 * back.
 */
export async function listLinkEdgePage(
  auditId: string,
  afterId: number,
  limit: number,
) {
  return db
    .select()
    .from(auditLinkEdges)
    .where(
      and(eq(auditLinkEdges.auditId, auditId), gt(auditLinkEdges.id, afterId)),
    )
    .orderBy(asc(auditLinkEdges.id))
    .limit(limit);
}

/**
 * Record that issues have been materialized for a sealed snapshot. Readers use
 * this to tell "no issues found" apart from "not materialized".
 */
