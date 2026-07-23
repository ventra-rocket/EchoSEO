/**
 * IndexNow submission against a real SQLite database. The contract under test is
 * authority and honesty, not arithmetic: only an owner/admin may submit; nothing
 * is POSTed unless the target's key file is live; and every attempt is logged
 * with a truthful status. The database and the role/target/action repositories
 * are real; only the SSRF URL guard and the network (`fetch`) are mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { member, organization, user } from "@/db/better-auth-schema";
import { projects } from "@/db/app.schema";
import { auditPages, auditTargets, audits } from "@/db/audit.schema";
import { auditActions } from "@/db/audit-action.schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

// Bypass the SSRF guard's DoH resolution in the test; it is exercised by
// url-policy's own tests. Here it just echoes the key-file URL through.
vi.mock("@/server/lib/audit/url-policy", () => ({
  normalizeAndValidateStartUrl: (url: string) => Promise.resolve(url),
}));

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);

const { IndexNowService } = await import("./IndexNowService");
const { INDEXNOW_ENDPOINT } =
  await import("@/server/features/audit/indexnow/indexnow");

const ORG_ID = "org1";
const PROJECT_ID = "proj1";
const TARGET_ID = "target1";
const USER_ID = "user1";
const AUDIT_ID = "audit1";
const ORIGIN = "https://example.com";
const KEY = "abcdef0123456789abcdef0123456789";

let harness: FreeCheckTestDb;

async function seedTarget(key: string | null = KEY) {
  await harness.db.insert(auditTargets).values({
    id: TARGET_ID,
    projectId: PROJECT_ID,
    organizationId: ORG_ID,
    origin: ORIGIN,
    indexnowKey: key,
  });
}

async function seedAudit() {
  await harness.db.insert(audits).values({
    id: AUDIT_ID,
    projectId: PROJECT_ID,
    startedByUserId: USER_ID,
    startUrl: `${ORIGIN}/`,
    workflowInstanceId: AUDIT_ID,
    status: "completed",
  });
}

async function seedIndexablePage(url: string) {
  await harness.db.insert(auditPages).values({
    id: `page-${url}`,
    auditId: AUDIT_ID,
    url,
    statusCode: 200,
    isIndexable: true,
    isHtml: true,
  });
}

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

async function listActions() {
  return harness.db.select().from(auditActions);
}

/** Route the mocked fetch: key file GET vs the IndexNow POST. */
function mockNetwork(input: {
  keyFileBody: string | null;
  indexNowStatus: number | "throw";
}) {
  fetchMock.mockImplementation((url: string) => {
    if (url === INDEXNOW_ENDPOINT) {
      if (input.indexNowStatus === "throw") {
        return Promise.reject(new Error("network"));
      }
      return Promise.resolve(
        new Response(null, { status: input.indexNowStatus }),
      );
    }
    // The key-file GET.
    if (input.keyFileBody === null) {
      return Promise.resolve(new Response("nope", { status: 404 }));
    }
    return Promise.resolve(new Response(input.keyFileBody, { status: 200 }));
  });
}

const submit = (authMode: "hosted" | "local_noauth" | "cloudflare_access") =>
  IndexNowService.submit({
    projectId: PROJECT_ID,
    auditId: AUDIT_ID,
    actorUserId: USER_ID,
    organizationId: ORG_ID,
    authMode,
  });

describe("IndexNowService.submit", () => {
  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
    fetchMock.mockReset();

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

  it("refuses an editor and never touches the network or the log", async () => {
    await seedAudit();
    await seedTarget();
    await seedIndexablePage(`${ORIGIN}/a`);
    await seedHostedMember("editor"); // maps below owner/admin

    await expect(submit("hosted")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await listActions()).toHaveLength(0);
  });

  it("does not POST or log when the key file is not live", async () => {
    await seedAudit();
    await seedTarget();
    await seedIndexablePage(`${ORIGIN}/a`);
    mockNetwork({ keyFileBody: "some-other-content", indexNowStatus: 200 });

    const result = await submit("local_noauth");

    expect(result).toEqual({ outcome: "not_verified" });
    expect(
      fetchMock.mock.calls.some((call) => call[0] === INDEXNOW_ENDPOINT),
    ).toBe(false);
    expect(await listActions()).toHaveLength(0);
  });

  it("submits indexable URLs and logs a succeeded action on a 200", async () => {
    await seedAudit();
    await seedTarget();
    await seedIndexablePage(`${ORIGIN}/a`);
    await seedIndexablePage(`${ORIGIN}/b`);
    mockNetwork({ keyFileBody: KEY, indexNowStatus: 200 });

    const result = await submit("local_noauth");

    expect(result).toEqual({
      outcome: "submitted",
      status: "succeeded",
      submittedCount: 2,
      httpStatus: 200,
    });
    const actions = await listActions();
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      status: "succeeded",
      submittedCount: 2,
      provider: "indexnow",
    });
  });

  it("logs a failed action with a null status when the POST throws", async () => {
    await seedAudit();
    await seedTarget();
    await seedIndexablePage(`${ORIGIN}/a`);
    mockNetwork({ keyFileBody: KEY, indexNowStatus: "throw" });

    const result = await submit("local_noauth");

    expect(result).toEqual({
      outcome: "submitted",
      status: "failed",
      submittedCount: 1,
      httpStatus: null,
    });
    const actions = await listActions();
    expect(actions).toHaveLength(1);
    expect(actions[0]?.status).toBe("failed");
  });
});
