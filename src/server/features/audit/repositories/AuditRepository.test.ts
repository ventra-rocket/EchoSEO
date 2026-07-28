/**
 * Snapshot + link-graph persistence against a real SQLite database.
 *
 * The finalize step is a single durable Workflow step, so a partial failure
 * re-runs the whole body. These tests pin the two writes that must therefore be
 * retry-safe (edges, snapshot seal) and the sitemap membership that later
 * phases use as orphan evidence.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";
import { projects } from "@/db/app.schema";
import {
  audits,
  auditLighthouseResults,
  auditLinkEdges,
  auditPages,
  auditSnapshots,
  auditTargets,
} from "@/db/audit.schema";
import type { StepPageResult } from "@/server/lib/audit/types";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { AuditRepository } = await import("./AuditRepository");

const AUDIT_ID = "audit1";

function page(
  id: string,
  url: string,
  internalLinks: string[] = [],
): StepPageResult {
  return {
    id,
    url,
    statusCode: 200,
    redirectUrl: null,
    title: "",
    metaDescription: "",
    canonicalUrl: null,
    robotsMeta: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    h1Count: 0,
    h2Count: 0,
    h3Count: 0,
    h4Count: 0,
    h5Count: 0,
    h6Count: 0,
    headingOrder: [],
    wordCount: 0,
    imagesTotal: 0,
    imagesMissingAlt: 0,
    images: [],
    internalLinks,
    externalLinks: [],
    hasStructuredData: false,
    hreflangTags: [],
    hasMixedContent: false,
    isIndexable: true,
    isHtml: true,
    responseTimeMs: 0,
  };
}

describe("AuditRepository snapshot + link graph", () => {
  let harness: FreeCheckTestDb;

  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;

    await harness.db.insert(organization).values({
      id: "org1",
      name: "Org",
      slug: "org-1",
      createdAt: new Date(),
    });
    await harness.db
      .insert(projects)
      .values({ id: "proj1", organizationId: "org1", name: "Project" });
    await harness.db.insert(auditTargets).values({
      id: "target1",
      projectId: "proj1",
      organizationId: "org1",
      origin: "https://a.com",
    });
    await harness.db.insert(audits).values({
      id: AUDIT_ID,
      projectId: "proj1",
      startedByUserId: "u1",
      startUrl: "https://a.com/",
      workflowInstanceId: AUDIT_ID,
    });
  });

  it("records sitemap membership per page", async () => {
    await AuditRepository.batchWriteResults(
      AUDIT_ID,
      [page("p1", "https://a.com/"), page("p2", "https://a.com/orphan")],
      [],
      new Set(["https://a.com/"]),
    );

    const rows = await harness.db
      .select()
      .from(auditPages)
      .where(eq(auditPages.auditId, AUDIT_ID));

    expect(rows.find((row) => row.url === "https://a.com/")?.inSitemap).toBe(
      true,
    );
    expect(
      rows.find((row) => row.url === "https://a.com/orphan")?.inSitemap,
    ).toBe(false);
  });

  it("still matches the sitemap when the site canonicalizes away from www", async () => {
    await AuditRepository.batchWriteResults(
      AUDIT_ID,
      [page("p1", "https://a.com/about")],
      [],
      new Set(["https://www.a.com/about"]),
    );

    const rows = await harness.db
      .select()
      .from(auditPages)
      .where(eq(auditPages.auditId, AUDIT_ID));

    expect(rows[0]?.inSitemap).toBe(true);
  });

  it("replays the results write without duplicating pages or measurements", async () => {
    const pages = [page("p1", "https://a.com/")];
    const lighthouse = [
      {
        url: "https://a.com/",
        pageId: "p1",
        strategy: "mobile" as const,
        performanceScore: 90,
        accessibilityScore: null,
        bestPracticesScore: null,
        seoScore: null,
        lcpMs: null,
        cls: null,
        inpMs: null,
        ttfbMs: null,
      },
    ];

    // The finalize step is one durable unit: a transient failure replays the
    // whole body with the same crawl-assigned ids.
    await AuditRepository.batchWriteResults(
      AUDIT_ID,
      pages,
      lighthouse,
      new Set(),
    );
    await AuditRepository.batchWriteResults(
      AUDIT_ID,
      pages,
      lighthouse,
      new Set(),
    );

    const pageRows = await harness.db
      .select()
      .from(auditPages)
      .where(eq(auditPages.auditId, AUDIT_ID));
    const lighthouseRows = await harness.db
      .select()
      .from(auditLighthouseResults)
      .where(eq(auditLighthouseResults.auditId, AUDIT_ID));

    expect(pageRows).toHaveLength(1);
    expect(lighthouseRows).toHaveLength(1);
  });

  it("persists link edges and stays a no-op on a finalize retry", async () => {
    const edges = [
      { sourceUrl: "https://a.com/", targetUrl: "https://a.com/x" },
      { sourceUrl: "https://a.com/", targetUrl: "https://a.com/y" },
    ];

    await AuditRepository.batchWriteLinkEdges(AUDIT_ID, edges);
    await AuditRepository.batchWriteLinkEdges(AUDIT_ID, edges);

    const rows = await harness.db
      .select()
      .from(auditLinkEdges)
      .where(eq(auditLinkEdges.auditId, AUDIT_ID));

    expect(rows).toHaveLength(2);
  });

  it("seals exactly one snapshot per audit even on a retry", async () => {
    const seal = {
      auditId: AUDIT_ID,
      projectId: "proj1",
      targetId: "target1",
      pagesCrawled: 2,
      edgeCount: 3,
      lighthouseCount: 4,
    };

    await AuditRepository.sealSnapshot(seal);
    await AuditRepository.sealSnapshot(seal);

    const rows = await harness.db
      .select()
      .from(auditSnapshots)
      .where(eq(auditSnapshots.auditId, AUDIT_ID));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.pagesCrawled).toBe(2);
    expect(rows[0]?.edgeCount).toBe(3);
    expect(rows[0]?.lighthouseCount).toBe(4);
    expect(rows[0]?.sealedAt).toBeTruthy();
  });

  it("leaves no snapshot for an audit that never finalized", async () => {
    await AuditRepository.failAudit(AUDIT_ID, AUDIT_ID);

    const rows = await harness.db
      .select()
      .from(auditSnapshots)
      .where(eq(auditSnapshots.auditId, AUDIT_ID));

    expect(rows).toHaveLength(0);
  });

  it("keeps the newest completed audit available while a newer crawl runs", async () => {
    await harness.db
      .update(audits)
      .set({ startedAt: "2026-07-28T10:00:00.000Z" })
      .where(eq(audits.id, AUDIT_ID));
    await harness.db.insert(audits).values({
      id: "completed-audit",
      projectId: "proj1",
      startedByUserId: "u1",
      startUrl: "https://a.com/",
      workflowInstanceId: "completed-audit",
      status: "completed",
      startedAt: "2026-07-28T09:00:00.000Z",
      completedAt: "2026-07-28T09:05:00.000Z",
    });

    const [latest, latestCompleted] = await Promise.all([
      AuditRepository.getLatestAuditByProject("proj1"),
      AuditRepository.getLatestCompletedAuditByProject("proj1"),
    ]);

    expect(latest?.id).toBe(AUDIT_ID);
    expect(latestCompleted?.id).toBe("completed-audit");
  });
});
