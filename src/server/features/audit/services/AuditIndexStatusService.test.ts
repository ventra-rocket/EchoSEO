/**
 * Google index-status against a real SQLite database. The contract under test is
 * isolation and authority, not GSC arithmetic: only an investigate-level caller
 * may inspect; a property that does not cover the audit's origin is refused
 * before any inspection; and a URL outside the origin is rejected without a call.
 * The database and the role repository are real; only the GSC boundary is mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";
import { projects } from "@/db/app.schema";
import { audits } from "@/db/audit.schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { getConnectionMock, inspectUrlsMock } = vi.hoisted(() => ({
  getConnectionMock: vi.fn(),
  inspectUrlsMock: vi.fn(),
}));

vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscService: {
    getConnection: getConnectionMock,
    inspectUrls: inspectUrlsMock,
  },
  GscNotConnectedError: class extends Error {},
  isExpectedGrantFailure: () => false,
}));

const { AuditIndexStatusService } = await import("./AuditIndexStatusService");

const ORG_ID = "org1";
const PROJECT_ID = "proj1";
const USER_ID = "user1";
const AUDIT_ID = "audit1";
const ORIGIN = "https://example.com";
const START_URL = "https://example.com/";
const MATCHING_PROPERTY = "sc-domain:example.com";

let harness: FreeCheckTestDb;

async function seedAudit() {
  await harness.db.insert(audits).values({
    id: AUDIT_ID,
    projectId: PROJECT_ID,
    startedByUserId: USER_ID,
    startUrl: START_URL,
    workflowInstanceId: AUDIT_ID,
    status: "completed",
  });
}

function matchingConnection() {
  return {
    siteUrl: MATCHING_PROPERTY,
    connectedByUserId: USER_ID,
    connectedAccountEmail: "e@example.com",
  };
}

const inspect = (
  url: string,
  authMode: "hosted" | "local_noauth" | "cloudflare_access" = "local_noauth",
) =>
  AuditIndexStatusService.inspectUrl({
    projectId: PROJECT_ID,
    auditId: AUDIT_ID,
    url,
    actorUserId: USER_ID,
    organizationId: ORG_ID,
    authMode,
  });

describe("AuditIndexStatusService", () => {
  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
    getConnectionMock.mockReset();
    inspectUrlsMock.mockReset();

    await harness.db.insert(organization).values({
      id: ORG_ID,
      name: "Org",
      slug: "org-1",
      createdAt: new Date(),
    });
    await harness.db
      .insert(projects)
      .values({ id: PROJECT_ID, organizationId: ORG_ID, name: "Project" });
    await seedAudit();
  });

  it("refuses a viewer and never resolves a connection", async () => {
    // Hosted with no membership row resolves to the read-only viewer.
    await expect(inspect(START_URL, "hosted")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(getConnectionMock).not.toHaveBeenCalled();
    expect(inspectUrlsMock).not.toHaveBeenCalled();
  });

  it("refuses a mismatched property before any inspection", async () => {
    getConnectionMock.mockResolvedValue({
      siteUrl: "https://other.com/",
      connectedByUserId: USER_ID,
      connectedAccountEmail: "e@example.com",
    });

    const result = await inspect(START_URL);

    expect(result).toEqual({
      state: "property_mismatch",
      property: "https://other.com/",
    });
    expect(inspectUrlsMock).not.toHaveBeenCalled();
  });

  it("refuses a same-host property scoped to a path — Search Console reports only on its own prefix, not the whole origin", async () => {
    // Pins propertyCoversOrigin's root-prefix requirement at this consumer:
    // same host as the audit's origin, but the property is scoped to /blog/,
    // so it must still be refused before any inspection.
    getConnectionMock.mockResolvedValue({
      siteUrl: "https://example.com/blog/",
      connectedByUserId: USER_ID,
      connectedAccountEmail: "e@example.com",
    });

    const result = await inspect(START_URL);

    expect(result).toEqual({
      state: "property_mismatch",
      property: "https://example.com/blog/",
    });
    expect(inspectUrlsMock).not.toHaveBeenCalled();
  });

  it("rejects a URL outside the audit origin without inspecting", async () => {
    getConnectionMock.mockResolvedValue(matchingConnection());

    const result = await inspect("https://evil.com/x");

    expect(result).toEqual({ state: "invalid_url" });
    expect(inspectUrlsMock).not.toHaveBeenCalled();
  });

  it("inspects a same-origin URL and maps the verdict", async () => {
    getConnectionMock.mockResolvedValue(matchingConnection());
    inspectUrlsMock.mockResolvedValue({
      siteUrl: MATCHING_PROPERTY,
      connectedBy: "e@example.com",
      results: [
        {
          url: `${ORIGIN}/a`,
          result: {
            indexStatusResult: {
              verdict: "PASS",
              coverageState: "Submitted and indexed",
            },
            inspectionResultLink: "https://search.google.com/x",
          },
        },
      ],
    });

    const result = await inspect(`${ORIGIN}/a`);

    expect(result).toMatchObject({
      state: "ready",
      property: MATCHING_PROPERTY,
      url: `${ORIGIN}/a`,
      inspection: {
        verdict: "PASS",
        coverageState: "Submitted and indexed",
        inspectionResultLink: "https://search.google.com/x",
      },
    });
    expect(inspectUrlsMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces a per-URL GSC failure as inspect_failed, not an empty ready", async () => {
    getConnectionMock.mockResolvedValue(matchingConnection());
    // inspectUrls captures a 429/403 per URL as a null result + error, not a throw.
    inspectUrlsMock.mockResolvedValue({
      siteUrl: MATCHING_PROPERTY,
      connectedBy: "e@example.com",
      results: [{ url: `${ORIGIN}/a`, result: null, error: "rate limit" }],
    });

    const result = await inspect(`${ORIGIN}/a`);

    expect(result).toEqual({ state: "inspect_failed" });
  });

  it("refuses when the query resolves a property that no longer covers the origin", async () => {
    getConnectionMock.mockResolvedValue(matchingConnection());
    // A setSite race: the pre-gate saw a covering property, the call resolved a
    // different one.
    inspectUrlsMock.mockResolvedValue({
      siteUrl: "https://other.com/",
      connectedBy: "e@example.com",
      results: [{ url: `${ORIGIN}/a`, result: {} }],
    });

    const result = await inspect(`${ORIGIN}/a`);

    expect(result).toEqual({
      state: "property_mismatch",
      property: "https://other.com/",
    });
  });

  describe("getContext", () => {
    it("reports property_mismatch for a non-covering property", async () => {
      getConnectionMock.mockResolvedValue({
        siteUrl: "https://other.com/",
        connectedByUserId: USER_ID,
        connectedAccountEmail: "e@example.com",
      });

      const result = await AuditIndexStatusService.getContext({
        projectId: PROJECT_ID,
        auditId: AUDIT_ID,
      });

      expect(result).toEqual({
        state: "property_mismatch",
        property: "https://other.com/",
      });
    });

    it("returns the property, deep link and start URL when connected and matching", async () => {
      getConnectionMock.mockResolvedValue(matchingConnection());

      const result = await AuditIndexStatusService.getContext({
        projectId: PROJECT_ID,
        auditId: AUDIT_ID,
      });

      expect(result).toEqual({
        state: "ready",
        property: MATCHING_PROPERTY,
        sitemapsDeepLink:
          "https://search.google.com/search-console/sitemaps?resource_id=sc-domain%3Aexample.com",
        startUrl: START_URL,
        missingFromSitemapCount: 0,
      });
    });
  });
});
