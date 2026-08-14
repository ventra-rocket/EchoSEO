/**
 * Builds the whole-crawl signals the cross-page rules judge.
 *
 * The care here is all about not accusing a healthy page. Link edges store the
 * target URL **as written**, while pages store the URL the crawler **landed on**
 * after redirects, so a raw string join reports links as broken and pages as
 * orphaned purely because the site canonicalizes `www` or `http`. Both sides are
 * therefore resolved through the same equivalence key.
 *
 * Where that resolution still fails the two rules diverge, deliberately:
 * - A link target that resolves to no crawled page is **not** called broken. The
 *   crawler may have reached it under another URL, or not at all — unknown.
 * - Inbound links cannot be handled that way, because an unresolved edge is
 *   silently invisible to its target, which reads as "nothing links here". A
 *   path-level redirect (`/old` -> `/new`) therefore *can* still hide a real
 *   inbound link, which is why orphan detection is switched off entirely for
 *   crawls that cannot be trusted (see `orphanDetectionReliable`).
 */
import { urlEquivalenceKey } from "@/server/lib/audit/url-identity";
import type { CrossPageSignals } from "@/server/lib/audit/rules/cross-page";
import type { AuditPageRow } from "@/server/features/audit/issues/snapshot-signals";

/**
 * Statuses that make a link genuinely broken. Restricted to 4xx, which is what
 * the rule's Google citation covers, minus the codes that mean "you may not see
 * this" or "not right now" rather than "this is gone": a members-only page and a
 * rate-limited response are not broken links.
 */
const ACCESS_RESTRICTED_STATUSES = new Set([401, 403, 429]);

function isBrokenStatus(statusCode: number | null): boolean {
  if (statusCode === null) return false;
  if (ACCESS_RESTRICTED_STATUSES.has(statusCode)) return false;
  return statusCode >= 400 && statusCode < 500;
}

/**
 * Page and signals are returned paired rather than as parallel arrays, so the
 * caller cannot misattribute an occurrence to the wrong page id.
 */
interface CrossPageSignalsForPage {
  page: AuditPageRow;
  signals: CrossPageSignals;
}

/**
 * The two aggregates the cross-page rules need from the link graph.
 *
 * Built from SQL aggregates rather than from the edge list. A 5,000-page crawl of
 * a nav-heavy site stores ~500,000 edges; both of these are bounded by page count.
 * Measured on production 14/08: reading all edges put ~120 MB in a 128 MB isolate
 * and the materialize step died in 4 seconds, so the crawl sealed with
 * `issues_materialized_at` null and the audit had no findings at all. Streaming in
 * 25,000-row pages survived the memory and then lost the step anyway after 54
 * seconds of round trips.
 */
export interface LinkGraph {
  pageByKey: Map<string, AuditPageRow>;
  /** Inbound source count per target key, summed across URL spellings. */
  inboundByKey: Map<string, number>;
  /** Target URLs, as written, that resolve to a 4xx page, per source key. */
  brokenBySourceKey: Map<string, string[]>;
}

function buildPageIndex(pages: AuditPageRow[]): Map<string, AuditPageRow> {
  const pageByKey = new Map<string, AuditPageRow>();
  for (const page of pages) {
    const key = urlEquivalenceKey(page.url);
    if (key) pageByKey.set(key, page);
  }
  return pageByKey;
}

/** The crawled pages that returned a status the broken-link rule counts. */
export function brokenPageUrls(pages: AuditPageRow[]): string[] {
  return pages
    .filter((page) => isBrokenStatus(page.statusCode))
    .map((page) => page.url);
}

/**
 * Fold the SQL aggregates into the shape the rules read.
 *
 * `inboundCounts` is one row per raw target URL, so two spellings of one document
 * arrive separately and are summed here. Summing can over-count a source that
 * links the same document twice under different spellings — safe only because the
 * value is consumed as zero-versus-non-zero (`rules/cross-page.ts:101`) and shown
 * in evidence only on the orphan rule, where it is zero by definition.
 *
 * `brokenEdges` is already restricted to edges whose target resolves to a 4xx
 * page, so every row here becomes a broken-link finding on its source.
 */
export function buildLinkGraph(input: {
  pages: AuditPageRow[];
  inboundCounts: Array<{ targetUrl: string; sources: number }>;
  brokenEdges: Array<{ sourceUrl: string; targetUrl: string }>;
}): LinkGraph {
  const pageByKey = buildPageIndex(input.pages);

  const inboundByKey = new Map<string, number>();
  for (const row of input.inboundCounts) {
    const targetKey = urlEquivalenceKey(row.targetUrl);
    if (!targetKey) continue;
    inboundByKey.set(
      targetKey,
      (inboundByKey.get(targetKey) ?? 0) + row.sources,
    );
  }

  const brokenBySourceKey = new Map<string, string[]>();
  for (const edge of input.brokenEdges) {
    const sourceKey = urlEquivalenceKey(edge.sourceUrl);
    const targetKey = urlEquivalenceKey(edge.targetUrl);
    if (!sourceKey || !targetKey) continue;
    // A link to a different spelling of the same document is not a broken link.
    if (sourceKey === targetKey) continue;
    const targets = brokenBySourceKey.get(sourceKey) ?? [];
    targets.push(edge.targetUrl);
    brokenBySourceKey.set(sourceKey, targets);
  }

  return { pageByKey, inboundByKey, brokenBySourceKey };
}

export function buildCrossPageSignals(input: {
  pages: AuditPageRow[];
  graph: LinkGraph;
  startUrl: string;
  /** The crawl stopped because it hit its page cap, so the graph is partial. */
  crawlWasTruncated: boolean;
}): CrossPageSignalsForPage[] {
  const { pageByKey, inboundByKey, brokenBySourceKey } = input.graph;

  const startKey = urlEquivalenceKey(input.startUrl);
  // If the start URL never matched a crawled page it path-redirected somewhere
  // the key cannot follow, so the graph has no known root and the real entry
  // page would be reported as an orphan.
  const entryPointFound = startKey !== null && pageByKey.has(startKey);
  const orphanDetectionReliable = !input.crawlWasTruncated && entryPointFound;
  const sitemapAvailable = input.pages.some((page) => page.inSitemap);

  return input.pages.map((page) => {
    const key = urlEquivalenceKey(page.url);

    return {
      page,
      signals: {
        url: page.url,
        statusCode: page.statusCode ?? 0,
        responseTimeMs: page.responseTimeMs ?? 0,
        isHtml: page.isHtml,
        isIndexable: page.isIndexable,
        inSitemap: page.inSitemap,
        isCrawlEntryPoint: key !== null && key === startKey,
        inboundInternalLinks: key ? (inboundByKey.get(key) ?? 0) : 0,
        brokenLinkTargets: key ? (brokenBySourceKey.get(key) ?? []) : [],
        orphanDetectionReliable,
        sitemapAvailable,
      },
    };
  });
}
