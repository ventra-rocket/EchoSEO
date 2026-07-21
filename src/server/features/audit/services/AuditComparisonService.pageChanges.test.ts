/**
 * Page-fact snapshot comparison against a real SQLite database.
 *
 * The pure diff is unit-tested in page-changes.test.ts; what has to hold here is
 * the wiring: page facts are comparable regardless of issue materialization,
 * the changed-URL list is capped while totals count everything, and one
 * target's history stays isolated from another's.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";
import { projects } from "@/db/app.schema";
import {
  audits,
  auditPages,
  auditSnapshots,
  auditTargets,
} from "@/db/audit.schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { AuditComparisonService } = await import("./AuditComparisonService");

const PROJECT_ID = "proj1";
const TARGET_ID = "target1";
const ORG_ID = "org1";

let harness: FreeCheckTestDb;

async function seedTarget(input: { targetId?: string; origin?: string } = {}) {
  await harness.db.insert(auditTargets).values({
    id: input.targetId ?? TARGET_ID,
    projectId: PROJECT_ID,
    organizationId: ORG_ID,
    origin: input.origin ?? "https://example.com",
  });
}

/** A completed audit + its sealed snapshot. `sealedAt` orders the baseline pick. */
async function seedAudit(input: {
  auditId: string;
  targetId?: string;
  sealedAt: string;
  materialized: boolean;
}) {
  await harness.db.insert(audits).values({
    id: input.auditId,
    projectId: PROJECT_ID,
    startedByUserId: "u1",
    startUrl: "https://example.com/",
    workflowInstanceId: input.auditId,
    status: "completed",
    completedAt: input.sealedAt,
  });
  await harness.db.insert(auditSnapshots).values({
    id: `snap-${input.auditId}`,
    auditId: input.auditId,
    projectId: PROJECT_ID,
    targetId: input.targetId ?? TARGET_ID,
    pagesCrawled: 1,
    edgeCount: 0,
    lighthouseCount: 0,
    sealedAt: input.sealedAt,
    issuesMaterializedAt: input.materialized ? input.sealedAt : null,
  });
}

/** Seed page-fact rows for an audit; only the compared columns are overridden. */
async function seedPages(
  auditId: string,
  pages: Array<{
    url: string;
    title?: string | null;
    inSitemap?: boolean;
  }>,
) {
  for (const [index, page] of pages.entries()) {
    await harness.db.insert(auditPages).values({
      id: `page-${auditId}-${index}`,
      auditId,
      url: page.url,
      title: page.title ?? "Title",
      metaDescription: "Meta",
      h1Count: 1,
      wordCount: 500,
      statusCode: 200,
      canonicalUrl: page.url,
      isIndexable: true,
      inSitemap: page.inSitemap ?? true,
    });
  }
}

describe("AuditComparisonService.resolvePageChanges", () => {
  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;

    await harness.db.insert(organization).values({
      id: ORG_ID,
      name: "Org",
      slug: "org-1",
      createdAt: new Date(),
    });
    await harness.db
      .insert(projects)
      .values({ id: PROJECT_ID, organizationId: ORG_ID, name: "Project" });
    await seedTarget();
  });

  it("reports a single snapshot when there is no prior crawl", async () => {
    await seedAudit({
      auditId: "a1",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: true,
    });
    await seedPages("a1", [{ url: "https://example.com/a" }]);

    const result = await AuditComparisonService.resolvePageChanges({
      auditId: "a1",
      projectId: PROJECT_ID,
    });
    expect(result.state).toBe("single_snapshot");
  });

  it("diffs page facts between two crawls, labelled crawl", async () => {
    await seedAudit({
      auditId: "old",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: true,
    });
    await seedAudit({
      auditId: "new",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: true,
    });
    await seedPages("old", [
      { url: "https://example.com/a", title: "Old", inSitemap: true },
      { url: "https://example.com/b" }, // unchanged
    ]);
    await seedPages("new", [
      { url: "https://example.com/a", title: "New", inSitemap: false },
      { url: "https://example.com/b" },
    ]);

    const result = await AuditComparisonService.resolvePageChanges({
      auditId: "new",
      projectId: PROJECT_ID,
    });

    expect(result.state).toBe("comparable");
    if (result.state !== "comparable") throw new Error("unreachable");
    expect(result.source).toBe("crawl");
    expect(result.baseline.auditId).toBe("old");
    expect(result.totals.changedUrls).toBe(1);
    expect(result.totals.removedFromSitemap).toBe(1);
    const changed = result.changes.find(
      (c) => c.url === "https://example.com/a",
    );
    expect(changed?.safeUrl).toBe("https://example.com/a");
    expect(changed?.fields).toContainEqual({
      field: "inSitemap",
      kind: "removed-from-sitemap",
    });
  });

  it("compares page facts even when a snapshot's issues never materialized", async () => {
    // Page facts are sealed at crawl time; issue materialization is irrelevant
    // to them, unlike the issue delta.
    await seedAudit({
      auditId: "old",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: false,
    });
    await seedAudit({
      auditId: "new",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: false,
    });
    await seedPages("old", [{ url: "https://example.com/a", title: "Old" }]);
    await seedPages("new", [{ url: "https://example.com/a", title: "New" }]);

    const result = await AuditComparisonService.resolvePageChanges({
      auditId: "new",
      projectId: PROJECT_ID,
    });
    expect(result.state).toBe("comparable");
  });

  it("caps the changed-URL list while the totals count every change", async () => {
    await seedAudit({
      auditId: "old",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: true,
    });
    await seedAudit({
      auditId: "new",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: true,
    });
    const oldPages = Array.from({ length: 205 }, (_, i) => ({
      url: `https://example.com/p${i}`,
      title: "Old",
    }));
    const newPages = Array.from({ length: 205 }, (_, i) => ({
      url: `https://example.com/p${i}`,
      title: "New",
    }));
    await seedPages("old", oldPages);
    await seedPages("new", newPages);

    const result = await AuditComparisonService.resolvePageChanges({
      auditId: "new",
      projectId: PROJECT_ID,
    });

    expect(result.state).toBe("comparable");
    if (result.state !== "comparable") throw new Error("unreachable");
    expect(result.totals.changedUrls).toBe(205);
    expect(result.changes).toHaveLength(200);
    expect(result.truncated).toBe(true);
  });

  it("refuses a baseline from another target (isolation)", async () => {
    await seedTarget({ targetId: "target2", origin: "https://other.example" });
    await seedAudit({
      auditId: "other-audit",
      targetId: "target2",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: true,
    });
    await seedAudit({
      auditId: "current",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: true,
    });

    await expect(
      AuditComparisonService.resolvePageChanges({
        auditId: "current",
        projectId: PROJECT_ID,
        baselineAuditId: "other-audit",
      }),
    ).rejects.toThrow();
  });
});
