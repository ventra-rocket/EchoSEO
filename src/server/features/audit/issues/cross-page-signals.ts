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
import type { auditLinkEdges } from "@/db/audit.schema";
import { urlEquivalenceKey } from "@/server/lib/audit/url-identity";
import type { CrossPageSignals } from "@/server/lib/audit/rules/cross-page";
import type { AuditPageRow } from "@/server/features/audit/issues/snapshot-signals";

type LinkEdgeRow = typeof auditLinkEdges.$inferSelect;

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
 * The two aggregates the cross-page rules actually need from the link graph,
 * plus the page index both are keyed against.
 *
 * Built incrementally on purpose. The graph is by far the largest thing a crawl
 * produces — a 5,000-page crawl of a nav-heavy site stores ~500,000 edges — and
 * loading them all to compute two small tables put ~120 MB in a 128 MB isolate.
 * Measured on production 14/08: at ~106,000 edges materialization succeeded, at
 * ~500,000 it died inside the step's own try/catch, so the crawl sealed with
 * `issues_materialized_at` left null and the audit had no findings at all.
 *
 * Both aggregates are bounded by page count, not edge count: inbound sources are
 * one entry per target page, and broken targets only exist for edges pointing at
 * a 4xx page. So the caller can feed edges in chunks and hold only one chunk.
 */
export interface LinkGraph {
  pageByKey: Map<string, AuditPageRow>;
  /** Distinct source pages per target key. */
  inboundSourcesByKey: Map<string, Set<string>>;
  /** Target URLs, as written, that resolve to a 4xx page, per source key. */
  brokenBySourceKey: Map<string, string[]>;
}

export function createLinkGraph(pages: AuditPageRow[]): LinkGraph {
  const pageByKey = new Map<string, AuditPageRow>();
  for (const page of pages) {
    const key = urlEquivalenceKey(page.url);
    if (key) pageByKey.set(key, page);
  }
  return {
    pageByKey,
    inboundSourcesByKey: new Map(),
    brokenBySourceKey: new Map(),
  };
}

/** Fold one chunk of edges into the graph. Safe to call repeatedly. */
export function addEdgesToLinkGraph(
  graph: LinkGraph,
  edges: LinkEdgeRow[],
): void {
  for (const edge of edges) {
    const sourceKey = urlEquivalenceKey(edge.sourceUrl);
    const targetKey = urlEquivalenceKey(edge.targetUrl);
    if (!sourceKey || !targetKey) continue;

    // A link to a different spelling of the same document is not an inbound
    // link, and is not a broken one either.
    if (sourceKey === targetKey) continue;

    const sources =
      graph.inboundSourcesByKey.get(targetKey) ?? new Set<string>();
    sources.add(sourceKey);
    graph.inboundSourcesByKey.set(targetKey, sources);

    const targetPage = graph.pageByKey.get(targetKey);
    if (targetPage && isBrokenStatus(targetPage.statusCode)) {
      const targets = graph.brokenBySourceKey.get(sourceKey) ?? [];
      targets.push(edge.targetUrl);
      graph.brokenBySourceKey.set(sourceKey, targets);
    }
  }
}

export function buildCrossPageSignals(input: {
  pages: AuditPageRow[];
  graph: LinkGraph;
  startUrl: string;
  /** The crawl stopped because it hit its page cap, so the graph is partial. */
  crawlWasTruncated: boolean;
}): CrossPageSignalsForPage[] {
  const { pageByKey, inboundSourcesByKey, brokenBySourceKey } = input.graph;

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
        inboundInternalLinks: key
          ? (inboundSourcesByKey.get(key)?.size ?? 0)
          : 0,
        brokenLinkTargets: key ? (brokenBySourceKey.get(key) ?? []) : [],
        orphanDetectionReliable,
        sitemapAvailable,
      },
    };
  });
}
