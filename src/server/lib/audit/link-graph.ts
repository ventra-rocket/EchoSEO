/**
 * Internal-link graph construction for the site audit snapshot.
 *
 * `StepPageResult.internalLinks` already holds normalized, same-origin absolute
 * URLs (the page analyzer resolves and filters them), so building the edge list
 * is dedupe + self-loop removal rather than another round of URL parsing.
 */
import type { StepPageResult } from "@/server/lib/audit/types";

export interface LinkEdge {
  sourceUrl: string;
  targetUrl: string;
}

/**
 * Build the deduped source -> target edge list for a crawl. A page linking to
 * the same target several times yields one edge; self-links are dropped because
 * they prove nothing about inlinks or orphan status.
 *
 * Dedupe is per source page rather than across the whole crawl: at the 10k-page
 * cap a global key set would hold hundreds of megabytes of concatenated URLs,
 * while per-page state is bounded by a single page's out-degree. Two crawl
 * entries that normalize to the same final URL can therefore emit the same edge
 * twice; the unique (audit, source, target) index absorbs that.
 */
export function buildLinkEdges(pages: StepPageResult[]): LinkEdge[] {
  const edges: LinkEdge[] = [];

  for (const page of pages) {
    const seen = new Set<string>();

    for (const targetUrl of page.internalLinks) {
      if (targetUrl === page.url) continue;
      if (seen.has(targetUrl)) continue;

      seen.add(targetUrl);
      edges.push({ sourceUrl: page.url, targetUrl });
    }
  }

  return edges;
}
