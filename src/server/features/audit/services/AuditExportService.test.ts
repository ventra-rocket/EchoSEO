/**
 * Audit export request/status/download authorization against a real SQLite
 * database. The contract under test is spend/authorization discipline: only an
 * investigator can queue an export, a failed enqueue leaves no orphan job, and a
 * download resolves only for the owning organization while the artifact is live.
 * The database and role repository are real; only the Workflow binding is mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";
import { projects } from "@/db/app.schema";
import { audits, auditSnapshots, auditTargets } from "@/db/audit.schema";
import { auditExportJobs } from "@/db/audit-export.schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));
vi.mock("cloudflare:workers", () => ({
  env: { AUDIT_EXPORT_WORKFLOW: { create: createMock } },
}));

const { AuditExportService } = await import("./AuditExportService");

const ORG_ID = "org1";
const PROJECT_ID = "proj1";
const TARGET_ID = "target1";
const USER_ID = "user1";
const AUDIT_ID = "audit1";

let harness: FreeCheckTestDb;

/** Seed a completed audit plus its sealed snapshot; materialized by default. */
async function seedAudit(materialized = true) {
  await harness.db.insert(audits).values({
    id: AUDIT_ID,
    projectId: PROJECT_ID,
    startedByUserId: USER_ID,
    startUrl: "https://example.com/",
    workflowInstanceId: AUDIT_ID,
    status: "completed",
  });
  await harness.db.insert(auditTargets).values({
    id: TARGET_ID,
    projectId: PROJECT_ID,
    organizationId: ORG_ID,
    origin: "https://example.com",
  });
  await harness.db.insert(auditSnapshots).values({
    id: "snap1",
    auditId: AUDIT_ID,
    projectId: PROJECT_ID,
    targetId: TARGET_ID,
    pagesCrawled: 1,
    edgeCount: 0,
    lighthouseCount: 0,
    sealedAt: "2026-07-01T00:00:00.000Z",
    issuesMaterializedAt: materialized ? "2026-07-01T00:00:00.000Z" : null,
  });
}

async function seedJob(input: {
  id: string;
  organizationId?: string;
  projectId?: string;
  status: "queued" | "processing" | "ready" | "failed" | "expired";
  r2Key?: string | null;
  expiresAt?: string | null;
}) {
  await harness.db.insert(auditExportJobs).values({
    id: input.id,
    auditId: AUDIT_ID,
    projectId: input.projectId ?? PROJECT_ID,
    organizationId: input.organizationId ?? ORG_ID,
    status: input.status,
    r2Key: input.r2Key ?? null,
    createdByUserId: USER_ID,
    expiresAt: input.expiresAt ?? null,
  });
}

async function countJobs(): Promise<number> {
  return (await harness.db.select().from(auditExportJobs)).length;
}

const request = (authMode: "hosted" | "local_noauth") =>
  AuditExportService.requestExport({
    projectId: PROJECT_ID,
    auditId: AUDIT_ID,
    actorUserId: USER_ID,
    organizationId: ORG_ID,
    format: "zip",
    locale: "en",
    authMode,
    filters: { severity: "high" },
  });

describe("AuditExportService", () => {
  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
    createMock.mockReset();
    createMock.mockResolvedValue(undefined);

    await harness.db.insert(organization).values({
      id: ORG_ID,
      name: "Org",
      slug: "org-1",
      createdAt: new Date(),
    });
    await harness.db
      .insert(projects)
      .values({ id: PROJECT_ID, organizationId: ORG_ID, name: "Project" });
  });

  describe("requestExport", () => {
    it("refuses a viewer and never queues a job", async () => {
      await seedAudit(); // hosted + no member row → viewer

      await expect(request("hosted")).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(createMock).not.toHaveBeenCalled();
      expect(await countJobs()).toBe(0);
    });

    it("queues a job and starts the workflow, storing only the set filters", async () => {
      await seedAudit();

      const { jobId } = await request("local_noauth");

      expect(createMock).toHaveBeenCalledWith({
        id: jobId,
        params: { jobId },
      });
      const [job] = await harness.db.select().from(auditExportJobs);
      expect(job).toMatchObject({ id: jobId, status: "queued" });
      expect(JSON.parse(job.filtersJson)).toEqual({ severity: "high" });
    });

    it("removes the job when the workflow fails to start", async () => {
      await seedAudit();
      createMock.mockRejectedValueOnce(new Error("workflow down"));

      await expect(request("local_noauth")).rejects.toThrow("workflow down");
      expect(await countJobs()).toBe(0);
    });

    it("is NOT_FOUND when the audit is not in the project", async () => {
      // No audit seeded.
      await expect(request("local_noauth")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      expect(createMock).not.toHaveBeenCalled();
    });

    it("refuses to export before the audit's issues are materialized", async () => {
      await seedAudit(false); // snapshot exists but issues not materialized

      await expect(request("local_noauth")).rejects.toMatchObject({
        code: "CONFLICT",
      });
      expect(createMock).not.toHaveBeenCalled();
      expect(await countJobs()).toBe(0);
    });

    it("refuses a second export while one is already in flight for the audit", async () => {
      await seedAudit();
      await seedJob({ id: "in-flight", status: "processing" });

      await expect(request("local_noauth")).rejects.toMatchObject({
        code: "CONFLICT",
      });
      expect(createMock).not.toHaveBeenCalled();
      // Only the pre-seeded in-flight job remains; no second one was queued.
      expect(await countJobs()).toBe(1);
    });
  });

  describe("resolveDownload", () => {
    it("returns the key only for the owning organization when ready and live", async () => {
      await seedAudit();
      await seedJob({
        id: "job-ready",
        status: "ready",
        r2Key: "audit-exports/job-ready.zip",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });

      const resolved = await AuditExportService.resolveDownload({
        organizationId: ORG_ID,
        jobId: "job-ready",
      });
      expect(resolved).toEqual({
        r2Key: "audit-exports/job-ready.zip",
        auditId: AUDIT_ID,
        // Defaulted by the schema, so a row written before the format column
        // existed still resolves as the ZIP it actually is.
        format: "zip",
      });
    });

    it("refuses a job owned by another organization", async () => {
      await seedAudit();
      await seedJob({
        id: "job-ready",
        status: "ready",
        r2Key: "k",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });

      const resolved = await AuditExportService.resolveDownload({
        organizationId: "other-org",
        jobId: "job-ready",
      });
      expect(resolved).toBeNull();
    });

    it("refuses an expired job", async () => {
      await seedAudit();
      await seedJob({
        id: "job-expired",
        status: "ready",
        r2Key: "k",
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      });

      const resolved = await AuditExportService.resolveDownload({
        organizationId: ORG_ID,
        jobId: "job-expired",
      });
      expect(resolved).toBeNull();
    });

    it("refuses a job that is not ready", async () => {
      await seedAudit();
      await seedJob({ id: "job-processing", status: "processing" });

      const resolved = await AuditExportService.resolveDownload({
        organizationId: ORG_ID,
        jobId: "job-processing",
      });
      expect(resolved).toBeNull();
    });
  });

  describe("listExports", () => {
    it("lists the project's jobs with downloadable computed, and scopes out others", async () => {
      await seedAudit();
      await seedJob({
        id: "job-ready",
        status: "ready",
        r2Key: "k",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
      await seedJob({ id: "job-processing", status: "processing" });

      const list = await AuditExportService.listExports({
        projectId: PROJECT_ID,
        auditId: AUDIT_ID,
      });
      const byId = Object.fromEntries(list.map((job) => [job.id, job]));
      expect(byId["job-ready"].downloadable).toBe(true);
      expect(byId["job-processing"].downloadable).toBe(false);

      const otherProject = await AuditExportService.listExports({
        projectId: "other-project",
        auditId: AUDIT_ID,
      });
      expect(otherProject).toHaveLength(0);
    });
  });
});
