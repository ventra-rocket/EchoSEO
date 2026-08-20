/**
 * The daily audit retention sweep against a real SQLite database. Verifies each
 * part ages out the right rows on its own clock, purges R2 before deleting the
 * rows, stays best-effort when R2 fails, and that one part's failure does not
 * skip the others. The database and repositories are real; only the R2 delete is
 * mocked (there is no R2 in the test).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";
import { projects } from "@/db/app.schema";
import { audits, auditTargets } from "@/db/audit.schema";
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

vi.mock("@/server/lib/audit/discovered-urls-store", () => ({
  discoveredUrlsKey: (auditId: string) => `audit-discovery/${auditId}.json`,
}));

const { sweepAuditRetention } = await import("./retention");
const { AuditRetentionRepository } =
  await import("./repositories/AuditRetentionRepository");

const ORG_ID = "org1";
const PROJECT_ID = "proj1";
const TARGET_ID = "target1";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

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

describe("sweepAuditRetention", () => {
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

  describe("part A — expire ready exports", () => {
    it("purges R2 then marks an out-of-window ready export expired, sparing an in-window one", async () => {
      await seedAudit("a1");
      await seedExport({
        id: "old",
        auditId: "a1",
        status: "ready",
        r2Key: "audit-exports/old.zip",
        expiresAt: new Date(Date.now() - DAY_MS).toISOString(),
      });
      await seedExport({
        id: "fresh",
        auditId: "a1",
        status: "ready",
        r2Key: "audit-exports/fresh.zip",
        expiresAt: new Date(Date.now() + DAY_MS).toISOString(),
      });

      const result = await sweepAuditRetention();

      expect(result.exportsExpired).toBe(1);
      expect(deleteAuditExportsMock).toHaveBeenCalledWith([
        "audit-exports/old.zip",
      ]);
      expect(await jobById("old")).toMatchObject({
        status: "expired",
        r2Key: null,
      });
      expect(await jobById("fresh")).toMatchObject({ status: "ready" });
    });

    it("still marks the row expired when the R2 purge fails", async () => {
      await seedAudit("a1");
      await seedExport({
        id: "old",
        auditId: "a1",
        status: "ready",
        r2Key: "audit-exports/old.zip",
        expiresAt: new Date(Date.now() - DAY_MS).toISOString(),
      });
      deleteAuditExportsMock.mockResolvedValue(["audit-exports/old.zip"]);

      await sweepAuditRetention();

      expect(await jobById("old")).toMatchObject({ status: "expired" });
    });
  });

  describe("part B — terminalize stale builds", () => {
    it("fails a build stuck past the cutoff and spares a recent one", async () => {
      await seedAudit("a1");
      await seedExport({
        id: "wedged",
        auditId: "a1",
        status: "processing",
        createdAt: toSqlite(new Date(Date.now() - 2 * HOUR_MS)),
      });
      await seedExport({
        id: "recent",
        auditId: "a1",
        status: "queued",
        createdAt: toSqlite(new Date()),
      });

      const result = await sweepAuditRetention();

      expect(result.buildsTerminalized).toBe(1);
      expect(await jobById("wedged")).toMatchObject({ status: "failed" });
      expect(await jobById("recent")).toMatchObject({ status: "queued" });
      // The wedged build's derivable object is purged before it is terminalized.
      expect(deleteAuditExportsMock).toHaveBeenCalledWith([
        "audit-exports/wedged.zip",
      ]);
    });
  });

  describe("part D — expire stale screenshots", () => {
    it("purges R2 then deletes an out-of-window capture, sparing an in-window one", async () => {
      await seedAudit("a1");
      await seedScreenshot({
        id: "shot-old",
        auditId: "a1",
        status: "ready",
        r2Key: "audit-screenshots/a1/shot-old",
        capturedAt: new Date(Date.now() - 31 * DAY_MS).toISOString(),
      });
      await seedScreenshot({
        id: "shot-fresh",
        auditId: "a1",
        status: "ready",
        r2Key: "audit-screenshots/a1/shot-fresh",
        capturedAt: new Date(Date.now() - DAY_MS).toISOString(),
      });

      const result = await sweepAuditRetention();

      expect(result.screenshotsExpired).toBe(1);
      expect(deleteAuditScreenshotsMock).toHaveBeenCalledWith([
        "audit-screenshots/a1/shot-old",
      ]);
      expect(await screenshotIds()).toEqual(["shot-fresh"]);
    });

    it("deletes a failed capture past its window without an R2 delete", async () => {
      await seedAudit("a1");
      await seedScreenshot({
        id: "shot-failed",
        auditId: "a1",
        status: "failed",
        r2Key: null,
        capturedAt: new Date(Date.now() - 31 * DAY_MS).toISOString(),
      });

      const result = await sweepAuditRetention();

      expect(result.screenshotsExpired).toBe(1);
      // No object exists for a failed capture, so R2 is never asked to delete one.
      expect(deleteAuditScreenshotsMock).not.toHaveBeenCalled();
      expect(await screenshotIds()).toEqual([]);
    });

    it("still deletes the row when the R2 purge fails", async () => {
      await seedAudit("a1");
      await seedScreenshot({
        id: "shot-old",
        auditId: "a1",
        status: "ready",
        r2Key: "audit-screenshots/a1/shot-old",
        capturedAt: new Date(Date.now() - 31 * DAY_MS).toISOString(),
      });
      deleteAuditScreenshotsMock.mockResolvedValue([
        "audit-screenshots/a1/shot-old",
      ]);

      await sweepAuditRetention();

      expect(await screenshotIds()).toEqual([]);
    });
  });

  it("runs every part even when one throws", async () => {
    await seedAudit("a1");
    await seedExport({
      id: "old",
      auditId: "a1",
      status: "ready",
      r2Key: "audit-exports/old.zip",
      expiresAt: new Date(Date.now() - DAY_MS).toISOString(),
    });
    // Part B throws; A must still expire and the sweep must not reject.
    const spy = vi
      .spyOn(AuditRetentionRepository, "findStaleActiveExports")
      .mockRejectedValue(new Error("db blip"));

    const result = await sweepAuditRetention();

    expect(result.buildsTerminalized).toBe(0);
    expect(result.exportsExpired).toBe(1);
    expect(await jobById("old")).toMatchObject({ status: "expired" });
    spy.mockRestore();
  });
});
