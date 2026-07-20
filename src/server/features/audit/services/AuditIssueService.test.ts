/**
 * Issue materialization and querying against a real SQLite database.
 *
 * The rules are unit-tested elsewhere; what has to hold here is the storage
 * contract: only a sealed snapshot materializes, a re-run converges instead of
 * duplicating, and filtering/paging happen in SQL rather than in the caller.
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
  auditIssueOccurrences,
  auditIssueRollups,
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

const { AuditIssueService } = await import("./AuditIssueService");

const AUDIT_ID = "audit1";
const PROJECT_ID = "proj1";

async function seedPage(
  harness: FreeCheckTestDb,
  id: string,
  url: string,
  overrides: Record<string, unknown> = {},
) {
  await harness.db.insert(auditPages).values({
    id,
    auditId: AUDIT_ID,
    url,
    statusCode: 200,
    // A page with no title and no H1 fails two rules deterministically.
    title: null,
    h1Count: 0,
    wordCount: 500,
    canonicalUrl: url,
    hasStructuredData: true,
    ...overrides,
  });
}

async function sealSnapshot(harness: FreeCheckTestDb) {
  await harness.db.insert(auditSnapshots).values({
    id: "snap1",
    auditId: AUDIT_ID,
    projectId: PROJECT_ID,
    targetId: "target1",
    pagesCrawled: 1,
    edgeCount: 0,
    lighthouseCount: 0,
  });
}

describe("AuditIssueService", () => {
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
      .values({ id: PROJECT_ID, organizationId: "org1", name: "Project" });
    await harness.db.insert(auditTargets).values({
      id: "target1",
      projectId: PROJECT_ID,
      organizationId: "org1",
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
  });

  it("materializes nothing until the snapshot is sealed", async () => {
    await seedPage(harness, "p1", "https://example.com/");

    const result = await AuditIssueService.materializeForAudit({
      auditId: AUDIT_ID,
      projectId: PROJECT_ID,
    });

    expect(result.materialized).toBe(false);
    const rows = await harness.db
      .select()
      .from(auditIssueOccurrences)
      .where(eq(auditIssueOccurrences.auditId, AUDIT_ID));
    expect(rows).toHaveLength(0);
  });

  it("materializes occurrences and rollups from a sealed snapshot", async () => {
    await seedPage(harness, "p1", "https://example.com/");
    await sealSnapshot(harness);

    const result = await AuditIssueService.materializeForAudit({
      auditId: AUDIT_ID,
      projectId: PROJECT_ID,
    });

    expect(result.materialized).toBe(true);
    expect(result.occurrenceCount).toBeGreaterThan(0);

    const occurrences = await harness.db
      .select()
      .from(auditIssueOccurrences)
      .where(eq(auditIssueOccurrences.auditId, AUDIT_ID));
    const ruleIds = occurrences.map((row) => row.ruleId);

    expect(ruleIds).toContain("meta-title");
    expect(ruleIds).toContain("structure-h1");
    // Only warn/fail are stored; a passing rule is not an issue.
    expect(ruleIds).not.toContain("meta-canonical");
    expect(occurrences.every((row) => row.ruleVersion.length > 0)).toBe(true);
    expect(occurrences.every((row) => row.projectId === PROJECT_ID)).toBe(true);

    const rollups = await harness.db
      .select()
      .from(auditIssueRollups)
      .where(eq(auditIssueRollups.auditId, AUDIT_ID));
    expect(rollups.find((row) => row.ruleId === "meta-title")?.urlCount).toBe(
      1,
    );
  });

  it("converges instead of duplicating when materialization re-runs", async () => {
    await seedPage(harness, "p1", "https://example.com/");
    await sealSnapshot(harness);

    await AuditIssueService.materializeForAudit({
      auditId: AUDIT_ID,
      projectId: PROJECT_ID,
    });
    await AuditIssueService.materializeForAudit({
      auditId: AUDIT_ID,
      projectId: PROJECT_ID,
    });

    const occurrences = await harness.db
      .select()
      .from(auditIssueOccurrences)
      .where(eq(auditIssueOccurrences.auditId, AUDIT_ID));
    const rollups = await harness.db
      .select()
      .from(auditIssueRollups)
      .where(eq(auditIssueRollups.auditId, AUDIT_ID));

    const titleOccurrences = occurrences.filter(
      (row) => row.ruleId === "meta-title",
    );
    expect(titleOccurrences).toHaveLength(1);
    expect(rollups.filter((row) => row.ruleId === "meta-title")).toHaveLength(
      1,
    );
  });

  it("filters and pages occurrences in SQL", async () => {
    await seedPage(harness, "p1", "https://example.com/alpha");
    await seedPage(harness, "p2", "https://example.com/beta");
    await sealSnapshot(harness);
    await AuditIssueService.materializeForAudit({
      auditId: AUDIT_ID,
      projectId: PROJECT_ID,
    });

    const byRule = await AuditIssueService.listIssueOccurrences({
      auditId: AUDIT_ID,
      projectId: PROJECT_ID,
      ruleId: "meta-title",
    });
    expect(byRule.total).toBe(2);

    const firstPage = await AuditIssueService.listIssueOccurrences({
      auditId: AUDIT_ID,
      projectId: PROJECT_ID,
      ruleId: "meta-title",
      limit: 1,
    });
    expect(firstPage.occurrences).toHaveLength(1);
    expect(firstPage.total).toBe(2);

    const byUrl = await AuditIssueService.listIssueOccurrences({
      auditId: AUDIT_ID,
      projectId: PROJECT_ID,
      urlContains: "beta",
    });
    expect(byUrl.occurrences.every((row) => row.url.includes("beta"))).toBe(
      true,
    );

    const byGroup = await AuditIssueService.listIssueOccurrences({
      auditId: AUDIT_ID,
      projectId: PROJECT_ID,
      issueGroup: "content",
    });
    expect(byGroup.total).toBeGreaterThan(0);
  });

  it("refuses to read issues for an audit outside the project", async () => {
    await seedPage(harness, "p1", "https://example.com/");
    await sealSnapshot(harness);

    await expect(
      AuditIssueService.getIssueSummary(AUDIT_ID, "someone-elses-project"),
    ).rejects.toThrow();
  });
});
