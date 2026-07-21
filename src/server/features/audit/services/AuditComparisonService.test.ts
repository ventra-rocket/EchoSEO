/**
 * Snapshot comparison against a real SQLite database.
 *
 * The contract under test is trust, not arithmetic (the diff itself is unit
 * tested in issue-delta.test.ts): a comparison must refuse an unmaterialized
 * snapshot instead of reading it as a wholesale resolution, must keep one
 * target's history isolated from another's, and must auto-pick a baseline that
 * can actually be diffed.
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

async function seedTarget(
  input: {
    projectId?: string;
    targetId?: string;
    origin?: string;
  } = {},
) {
  await harness.db.insert(auditTargets).values({
    id: input.targetId ?? TARGET_ID,
    projectId: input.projectId ?? PROJECT_ID,
    organizationId: ORG_ID,
    origin: input.origin ?? "https://example.com",
  });
}

/**
 * Seed a completed audit + its sealed snapshot + issue occurrences. `sealedAt`
 * is set explicitly so the ordering the baseline picker depends on is
 * deterministic; ISO strings sort chronologically as text.
 */
async function seedAudit(input: {
  auditId: string;
  projectId?: string;
  targetId?: string;
  sealedAt: string;
  materialized: boolean;
  occurrences: Array<{ ruleId: string; url: string }>;
}) {
  const projectId = input.projectId ?? PROJECT_ID;
  await harness.db.insert(audits).values({
    id: input.auditId,
    projectId,
    startedByUserId: "u1",
    startUrl: "https://example.com/",
    workflowInstanceId: input.auditId,
    status: "completed",
    completedAt: input.sealedAt,
  });
  await harness.db.insert(auditSnapshots).values({
    id: `snap-${input.auditId}`,
    auditId: input.auditId,
    projectId,
    targetId: input.targetId ?? TARGET_ID,
    pagesCrawled: 1,
    edgeCount: 0,
    lighthouseCount: 0,
    sealedAt: input.sealedAt,
    issuesMaterializedAt: input.materialized ? input.sealedAt : null,
  });
  for (const [index, occurrence] of input.occurrences.entries()) {
    await harness.db.insert(auditIssueOccurrences).values({
      id: `occ-${input.auditId}-${index}`,
      auditId: input.auditId,
      projectId,
      ruleId: occurrence.ruleId,
      ruleVersion: "2026-01-01",
      issueGroup: "content",
      severity: "high",
      status: "fail",
      url: occurrence.url,
    });
  }
}

describe("AuditComparisonService", () => {
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
      occurrences: [{ ruleId: "meta-title", url: "https://example.com/a" }],
    });

    const result = await AuditComparisonService.resolveComparison({
      auditId: "a1",
      projectId: PROJECT_ID,
    });

    expect(result.state).toBe("single_snapshot");
  });

  it("diffs two materialized snapshots and labels the source crawl", async () => {
    await seedAudit({
      auditId: "old",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: true,
      occurrences: [
        { ruleId: "meta-title", url: "https://example.com/a" }, // persists
        { ruleId: "meta-title", url: "https://example.com/c" }, // resolved
      ],
    });
    await seedAudit({
      auditId: "new",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: true,
      occurrences: [
        { ruleId: "meta-title", url: "https://example.com/a" }, // persists
        { ruleId: "meta-title", url: "https://example.com/b" }, // added
      ],
    });

    const result = await AuditComparisonService.resolveComparison({
      auditId: "new",
      projectId: PROJECT_ID,
    });

    expect(result.state).toBe("comparable");
    if (result.state !== "comparable") throw new Error("unreachable");
    expect(result.source).toBe("crawl");
    expect(result.baseline.auditId).toBe("old");
    expect(result.window).toEqual({
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-02-01T00:00:00.000Z",
    });
    expect(result.totals).toEqual({ added: 1, resolved: 1, persisting: 1 });
  });

  it("REFUSES to compare against an unmaterialized baseline instead of reporting it all resolved", async () => {
    // The deadly trap: an unmaterialized baseline has no occurrences, so a naive
    // diff would read every current-vs-baseline difference wrongly. Here the
    // baseline is unmaterialized; the gate must return not_comparable and never
    // a delta.
    await seedAudit({
      auditId: "old",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: false,
      occurrences: [],
    });
    await seedAudit({
      auditId: "new",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: true,
      occurrences: [{ ruleId: "meta-title", url: "https://example.com/a" }],
    });

    const result = await AuditComparisonService.resolveComparison({
      auditId: "new",
      projectId: PROJECT_ID,
    });

    // If the gate were removed, this would be "comparable" with a delta.
    expect(result.state).toBe("not_comparable");
    if (result.state !== "not_comparable") throw new Error("unreachable");
    expect(result.reason).toBe("baseline_not_materialized");
    expect(result).not.toHaveProperty("totals");
  });

  it("REFUSES to compare when the current crawl's issues never materialized (the all-resolved trap)", async () => {
    // Current unmaterialized (zero occurrences), baseline full: a naive diff
    // reads as "every issue resolved". The gate must stop that.
    await seedAudit({
      auditId: "old",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: true,
      occurrences: [
        { ruleId: "meta-title", url: "https://example.com/a" },
        { ruleId: "meta-title", url: "https://example.com/b" },
      ],
    });
    await seedAudit({
      auditId: "new",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: false,
      occurrences: [],
    });

    const result = await AuditComparisonService.resolveComparison({
      auditId: "new",
      projectId: PROJECT_ID,
    });

    expect(result.state).toBe("not_comparable");
    if (result.state !== "not_comparable") throw new Error("unreachable");
    expect(result.reason).toBe("current_not_materialized");
  });

  it("auto-picks the most recent MATERIALIZED prior, skipping an unmaterialized one", async () => {
    await seedAudit({
      auditId: "oldest",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: true,
      occurrences: [{ ruleId: "meta-title", url: "https://example.com/a" }],
    });
    await seedAudit({
      auditId: "middle-pending",
      sealedAt: "2026-01-15T00:00:00.000Z",
      materialized: false,
      occurrences: [],
    });
    await seedAudit({
      auditId: "current",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: true,
      occurrences: [{ ruleId: "meta-title", url: "https://example.com/a" }],
    });

    const result = await AuditComparisonService.resolveComparison({
      auditId: "current",
      projectId: PROJECT_ID,
    });

    expect(result.state).toBe("comparable");
    if (result.state !== "comparable") throw new Error("unreachable");
    // Skips middle-pending (unmaterialized) and picks the older analysable crawl.
    expect(result.baseline.auditId).toBe("oldest");
  });

  it("refuses an EXPLICIT unmaterialized baseline even when a materialized one exists", async () => {
    await seedAudit({
      auditId: "oldest",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: true,
      occurrences: [{ ruleId: "meta-title", url: "https://example.com/a" }],
    });
    await seedAudit({
      auditId: "middle-pending",
      sealedAt: "2026-01-15T00:00:00.000Z",
      materialized: false,
      occurrences: [],
    });
    await seedAudit({
      auditId: "current",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: true,
      occurrences: [{ ruleId: "meta-title", url: "https://example.com/a" }],
    });

    const result = await AuditComparisonService.resolveComparison({
      auditId: "current",
      projectId: PROJECT_ID,
      baselineAuditId: "middle-pending",
    });

    expect(result.state).toBe("not_comparable");
    if (result.state !== "not_comparable") throw new Error("unreachable");
    expect(result.reason).toBe("baseline_not_materialized");
  });

  it("refuses an explicit baseline NEWER than the viewed crawl, which would invert the delta", async () => {
    // Viewing an older audit while a newer crawl exists: naming the newer crawl
    // as the baseline would make "added" mean "later resolved". The picker never
    // offers it, and the server rejects it outright.
    await seedAudit({
      auditId: "old",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: true,
      occurrences: [{ ruleId: "meta-title", url: "https://example.com/a" }],
    });
    await seedAudit({
      auditId: "new",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: true,
      occurrences: [{ ruleId: "meta-title", url: "https://example.com/b" }],
    });

    await expect(
      AuditComparisonService.resolveComparison({
        auditId: "old",
        projectId: PROJECT_ID,
        baselineAuditId: "new",
      }),
    ).rejects.toThrow();
  });

  it("surfaces a fully-resolved rule with its remediation text", async () => {
    await seedAudit({
      auditId: "old",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: true,
      occurrences: [
        { ruleId: "meta-title", url: "https://example.com/a" },
        { ruleId: "structure-h1", url: "https://example.com/a" },
      ],
    });
    await seedAudit({
      auditId: "new",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: true,
      occurrences: [{ ruleId: "meta-title", url: "https://example.com/a" }],
    });

    const result = await AuditComparisonService.resolveComparison({
      auditId: "new",
      projectId: PROJECT_ID,
    });

    expect(result.state).toBe("comparable");
    if (result.state !== "comparable") throw new Error("unreachable");
    const resolved = result.resolvedOnlyRules.find(
      (rule) => rule.ruleId === "structure-h1",
    );
    expect(resolved?.resolvedCount).toBe(1);
    expect(resolved?.fix?.googleSourceUrl).toMatch(/^https:\/\//);
  });

  it("keeps one target's history isolated from another target", async () => {
    // A baseline from a different target must never be diffable — it would leak
    // another site's issues into this one's comparison.
    await seedTarget({ targetId: "target2", origin: "https://other.example" });
    await seedAudit({
      auditId: "other-audit",
      targetId: "target2",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: true,
      occurrences: [{ ruleId: "meta-title", url: "https://other.example/a" }],
    });
    await seedAudit({
      auditId: "current",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: true,
      occurrences: [{ ruleId: "meta-title", url: "https://example.com/a" }],
    });

    // No prior on this target → single snapshot, not a cross-target diff.
    const auto = await AuditComparisonService.resolveComparison({
      auditId: "current",
      projectId: PROJECT_ID,
    });
    expect(auto.state).toBe("single_snapshot");

    // Explicitly naming the other target's audit is rejected.
    await expect(
      AuditComparisonService.resolveComparison({
        auditId: "current",
        projectId: PROJECT_ID,
        baselineAuditId: "other-audit",
      }),
    ).rejects.toThrow();
  });

  it("refuses to compare an audit outside the caller's project", async () => {
    await seedAudit({
      auditId: "a1",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: true,
      occurrences: [{ ruleId: "meta-title", url: "https://example.com/a" }],
    });

    await expect(
      AuditComparisonService.resolveComparison({
        auditId: "a1",
        projectId: "someone-elses-project",
      }),
    ).rejects.toThrow();
  });

  it("lists sibling snapshots with materialization and current flags for the picker", async () => {
    await seedAudit({
      auditId: "old",
      sealedAt: "2026-01-01T00:00:00.000Z",
      materialized: false,
      occurrences: [],
    });
    await seedAudit({
      auditId: "new",
      sealedAt: "2026-02-01T00:00:00.000Z",
      materialized: true,
      occurrences: [{ ruleId: "meta-title", url: "https://example.com/a" }],
    });

    const snapshots = await AuditComparisonService.listComparableSnapshots({
      auditId: "new",
      projectId: PROJECT_ID,
    });

    expect(snapshots.map((s) => s.auditId)).toEqual(["new", "old"]);
    const current = snapshots.find((s) => s.auditId === "new");
    const prior = snapshots.find((s) => s.auditId === "old");
    expect(current).toMatchObject({ isCurrent: true, materialized: true });
    expect(prior).toMatchObject({ isCurrent: false, materialized: false });
  });
});
