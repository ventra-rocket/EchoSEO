/**
 * Page-row reads that only one feature needs, kept out of `AuditRepository` for
 * the same reason `command-center-audit-queries.ts` is: that file is the shared
 * audit data layer and has a 400-line ceiling, so a read with a single caller
 * lives beside it rather than inside it.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
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
 * Inbound link counts per target URL, aggregated in SQL.
 *
 * Replaces reading the edge list. The link graph is the largest thing a crawl
 * produces — a 5,000-page crawl of a nav-heavy site stores ~500,000 edges — and
 * the two aggregates the cross-page rules need are both far smaller than that.
 * Measured on production 14/08: loading all edges put ~120 MB in a 128 MB isolate
 * and died in 4 seconds; streaming them in 25,000-row pages survived the memory
 * but spent 54 seconds on twenty round trips and still lost the step. This
 * returns one row per distinct target URL — thousands, not hundreds of thousands.
 *
 * The count is `count(distinct source_url)` per *raw* target URL, so a document
 * linked as both `/a` and `/a/` comes back as two rows the caller merges. Merging
 * sums, which can over-count a source that links one document under two
 * spellings — acceptable here and nowhere else, because `inboundInternalLinks` is
 * consumed only as zero-versus-non-zero (`rules/cross-page.ts:101`, and the
 * evidence field on the orphan rule where the value is zero by definition).
 * Summing cannot turn a zero into a non-zero or the reverse.
 */
export async function listInboundCountsByTarget(auditId: string) {
  return db
    .select({
      targetUrl: auditLinkEdges.targetUrl,
      sources: sql<number>`count(distinct ${auditLinkEdges.sourceUrl})`,
    })
    .from(auditLinkEdges)
    .where(eq(auditLinkEdges.auditId, auditId))
    .groupBy(auditLinkEdges.targetUrl);
}

/**
 * The edges pointing at specific target URLs — used for the broken-link rule,
 * which needs the actual target strings but only for targets that resolve to a
 * 4xx page. Those are a small subset of the graph, so this stays bounded even on
 * a site where many links are broken.
 *
 * Chunked at 90 bound parameters: D1 rejects a statement over 100.
 */
export async function listEdgesToTargets(
  auditId: string,
  targetUrls: string[],
) {
  if (targetUrls.length === 0) return [];
  const rows: Array<{ sourceUrl: string; targetUrl: string }> = [];
  for (let i = 0; i < targetUrls.length; i += MAX_BOUND_PARAMS) {
    const chunk = targetUrls.slice(i, i + MAX_BOUND_PARAMS);
    rows.push(
      ...(await db
        .select({
          sourceUrl: auditLinkEdges.sourceUrl,
          targetUrl: auditLinkEdges.targetUrl,
        })
        .from(auditLinkEdges)
        .where(
          and(
            eq(auditLinkEdges.auditId, auditId),
            inArray(auditLinkEdges.targetUrl, chunk),
          ),
        )),
    );
  }
  return rows;
}

/**
 * Record that issues have been materialized for a sealed snapshot. Readers use
 * this to tell "no issues found" apart from "not materialized".
 */
