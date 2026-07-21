/**
 * The audit export Workflow against a real SQLite database. Verifies the full
 * assembly: page the materialized occurrences, build CSV/JSON/manifest, zip, and
 * commit the job `ready` with the artifact's size — and that a store failure
 * lands the job in `failed` rather than a half-written `ready`. Only the R2 store
 * and the Workflow runtime classes are mocked; the repositories are real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { unzipSync, strFromU8 } from "fflate";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";
import { projects } from "@/db/app.schema";
import { audits, auditSnapshots, auditTargets } from "@/db/audit.schema";
import { auditExportJobs } from "@/db/audit-export.schema";
import { auditIssueOccurrences } from "@/db/schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { putAuditExportMock } = vi.hoisted(() => ({
  putAuditExportMock:
    vi.fn<(jobId: string, zip: Uint8Array) => Promise<string>>(),
}));
vi.mock("cloudflare:workers", () => ({
  WorkflowEntrypoint: class {
    isBase = true;
  },
}));
vi.mock("cloudflare:workflows", () => ({
  NonRetryableError: class extends Error {},
}));
vi.mock("@/server/features/audit/exports/audit-export-store", () => ({
  putAuditExport: putAuditExportMock,
}));

const { runAuditExport } = await import("./AuditExportWorkflow");

const ORG_ID = "org1";
const PROJECT_ID = "proj1";
const TARGET_ID = "target1";
const AUDIT_ID = "audit1";
const JOB_ID = "job1";

// Executes each step body immediately, like the deep-check workflow test.
const fakeStep = {
  do: <T>(_name: string, callback: () => Promise<T> | T): Promise<T> =>
    Promise.resolve(callback()),
};

let harness: FreeCheckTestDb;

async function seedOccurrence(input: {
  id: string;
  url: string;
  ruleId?: string;
  severity?: string;
  evidenceJson?: string | null;
}) {
  await harness.db.insert(auditIssueOccurrences).values({
    id: input.id,
    auditId: AUDIT_ID,
    projectId: PROJECT_ID,
    ruleId: input.ruleId ?? "meta-title",
    ruleVersion: "2026-01-01",
    issueGroup: "content",
    severity: input.severity ?? "high",
    status: "fail",
    url: input.url,
    evidenceJson: input.evidenceJson ?? null,
  });
}

async function getJob() {
  const [job] = await harness.db.select().from(auditExportJobs).limit(1);
  return job ?? null;
}

describe("runAuditExport", () => {
  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
    putAuditExportMock.mockReset();
    putAuditExportMock.mockResolvedValue(`audit-exports/${JOB_ID}.zip`);

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
    });
    await harness.db.insert(audits).values({
      id: AUDIT_ID,
      projectId: PROJECT_ID,
      startedByUserId: "u1",
      startUrl: "https://example.com/",
      workflowInstanceId: AUDIT_ID,
      status: "completed",
    });
    await harness.db.insert(auditSnapshots).values({
      id: "snap1",
      auditId: AUDIT_ID,
      projectId: PROJECT_ID,
      targetId: TARGET_ID,
      pagesCrawled: 3,
      edgeCount: 0,
      lighthouseCount: 0,
      sealedAt: "2026-07-01T00:00:00.000Z",
      issuesMaterializedAt: "2026-07-01T00:00:00.000Z",
    });
    await harness.db.insert(auditExportJobs).values({
      id: JOB_ID,
      auditId: AUDIT_ID,
      projectId: PROJECT_ID,
      organizationId: ORG_ID,
      status: "queued",
      filtersJson: "{}",
      createdByUserId: "u1",
    });
  });

  it("builds a ZIP of csv+json+manifest and marks the job ready", async () => {
    await seedOccurrence({ id: "o1", url: "https://example.com/a" });
    await seedOccurrence({
      id: "o2",
      url: "https://example.com/b",
      evidenceJson: JSON.stringify({ found: "missing" }),
    });

    await runAuditExport(fakeStep, { jobId: JOB_ID });

    const job = await getJob();
    expect(job).toMatchObject({ status: "ready", rowCount: 2 });
    expect(job?.r2Key).toBe(`audit-exports/${JOB_ID}.zip`);
    expect(job?.expiresAt).not.toBeNull();

    const [, zip] = putAuditExportMock.mock.calls[0];
    const entries = unzipSync(zip);
    expect(Object.keys(entries).toSorted()).toEqual([
      "issues.csv",
      "issues.json",
      "manifest.json",
    ]);
    expect(JSON.parse(strFromU8(entries["manifest.json"]))).toMatchObject({
      rowCount: 2,
      provenance: "crawl",
    });
  });

  it("escapes a formula-injection URL through the whole pipeline", async () => {
    await seedOccurrence({ id: "o1", url: "=cmd|' /c calc'!A1" });

    await runAuditExport(fakeStep, { jobId: JOB_ID });

    const [, zip] = putAuditExportMock.mock.calls[0];
    const csv = strFromU8(unzipSync(zip)["issues.csv"]);
    expect(csv).toContain("'=cmd");
  });

  it("only exports occurrences matching a stored filter", async () => {
    await harness.db
      .update(auditExportJobs)
      .set({ filtersJson: JSON.stringify({ severity: "critical" }) })
      .where(eq(auditExportJobs.id, JOB_ID));
    await seedOccurrence({
      id: "o1",
      url: "https://example.com/a",
      severity: "high",
    });
    await seedOccurrence({
      id: "o2",
      url: "https://example.com/b",
      severity: "critical",
    });

    await runAuditExport(fakeStep, { jobId: JOB_ID });

    const job = await getJob();
    expect(job?.rowCount).toBe(1);
  });

  it("marks the job failed when the store write throws", async () => {
    await seedOccurrence({ id: "o1", url: "https://example.com/a" });
    putAuditExportMock.mockRejectedValueOnce(new Error("r2 down"));

    await expect(runAuditExport(fakeStep, { jobId: JOB_ID })).rejects.toThrow(
      "r2 down",
    );

    const job = await getJob();
    expect(job?.status).toBe("failed");
  });
});
