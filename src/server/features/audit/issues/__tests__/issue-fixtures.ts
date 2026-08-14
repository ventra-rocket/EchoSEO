/**
 * Shared fixtures for the audit issue materialization tests.
 */
import { buildOccurrences } from "../materialize";
import {
  addEdgesToLinkGraph,
  createLinkGraph,
} from "@/server/features/audit/issues/cross-page-signals";
import type { AuditPageRow } from "../snapshot-signals";
import type { auditLighthouseResults } from "@/db/audit.schema";

type LighthouseRow = typeof auditLighthouseResults.$inferSelect;

export function pageRow(overrides: Partial<AuditPageRow> = {}): AuditPageRow {
  return {
    id: "p1",
    auditId: "a1",
    url: "https://example.com/",
    statusCode: 200,
    redirectUrl: null,
    title: "A perfectly reasonable title for a page",
    metaDescription:
      "A meta description that is comfortably inside the range the rule wants to see on a healthy page.",
    canonicalUrl: "https://example.com/",
    robotsMeta: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    h1Count: 1,
    h2Count: 0,
    h3Count: 0,
    h4Count: 0,
    h5Count: 0,
    h6Count: 0,
    headingOrderJson: "[1]",
    wordCount: 800,
    imagesTotal: 0,
    imagesMissingAlt: 0,
    imagesJson: "[]",
    internalLinkCount: 0,
    externalLinkCount: 0,
    hasStructuredData: true,
    hreflangTagsJson: "[]",
    isIndexable: true,
    hasMixedContent: false,
    isHtml: true,
    inSitemap: true,
    responseTimeMs: 100,
    ...overrides,
  };
}

export function lighthouseRow(
  overrides: Partial<LighthouseRow> = {},
): LighthouseRow {
  return {
    id: "lh1",
    auditId: "a1",
    pageId: "p1",
    strategy: "mobile",
    performanceScore: 50,
    accessibilityScore: null,
    bestPracticesScore: null,
    seoScore: null,
    lcpMs: 9000,
    cls: 0.01,
    inpMs: 100,
    ttfbMs: 200,
    errorMessage: null,
    r2Key: null,
    payloadSizeBytes: null,
    ...overrides,
  };
}

export function edge(sourceUrl: string, targetUrl: string) {
  return { id: 1, auditId: "a1", sourceUrl, targetUrl };
}

/**
 * The default start URL matches the default page, so a single-page fixture is
 * the crawl entry point and is not reported as an orphan. Tests that care about
 * orphan behaviour pass their own start URL.
 */
export function occurrencesFor(input: {
  pages: AuditPageRow[];
  lighthouse?: LighthouseRow[];
  edges?: ReturnType<typeof edge>[];
  startUrl?: string;
  crawlWasTruncated?: boolean;
}) {
  // Folds through the same two calls production uses, in one chunk. A fixture
  // that built the graph its own way would stop proving the streaming path.
  const graph = createLinkGraph(input.pages);
  addEdgesToLinkGraph(graph, input.edges ?? []);

  return buildOccurrences({
    pages: input.pages,
    lighthouse: input.lighthouse ?? [],
    graph,
    startUrl: input.startUrl ?? "https://example.com/",
    crawlWasTruncated: input.crawlWasTruncated ?? false,
  });
}
