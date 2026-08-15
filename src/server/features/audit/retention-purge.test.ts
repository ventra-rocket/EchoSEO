/**
 * Part C of the daily sweep: purging crawls past their target's retention window.
 *
 * Split out of `retention.test.ts` because this part carries by far the most
 * fixtures — every child table of `audits` has to be seeded to prove the unwind
 * leaves nothing behind. The other three parts stay in that file.
 *
 * Note what this file can and cannot prove. It pins that the unwind is complete
 * and that one failing audit does not cost the others. It cannot reproduce D1's
 * CPU limit: the evidence for the batch sizes is a production measurement on
 * 14/08, recorded in `plans/reports/verification-260814-crawl-ceiling.md`.
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
  auditIssueOccurrences,
  auditIssueRollups,
  auditLighthouseResults,
  auditLinkEdges,
  auditPages,
  auditSnapshots,
  auditTargets,
} from "@/db/audit.schema";
import { auditExportJobs } from "@/db/audit-export.schema";
import { auditScreenshots } from "@/db/audit-screenshot.schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { deleteAuditExportsMock } = vi.hoisted(() => ({
  deleteAuditExportsMock: vi.fn<(keys: string[]) => Promise<string[]>>(),
}));
vi.mock("@/server/features/audit/exports/audit-export-store", () => ({
  deleteAuditExports: deleteAuditExportsMock,
  auditExportKey: (jobId: string) => `audit-exports/${jobId}.zip`,
}));

const { deleteAuditScreenshotsMock } = vi.hoisted(() => ({
  deleteAuditScreenshotsMock: vi.fn<(keys: string[]) => Promise<string[]>>(),
}));
vi.mock("@/server/features/audit/evidence/audit-screenshot-store", () => ({
  deleteAuditScreenshots: deleteAuditScreenshotsMock,
}));

const { sweepAuditRetention } = await import("./retention");
const { AuditRetentionRepository } =
  await import("./repositories/AuditRetentionRepository");

const ORG_ID = "org1";
const PROJECT_ID = "proj1";
const TARGET_ID = "target1";

const DAY_MS = 24 * 60 * 60 * 1000;

/** D1 `current_timestamp` format, for the space-format columns the sweep compares. */
function toSqlite(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

let harness: FreeCheckTestDb;

async function seedAudit(id: string) {
  await harness.db.insert(audits).values({
    id,
    projectId: PROJECT_ID,
    startedByUserId: "u1",
    startUrl: "https://example.com/",
    workflowInstanceId: id,
    status: "completed",
  });
}

async function seedSnapshot(auditId: string, sealedAt: string) {
  await harness.db.insert(auditSnapshots).values({
    id: `snap-${auditId}`,
    auditId,
    projectId: PROJECT_ID,
    targetId: TARGET_ID,
    pagesCrawled: 1,
    edgeCount: 0,
    lighthouseCount: 0,
    sealedAt,
  });
}

async function seedExport(input: {
  id: string;
  auditId: string;
  status: "queued" | "processing" | "ready" | "failed" | "expired";
  r2Key?: string | null;
  createdAt?: string;
  expiresAt?: string | null;
}) {
  await harness.db.insert(auditExportJobs).values({
    id: input.id,
    auditId: input.auditId,
    projectId: PROJECT_ID,
    organizationId: ORG_ID,
    status: input.status,
    createdByUserId: "u1",
    r2Key: input.r2Key ?? null,
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    expiresAt: input.expiresAt ?? null,
  });
}

async function seedLighthouse(auditId: string, r2Key: string) {
  await harness.db.insert(auditPages).values({
    id: `page-${auditId}`,
    auditId,
    url: "https://example.com/p",
  });
  await harness.db.insert(auditLighthouseResults).values({
    id: `lh-${auditId}`,
    auditId,
    pageId: `page-${auditId}`,
    strategy: "mobile",
    r2Key,
  });
}

async function seedScreenshot(input: {
  id: string;
  auditId: string;
  status: "ready" | "failed";
  r2Key?: string | null;
  capturedAt: string;
}) {
  await harness.db.insert(auditScreenshots).values({
    id: input.id,
    auditId: input.auditId,
    projectId: PROJECT_ID,
    organizationId: ORG_ID,
    url: `https://example.com/${input.id}`,
    pageId: null,
    status: input.status,
    r2Key: input.r2Key ?? null,
    capturedAt: input.capturedAt,
  });
}

async function jobById(id: string) {
  const rows = await harness.db.select().from(auditExportJobs);
  return rows.find((job) => job.id === id) ?? null;
}

async function screenshotIds(): Promise<string[]> {
  return (await harness.db.select().from(auditScreenshots)).map((s) => s.id);
}

async function auditIds(): Promise<string[]> {
  return (await harness.db.select().from(audits)).map((a) => a.id);
}

describe("sweepAuditRetention — part C", () => {
  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
    deleteAuditExportsMock.mockReset();
    deleteAuditExportsMock.mockResolvedValue([]);
    deleteAuditScreenshotsMock.mockReset();
    deleteAuditScreenshotsMock.mockResolvedValue([]);

    await harness.db.insert(organization).values({
      id: ORG_ID,
      name: "Org",
      slug: "org-1",
      createdAt: new Date(),
    });
    await harness.db
      .insert(projects)
      .values({ id: PROJECT_ID, organizationId: ORG_ID, name: "Project" });
    await harness.db.insert(auditTargets).values({
      id: TARGET_ID,
      projectId: PROJECT_ID,
      organizationId: ORG_ID,
      origin: "https://example.com",
      retentionDays: 90,
    });
  });

  describe("part C — purge crawls past retention", () => {
    it("purges export R2 then deletes an over-retention audit, sparing a recent one", async () => {
      await seedAudit("old-audit");
      await seedSnapshot(
        "old-audit",
        toSqlite(new Date(Date.now() - 100 * DAY_MS)),
      );
      await seedExport({
        id: "old-export",
        auditId: "old-audit",
        status: "ready",
        r2Key: "audit-exports/old-export.zip",
        expiresAt: new Date(Date.now() + DAY_MS).toISOString(), // not part A's job
      });
      await seedLighthouse("old-audit", "site-audit/proj1/old-audit/lh.json");
      // A recent screenshot (within its own 30-day window, so part D leaves it)
      // must still be purged from R2 when its audit is deleted.
      await seedScreenshot({
        id: "shot-old",
        auditId: "old-audit",
        status: "ready",
        r2Key: "audit-screenshots/old-audit/shot-old",
        capturedAt: new Date().toISOString(),
      });

      await seedAudit("recent-audit");
      await seedSnapshot("recent-audit", toSqlite(new Date()));

      const result = await sweepAuditRetention();

      expect(result.auditsPurged).toBe(1);
      // The export ZIP, the Lighthouse payload and the screenshot are all purged
      // before delete.
      const purgedKeys = deleteAuditExportsMock.mock.calls.flat().flat();
      expect(purgedKeys).toContain("audit-exports/old-export.zip");
      expect(purgedKeys).toContain("site-audit/proj1/old-audit/lh.json");
      expect(purgedKeys).toContain("audit-screenshots/old-audit/shot-old");
      const remaining = await auditIds();
      expect(remaining).toEqual(["recent-audit"]);
      // Cascade removed the old audit's export + screenshot rows.
      expect(await jobById("old-export")).toBeNull();
      expect(await screenshotIds()).toEqual([]);
    });

    it("leaves no child row behind in any table", async () => {
      // The delete used to be `DELETE FROM audits` plus the cascade. It is now an
      // explicit, ordered, batched unwind — so the thing that can now go wrong is
      // forgetting a table. This seeds every child of `audits` and asserts each
      // one empties.
      await seedAudit("old-audit");
      await seedSnapshot(
        "old-audit",
        toSqlite(new Date(Date.now() - 100 * DAY_MS)),
      );
      await seedLighthouse("old-audit", "site-audit/proj1/old-audit/lh.json");
      await seedExport({
        id: "old-export",
        auditId: "old-audit",
        status: "ready",
        r2Key: "audit-exports/old-export.zip",
        expiresAt: new Date(Date.now() + DAY_MS).toISOString(),
      });
      await seedScreenshot({
        id: "shot",
        auditId: "old-audit",
        status: "ready",
        r2Key: "audit-screenshots/old-audit/shot",
        capturedAt: new Date().toISOString(),
      });
      await harness.db.insert(auditLinkEdges).values({
        auditId: "old-audit",
        sourceUrl: "https://example.com/",
        targetUrl: "https://example.com/p",
      });
      await harness.db.insert(auditIssueOccurrences).values({
        id: "occ1",
        auditId: "old-audit",
        projectId: PROJECT_ID,
        pageId: "page-old-audit",
        ruleId: "meta-title",
        ruleVersion: "2026-01-01",
        issueGroup: "meta",
        severity: "high",
        status: "fail",
        url: "https://example.com/p",
      });
      await harness.db.insert(auditIssueRollups).values({
        id: "roll1",
        auditId: "old-audit",
        ruleId: "meta-title",
        issueGroup: "meta",
        severity: "high",
        urlCount: 1,
      });

      const result = await sweepAuditRetention();

      expect(result.auditsPurged).toBe(1);
      expect(await auditIds()).toEqual([]);
      expect(await harness.db.select().from(auditPages)).toEqual([]);
      expect(await harness.db.select().from(auditLinkEdges)).toEqual([]);
      expect(await harness.db.select().from(auditIssueOccurrences)).toEqual([]);
      expect(await harness.db.select().from(auditIssueRollups)).toEqual([]);
      expect(await harness.db.select().from(auditLighthouseResults)).toEqual(
        [],
      );
      expect(await harness.db.select().from(auditSnapshots)).toEqual([]);
      expect(await harness.db.select().from(auditExportJobs)).toEqual([]);
      expect(await harness.db.select().from(auditScreenshots)).toEqual([]);
    });

    it("purges the other candidates when one audit fails", async () => {
      // The failure that motivated this: the old code purged R2 for every
      // candidate and then deleted them in one statement, so a single oversized
      // crawl cost all of them their R2 payloads and none of them their rows.
      for (const id of ["a-old", "b-old", "c-old"]) {
        await seedAudit(id);
        await seedSnapshot(id, toSqlite(new Date(Date.now() - 100 * DAY_MS)));
      }

      const realCascade = AuditRetentionRepository.deleteAuditCascade;
      const spy = vi
        .spyOn(AuditRetentionRepository, "deleteAuditCascade")
        .mockImplementation(async (auditId: string) => {
          if (auditId === "b-old") throw new Error("D1 CPU limit");
          await realCascade(auditId);
        });

      const result = await sweepAuditRetention();
      spy.mockRestore();

      expect(result.auditsPurged).toBe(2);
      // The failed one is still there to retry tomorrow; the others are gone.
      expect(await auditIds()).toEqual(["b-old"]);
    });
  });
});
