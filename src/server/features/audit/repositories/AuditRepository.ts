/**
 * Data access layer for site audit tables.
 * All D1 interactions for audits, audit_pages, and stored Lighthouse results.
 */
import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  audits,
  auditLighthouseResults,
  auditLinkEdges,
  auditPages,
  auditSnapshots,
} from "@/db/schema";
import type { LinkEdge } from "@/server/lib/audit/link-graph";
import { buildSitemapMembership } from "@/server/lib/audit/sitemap-membership";
import { pacingColumns } from "@/server/lib/audit/crawl-pacing";
import { SEED_MIN_PAGES } from "@/server/lib/audit/crawl-rate";
import type {
  AuditConfig,
  LighthouseResult,
  StepPageResult,
} from "@/server/lib/audit/types";
import {
  getAuditsByProject,
  getLatestAuditByProject,
  getLatestCompletedAuditByProject,
} from "./command-center-audit-queries";
import {
  getPagesByUrls,
  listEdgesToTargets,
  listInboundCountsByTarget,
} from "./audit-page-queries";

const DB_BATCH_SIZE = 100;
const EDGE_ROWS_PER_STATEMENT = 30;
type BatchStatement = Parameters<typeof db.batch>[0][number];

async function executeInBatches<T>(
  items: T[],
  buildStatement: (item: T) => BatchStatement,
) {
  for (let i = 0; i < items.length; i += DB_BATCH_SIZE) {
    const chunk = items.slice(i, i + DB_BATCH_SIZE).map(buildStatement);
    const [first, ...rest] = chunk;
    if (!first) continue;
    await db.batch([first, ...rest]);
  }
}

async function createAudit(data: {
  id: string;
  projectId: string;
  startedByUserId: string;
  startUrl: string;
  workflowInstanceId: string;
  config: AuditConfig;
  pagesTotal: number;
  lighthouseTotal: number;
  baselineAuditId?: string | null;
}) {
  await db.insert(audits).values({
    id: data.id,
    projectId: data.projectId,
    startedByUserId: data.startedByUserId,
    startUrl: data.startUrl,
    workflowInstanceId: data.workflowInstanceId,
    baselineAuditId: data.baselineAuditId ?? null,
    config: JSON.stringify(data.config),
    status: "running",
    pagesTotal: data.pagesTotal,
    lighthouseTotal: data.lighthouseTotal,
    currentPhase: "discovery",
  });
}

async function updateAuditProgress(
  auditId: string,
  workflowInstanceId: string,
  data: {
    pagesCrawled?: number;
    pagesTotal?: number;
    lighthouseTotal?: number;
    lighthouseCompleted?: number;
    lighthouseFailed?: number;
    currentPhase?: string;
  },
) {
  await db
    .update(audits)
    .set(data)
    .where(
      and(
        eq(audits.id, auditId),
        eq(audits.workflowInstanceId, workflowInstanceId),
      ),
    );
}

async function completeAudit(
  auditId: string,
  workflowInstanceId: string,
  data: { pagesCrawled: number; pagesTotal: number },
  // Optional: a run that never crawled leaves the pacing columns null. See #88.
  pacing?: Parameters<typeof pacingColumns>[0],
) {
  await db
    .update(audits)
    .set({
      status: "completed",
      completedAt: new Date().toISOString(),
      currentPhase: "completed",
      ...data,
      ...(pacing ? pacingColumns(pacing) : {}),
    })
    .where(
      and(
        eq(audits.id, auditId),
        eq(audits.workflowInstanceId, workflowInstanceId),
      ),
    );
}

async function failAudit(
  auditId: string,
  workflowInstanceId: string,
  errorMessage?: string,
) {
  await db
    .update(audits)
    .set({
      status: "failed",
      completedAt: new Date().toISOString(),
      currentPhase: "failed",
      errorMessage: errorMessage ?? null,
    })
    .where(
      and(
        eq(audits.id, auditId),
        eq(audits.workflowInstanceId, workflowInstanceId),
      ),
    );
}

async function getAuditForWorkflow(
  auditId: string,
  workflowInstanceId: string,
) {
  return db.query.audits.findFirst({
    where: and(
      eq(audits.id, auditId),
      eq(audits.workflowInstanceId, workflowInstanceId),
    ),
  });
}

/**
 * Write the crawl results.
 *
 * Every insert here is retry-safe. The whole finalize body runs inside one
 * durable Workflow step, so a transient failure anywhere in it replays the step
 * from the top with identical crawl-assigned ids; without conflict handling that
 * replay dies on a primary-key collision and strands the audit.
 */
async function batchWriteResults(
  auditId: string,
  pages: StepPageResult[],
  lighthouseResults: LighthouseResult[],
  // URLs discovered through the sitemap(s); membership is only known once
  // discovery has run, so it is resolved here rather than during the crawl.
  sitemapUrls: ReadonlySet<string>,
) {
  const isInSitemap = buildSitemapMembership(sitemapUrls);

  await executeInBatches(pages, (page) =>
    db
      .insert(auditPages)
      .values({
        id: page.id,
        auditId,
        url: page.url,
        statusCode: page.statusCode,
        redirectUrl: page.redirectUrl,
        title: page.title,
        metaDescription: page.metaDescription,
        canonicalUrl: page.canonicalUrl,
        robotsMeta: page.robotsMeta,
        ogTitle: page.ogTitle,
        ogDescription: page.ogDescription,
        ogImage: page.ogImage,
        h1Count: page.h1Count,
        h2Count: page.h2Count,
        h3Count: page.h3Count,
        h4Count: page.h4Count,
        h5Count: page.h5Count,
        h6Count: page.h6Count,
        headingOrderJson: JSON.stringify(page.headingOrder),
        wordCount: page.wordCount,
        imagesTotal: page.imagesTotal,
        imagesMissingAlt: page.imagesMissingAlt,
        imagesJson: JSON.stringify(page.images),
        internalLinkCount: page.internalLinks.length,
        externalLinkCount: page.externalLinkCount,
        hasStructuredData: page.hasStructuredData,
        hreflangTagsJson: JSON.stringify(page.hreflangTags),
        isIndexable: page.isIndexable,
        hasMixedContent: page.hasMixedContent,
        isHtml: page.isHtml,
        inSitemap: isInSitemap(page.url),
        responseTimeMs: page.responseTimeMs,
      })
      .onConflictDoNothing({ target: auditPages.id }),
  );

  if (lighthouseResults.length === 0) {
    return;
  }

  await executeInBatches(lighthouseResults, (result) =>
    db
      .insert(auditLighthouseResults)
      .values({
        // Derived from the page + strategy rather than random so a replay
        // re-writes the same row instead of duplicating the measurement.
        id: `${result.pageId}-${result.strategy}`,
        auditId,
        pageId: result.pageId,
        strategy: result.strategy,
        performanceScore: result.performanceScore,
        accessibilityScore: result.accessibilityScore,
        bestPracticesScore: result.bestPracticesScore,
        seoScore: result.seoScore,
        lcpMs: result.lcpMs,
        cls: result.cls,
        inpMs: result.inpMs,
        ttfbMs: result.ttfbMs,
        errorMessage: result.errorMessage ?? null,
        r2Key: result.r2Key ?? null,
        payloadSizeBytes: result.payloadSizeBytes ?? null,
      })
      .onConflictDoNothing({ target: auditLighthouseResults.id }),
  );
}

/**
 * Persist the crawl's internal-link graph. The unique (audit, source, target)
 * index plus onConflictDoNothing makes a finalize-step retry a no-op instead of
 * duplicating the graph.
 */
async function batchWriteLinkEdges(auditId: string, edges: LinkEdge[]) {
  if (edges.length === 0) return;

  // A large crawl produces far more edges than pages, and every statement is a
  // round trip inside the finalize step. Rows are grouped into multi-row inserts
  // (kept well under D1's bound-parameter limit at 3 columns per row) so the
  // step stays short.
  const chunks: LinkEdge[][] = [];
  for (let i = 0; i < edges.length; i += EDGE_ROWS_PER_STATEMENT) {
    chunks.push(edges.slice(i, i + EDGE_ROWS_PER_STATEMENT));
  }

  await executeInBatches(chunks, (chunk) =>
    db
      .insert(auditLinkEdges)
      .values(
        chunk.map((edge) => ({
          auditId,
          sourceUrl: edge.sourceUrl,
          targetUrl: edge.targetUrl,
        })),
      )
      .onConflictDoNothing({
        target: [
          auditLinkEdges.auditId,
          auditLinkEdges.sourceUrl,
          auditLinkEdges.targetUrl,
        ],
      }),
  );
}

/**
 * A lean projection of an audit's page facts for snapshot comparison — only the
 * columns the page-fact diff compares, not the whole row (which carries JSON
 * blobs a comparison never reads). Keyed by the stored final URL.
 */
async function getPageFactsForAudit(auditId: string) {
  return db
    .select({
      url: auditPages.url,
      title: auditPages.title,
      metaDescription: auditPages.metaDescription,
      h1Count: auditPages.h1Count,
      wordCount: auditPages.wordCount,
      statusCode: auditPages.statusCode,
      canonicalUrl: auditPages.canonicalUrl,
      isIndexable: auditPages.isIndexable,
      inSitemap: auditPages.inSitemap,
      isHtml: auditPages.isHtml,
    })
    .from(auditPages)
    .where(eq(auditPages.auditId, auditId));
}

async function getAuditForProject(auditId: string, projectId: string) {
  return db.query.audits.findFirst({
    where: and(eq(audits.id, auditId), eq(audits.projectId, projectId)),
  });
}

/**
 * What the last finished crawl of this target learned about the site's rate
 * limit, or null if no crawl of it has ever recorded pacing — including every
 * crawl that ran before the pacing columns existed.
 *
 * Keyed on `targetId` through the snapshot table, not on `startUrl`: pacing is a
 * property of the host's per-IP limiter, while start URLs for one target differ
 * by design — a scheduled re-crawl launches the bare origin while a manual one
 * keeps whatever path the user typed. Matching the string would miss exactly the
 * repeat-crawl case this exists for. `audit_snapshots` carries `targetId` and is
 * only ever written at finalize, so the join also restricts this to crawls that
 * reached the end.
 *
 * `SEED_MIN_PAGES` refuses a crawl too small to have measured anything: below
 * one full batch the settled rate is an artifact of the last few URLs rather
 * than a fact about the site. Ordered by `completedAt`, because the freshest
 * evidence is the crawl that finished last, not the one that started last —
 * nothing serialises crawls of one target, so those can differ.
 *
 * Unindexed for this shape (`audits` carries only a project index), which is a
 * conscious cost: one execution per crawl. See issue #91.
 */
async function getLastPacingForTarget(targetId: string) {
  const [row] = await db
    .select({
      settledRate: audits.crawlSettledRate,
      highestRate: audits.crawlHighestRate,
    })
    .from(auditSnapshots)
    .innerJoin(audits, eq(auditSnapshots.auditId, audits.id))
    .where(
      and(
        eq(auditSnapshots.targetId, targetId),
        isNotNull(audits.crawlSettledRate),
        gte(audits.pagesCrawled, SEED_MIN_PAGES),
      ),
    )
    .orderBy(desc(audits.completedAt))
    .limit(1);
  if (row?.settledRate == null) return null;
  return { settledRate: row.settledRate, highestRate: row.highestRate ?? 0 };
}

async function getAuditCapacityUsageForUser(userId: string) {
  const rows = await db.query.audits.findMany({
    where: eq(audits.startedByUserId, userId),
    columns: {
      pagesTotal: true,
      lighthouseTotal: true,
    },
  });

  return rows.reduce(
    (total, row) => total + row.pagesTotal + row.lighthouseTotal,
    0,
  );
}

async function getAuditResultsForProject(auditId: string, projectId: string) {
  const audit = await getAuditForProject(auditId, projectId);
  if (!audit) {
    return { audit: null, pages: [], lighthouse: [] };
  }

  const [pages, lighthouse] = await Promise.all([
    db.query.auditPages.findMany({
      where: eq(auditPages.auditId, auditId),
    }),
    db.query.auditLighthouseResults.findMany({
      where: eq(auditLighthouseResults.auditId, auditId),
    }),
  ]);

  return { audit, pages, lighthouse };
}

async function getLighthouseResultById(input: {
  lighthouseResultId: string;
  projectId: string;
}) {
  const lighthouse = await db.query.auditLighthouseResults.findFirst({
    where: eq(auditLighthouseResults.id, input.lighthouseResultId),
  });

  if (!lighthouse) {
    return null;
  }

  const [parentAudit, page] = await Promise.all([
    db.query.audits.findFirst({
      where: and(
        eq(audits.id, lighthouse.auditId),
        eq(audits.projectId, input.projectId),
      ),
    }),
    db.query.auditPages.findFirst({
      where: eq(auditPages.id, lighthouse.pageId),
    }),
  ]);

  if (!parentAudit) {
    return null;
  }

  return {
    lighthouse,
    page,
    audit: parentAudit,
  };
}

async function deleteAuditForProject(auditId: string, projectId: string) {
  await db
    .delete(audits)
    .where(and(eq(audits.id, auditId), eq(audits.projectId, projectId)));
}

export const AuditRepository = {
  createAudit,
  updateAuditProgress,
  completeAudit,
  failAudit,
  getAuditForWorkflow,
  batchWriteResults,
  batchWriteLinkEdges,
  getPageFactsForAudit,
  getPagesByUrls,
  listEdgesToTargets,
  listInboundCountsByTarget,
  getAuditForProject,
  getLastPacingForTarget,
  getAuditsByProject,
  getLatestAuditByProject,
  getLatestCompletedAuditByProject,
  getAuditCapacityUsageForUser,
  getAuditResultsForProject,
  getLighthouseResultById,
  deleteAuditForProject,
} as const;
