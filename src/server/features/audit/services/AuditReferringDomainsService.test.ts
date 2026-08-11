/**
 * Off-page referring-domain signals against a real SQLite database.
 *
 * The contract under test is trust and spend discipline, not arithmetic: the
 * read must never call the paid provider and never invent a zero; a target's
 * readings must not leak to another target; and the credit-spending refresh must
 * refuse an unauthorized, unentitled or provider-disabled caller *before* any
 * provider call. The database and the role/target repositories are real; only
 * the three external boundaries (the provider client, the provider-enabled
 * check, and the managed-access billing check) are mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { member, organization, user } from "@/db/better-auth-schema";
import { projects } from "@/db/app.schema";
import {
  audits,
  auditReferringDomainSnapshots,
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

const {
  summaryMock,
  createProviderMock,
  providerAccessMock,
  managedAccessMock,
} = vi.hoisted(() => ({
  summaryMock: vi.fn(),
  createProviderMock: vi.fn(),
  providerAccessMock: vi.fn(),
  managedAccessMock: vi.fn(),
}));

vi.mock("@/server/lib/seo-data", () => ({
  createSeoDataProvider: createProviderMock,
}));
vi.mock(
  "@/server/features/backlinks/services/backlinks-provider-access",
  () => ({
    resolveBacklinksProviderAccess: providerAccessMock,
  }),
);
// The service asks the shared POLICY (which folds in open-access and the
// allowlist), not the raw Autumn fact — mocking the fact would let the service
// drift away from the policy again without a test noticing.
vi.mock("@/server/billing/subscription", () => ({
  orgMayUseManagedFeatures: managedAccessMock,
}));

const { AuditReferringDomainsService } =
  await import("./AuditReferringDomainsService");

const ORG_ID = "org1";
const PROJECT_ID = "proj1";
const TARGET_ID = "target1";
const USER_ID = "user1";
const AUDIT_ID = "audit1";
const ORIGIN = "https://example.com";
const START_URL = "https://example.com/";

const BILLING_CUSTOMER = {
  userId: USER_ID,
  userEmail: "u@example.com",
  organizationId: ORG_ID,
  projectId: PROJECT_ID,
};

let harness: FreeCheckTestDb;

async function seedTarget(id = TARGET_ID, origin = ORIGIN) {
  await harness.db.insert(auditTargets).values({
    id,
    projectId: PROJECT_ID,
    organizationId: ORG_ID,
    origin,
  });
}

async function seedAudit(startUrl = START_URL) {
  await harness.db.insert(audits).values({
    id: AUDIT_ID,
    projectId: PROJECT_ID,
    startedByUserId: USER_ID,
    startUrl,
    workflowInstanceId: AUDIT_ID,
    status: "completed",
  });
}

async function seedSnapshot(input: {
  id: string;
  targetId?: string;
  referringDomains: number;
  newReferringDomains?: number | null;
  lostReferringDomains?: number | null;
  coverage?: string;
  queriedAt: string;
}) {
  await harness.db.insert(auditReferringDomainSnapshots).values({
    id: input.id,
    projectId: PROJECT_ID,
    targetId: input.targetId ?? TARGET_ID,
    provider: "dataforseo",
    target: "example.com",
    coverage: input.coverage ?? "domain+subdomains",
    referringDomains: input.referringDomains,
    newReferringDomains: input.newReferringDomains ?? null,
    lostReferringDomains: input.lostReferringDomains ?? null,
    queriedAt: input.queriedAt,
    triggeredByUserId: USER_ID,
  });
}

/** A hosted membership so a hosted-mode caller resolves to a concrete role. */
async function seedHostedMember(role: string) {
  await harness.db.insert(user).values({
    id: USER_ID,
    name: "User",
    email: "u@example.com",
  });
  await harness.db.insert(member).values({
    id: "member1",
    organizationId: ORG_ID,
    userId: USER_ID,
    role,
    createdAt: new Date(),
  });
}

async function countSnapshots(): Promise<number> {
  const rows = await harness.db.select().from(auditReferringDomainSnapshots);
  return rows.length;
}

describe("AuditReferringDomainsService", () => {
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

    createProviderMock.mockReturnValue({
      backlinks: { summary: summaryMock },
    });
    providerAccessMock.mockResolvedValue({ enabled: true, message: null });
    managedAccessMock.mockResolvedValue(true);
    summaryMock.mockResolvedValue({
      referring_domains: 100,
      new_referring_domains: 10,
      lost_referring_domains: 3,
    });
  });

  describe("getSignals (read)", () => {
    it("never calls the provider and reports no_snapshot when there is no reading", async () => {
      await seedAudit();
      await seedTarget();

      const result = await AuditReferringDomainsService.getSignals({
        projectId: PROJECT_ID,
        auditId: AUDIT_ID,
      });

      expect(result.state).toBe("no_snapshot");
      expect(createProviderMock).not.toHaveBeenCalled();
    });

    it("reports no_snapshot when the target does not exist yet", async () => {
      await seedAudit();

      const result = await AuditReferringDomainsService.getSignals({
        projectId: PROJECT_ID,
        auditId: AUDIT_ID,
      });

      expect(result.state).toBe("no_snapshot");
    });

    it("keeps one target's readings from leaking to another", async () => {
      await seedAudit(); // origin https://example.com -> target1
      await seedTarget(TARGET_ID, ORIGIN);
      await seedTarget("target2", "https://other.com");
      // A reading exists, but for a different target.
      await seedSnapshot({
        id: "snap-other",
        targetId: "target2",
        referringDomains: 999,
        queriedAt: "2026-07-01T00:00:00.000Z",
      });

      const result = await AuditReferringDomainsService.getSignals({
        projectId: PROJECT_ID,
        auditId: AUDIT_ID,
      });

      expect(result.state).toBe("no_snapshot");
    });

    it("returns a single reading with no trend", async () => {
      await seedAudit();
      await seedTarget();
      await seedSnapshot({
        id: "snap1",
        referringDomains: 100,
        newReferringDomains: 5,
        lostReferringDomains: 2,
        queriedAt: "2026-07-01T00:00:00.000Z",
      });

      const result = await AuditReferringDomainsService.getSignals({
        projectId: PROJECT_ID,
        auditId: AUDIT_ID,
      });

      expect(result).toMatchObject({
        state: "ready",
        referringDomains: 100,
        newReferringDomains: 5,
        lostReferringDomains: 2,
        trend: null,
        provider: "dataforseo",
        coverage: "domain+subdomains",
      });
    });

    it("computes the snapshot-over-snapshot trend from the two latest readings", async () => {
      await seedAudit();
      await seedTarget();
      await seedSnapshot({
        id: "snap-old",
        referringDomains: 100,
        queriedAt: "2026-07-01T00:00:00.000Z",
      });
      await seedSnapshot({
        id: "snap-new",
        referringDomains: 132,
        queriedAt: "2026-07-15T00:00:00.000Z",
      });

      const result = await AuditReferringDomainsService.getSignals({
        projectId: PROJECT_ID,
        auditId: AUDIT_ID,
      });

      expect(result).toMatchObject({
        state: "ready",
        referringDomains: 132,
        trend: {
          delta: 32,
          previousReferringDomains: 100,
          from: "2026-07-01T00:00:00.000Z",
          to: "2026-07-15T00:00:00.000Z",
        },
      });
    });

    it("drops the trend when the previous reading used different coverage", async () => {
      await seedAudit();
      await seedTarget();
      await seedSnapshot({
        id: "snap-old",
        referringDomains: 100,
        coverage: "domain-only",
        queriedAt: "2026-07-01T00:00:00.000Z",
      });
      await seedSnapshot({
        id: "snap-new",
        referringDomains: 132,
        coverage: "domain+subdomains",
        queriedAt: "2026-07-15T00:00:00.000Z",
      });

      const result = await AuditReferringDomainsService.getSignals({
        projectId: PROJECT_ID,
        auditId: AUDIT_ID,
      });

      // A coverage change makes the delta a methodology artefact, so no trend.
      expect(result).toMatchObject({
        state: "ready",
        referringDomains: 132,
        trend: null,
      });
    });
  });

  describe("refreshSnapshot (mutation)", () => {
    const refresh = (
      authMode: "hosted" | "local_noauth" | "cloudflare_access",
    ) =>
      AuditReferringDomainsService.refreshSnapshot({
        projectId: PROJECT_ID,
        auditId: AUDIT_ID,
        actorUserId: USER_ID,
        organizationId: ORG_ID,
        authMode,
        billingCustomer: BILLING_CUSTOMER,
      });

    it("stores an aggregate reading and returns it, creating the target on first use", async () => {
      await seedAudit();

      const result = await refresh("local_noauth");

      expect(result).toMatchObject({
        state: "ready",
        referringDomains: 100,
        newReferringDomains: 10,
        lostReferringDomains: 3,
        provider: "dataforseo",
        coverage: "domain+subdomains",
      });
      // Exactly one paid call, and the stored reading records the queried
      // provider target as provenance.
      expect(summaryMock).toHaveBeenCalledTimes(1);
      const rows = await harness.db
        .select()
        .from(auditReferringDomainSnapshots);
      expect(rows).toHaveLength(1);
      expect(rows[0].target).toContain("example.com");
    });

    it("refuses a viewer and never calls the provider", async () => {
      await seedAudit();
      // Hosted mode with no membership row resolves to the read-only viewer.

      await expect(refresh("hosted")).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(createProviderMock).not.toHaveBeenCalled();
      expect(await countSnapshots()).toBe(0);
    });

    it("requires plan access in hosted mode and never calls the provider", async () => {
      await seedAudit();
      await seedHostedMember("owner");
      managedAccessMock.mockResolvedValue(false);

      await expect(refresh("hosted")).rejects.toMatchObject({
        code: "PAYMENT_REQUIRED",
      });
      expect(createProviderMock).not.toHaveBeenCalled();
      expect(await countSnapshots()).toBe(0);
    });

    it("refuses when the provider is not enabled and never calls it", async () => {
      await seedAudit();
      providerAccessMock.mockResolvedValue({
        enabled: false,
        message: "Backlinks is not enabled",
      });

      await expect(refresh("local_noauth")).rejects.toMatchObject({
        code: "BACKLINKS_NOT_ENABLED",
      });
      expect(createProviderMock).not.toHaveBeenCalled();
      expect(await countSnapshots()).toBe(0);
    });

    it("refuses a missing referring-domain count instead of storing a zero", async () => {
      await seedAudit();
      summaryMock.mockResolvedValue({ referring_domains: null });

      await expect(refresh("local_noauth")).rejects.toMatchObject({
        code: "UPSTREAM_UNAVAILABLE",
      });
      expect(await countSnapshots()).toBe(0);
    });

    it("stores a genuine zero from the provider as real data", async () => {
      await seedAudit();
      summaryMock.mockResolvedValue({
        referring_domains: 0,
        new_referring_domains: 0,
        lost_referring_domains: 0,
      });

      const result = await refresh("local_noauth");

      expect(result).toMatchObject({ state: "ready", referringDomains: 0 });
      expect(await countSnapshots()).toBe(1);
    });

    it("accepts the misspelled provider keys DataForSEO also ships", async () => {
      await seedAudit();
      summaryMock.mockResolvedValue({
        referring_domains: 50,
        new_reffering_domains: 7,
        lost_reffering_domains: 2,
      });

      const result = await refresh("local_noauth");

      expect(result).toMatchObject({
        state: "ready",
        referringDomains: 50,
        newReferringDomains: 7,
        lostReferringDomains: 2,
      });
    });
  });
});
