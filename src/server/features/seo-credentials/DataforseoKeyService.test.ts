/**
 * Authorization and live-validation contract for the BYO DataForSEO key service,
 * exercised against a real SQLite database (no D1 mock) with the DataForSEO probe
 * stubbed. The load-bearing guarantees: only owner/admin can write, a key is
 * validated live before it is stored, a rejected or malformed key never reaches
 * the database, and the reported account readiness is never stronger than what
 * the probes actually established.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { member, organization, user } from "@/db/better-auth-schema";
import { organizationSeoCredentials } from "@/db/schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { DataforseoKeyService } = await import("./DataforseoKeyService");
const { decryptDataforseoKey } =
  await import("./OrganizationSeoCredentialRepository");

const ORG_ID = "org1";
// Base64 of "login:password"; last 4 chars are "cmQ=".
const VALID_KEY = "bG9naW46cGFzc3dvcmQ=";

const USER_DATA_URL = "https://api.dataforseo.com/v3/appendix/user_data";
const READINESS_URL =
  "https://api.dataforseo.com/v3/dataforseo_labs/google/domain_rank_overview/live";

let harness: FreeCheckTestDb;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

function okResponse() {
  return new Response(null, { status: 200 });
}
function unauthorizedResponse() {
  return new Response(null, { status: 401 });
}

/** Route each probe separately: the free auth probe and the billable readiness
 * probe answer independently, and every readiness case turns on that split. */
function mockProbes(readiness: () => Response | Promise<Response>) {
  fetchMock.mockImplementation((url) =>
    url === USER_DATA_URL
      ? Promise.resolve(okResponse())
      : Promise.resolve(readiness()),
  );
}

/** Credential authenticates and the account answers a billable request. */
function mockServingAccount() {
  mockProbes(() =>
    Response.json({ status_code: 20000, tasks: [{ status_code: 20000 }] }),
  );
}

/** Seed the organization plus, in hosted mode, a member row with the given role. */
async function seedMember(userId: string, role: string) {
  await harness.db.insert(user).values({
    id: userId,
    name: userId,
    email: `${userId}@example.com`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await harness.db.insert(member).values({
    id: `member-${userId}`,
    organizationId: ORG_ID,
    userId,
    role,
    createdAt: new Date(),
  });
}

/** The common case: the seeded owner saves the one valid key. Spelled out
 * where a test turns on the caller or the key, inlined everywhere else. */
function saveAsOwner() {
  return DataforseoKeyService.save({
    apiKey: VALID_KEY,
    userId: "owner1",
    organizationId: ORG_ID,
    authMode: "hosted",
  });
}

async function storedRow() {
  const rows = await harness.db.select().from(organizationSeoCredentials);
  return rows[0];
}

beforeEach(async () => {
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-for-symmetric-crypto");
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  harness = await createFreeCheckTestDb();
  testDb.current = harness.db;
  await harness.db.insert(organization).values({
    id: ORG_ID,
    name: "Org",
    slug: "org-1",
    createdAt: new Date(),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("DataforseoKeyService authorization", () => {
  it("blocks a hosted viewer from saving or removing (fail-closed)", async () => {
    await seedMember("viewer1", "viewer");

    await expect(
      DataforseoKeyService.save({
        apiKey: VALID_KEY,
        userId: "viewer1",
        organizationId: ORG_ID,
        authMode: "hosted",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      DataforseoKeyService.remove({
        userId: "viewer1",
        organizationId: ORG_ID,
        authMode: "hosted",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // A blocked caller must never reach the live probe or the database.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await storedRow()).toBeUndefined();
  });

  it("lets a hosted owner save a validated key", async () => {
    await seedMember("owner1", "owner");
    mockServingAccount();

    const result = await saveAsOwner();

    expect(result).toEqual({
      source: "org",
      last4: "cmQ=",
      readiness: "ready",
    });
    const row = await storedRow();
    expect(row?.keyLast4).toBe("cmQ=");
    // Stored encrypted, never verbatim, and decrypts back to the raw key.
    expect(row?.encryptedApiKey).not.toBe(VALID_KEY);
    expect(await decryptDataforseoKey(row.encryptedApiKey)).toBe(VALID_KEY);
    expect(row?.createdByUserId).toBe("owner1");
  });

  it("lets a hosted admin save a validated key", async () => {
    await seedMember("admin1", "admin");
    mockServingAccount();

    await expect(
      DataforseoKeyService.save({
        apiKey: VALID_KEY,
        userId: "admin1",
        organizationId: ORG_ID,
        authMode: "hosted",
      }),
    ).resolves.toEqual({
      source: "org",
      last4: "cmQ=",
      readiness: "ready",
    });
    expect(await storedRow()).not.toBeUndefined();
  });

  it("treats a delegated (non-hosted) caller as owner", async () => {
    mockServingAccount();

    await expect(
      DataforseoKeyService.save({
        apiKey: VALID_KEY,
        userId: "solo",
        organizationId: ORG_ID,
        authMode: "local_noauth",
      }),
    ).resolves.toEqual({
      source: "org",
      last4: "cmQ=",
      readiness: "ready",
    });
  });
});

describe("DataforseoKeyService validation", () => {
  it("rejects a key DataForSEO refuses and stores nothing", async () => {
    await seedMember("owner1", "owner");
    fetchMock.mockResolvedValue(unauthorizedResponse());

    await expect(saveAsOwner()).rejects.toMatchObject({
      code: "DATAFORSEO_AUTH_FAILED",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await storedRow()).toBeUndefined();
  });

  it("rejects a malformed key before calling DataForSEO", async () => {
    await seedMember("owner1", "owner");

    await expect(
      DataforseoKeyService.save({
        apiKey: "not a base64 key!",
        userId: "owner1",
        organizationId: ORG_ID,
        authMode: "hosted",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await storedRow()).toBeUndefined();
  });

  it("sends only fixed DataForSEO URLs with a Basic auth header", async () => {
    await seedMember("owner1", "owner");
    mockServingAccount();

    await saveAsOwner();

    // Neither host nor payload may come from the pasted key, so a save can
    // never be turned into a request at an attacker-chosen URL.
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      USER_DATA_URL,
      READINESS_URL,
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        `Basic ${VALID_KEY}`,
      );
    }
    const readinessBody = fetchMock.mock.calls[1][1]?.body;
    if (typeof readinessBody !== "string") {
      throw new Error("readiness probe should send a JSON string body");
    }
    expect(JSON.parse(readinessBody)).toEqual([
      { target: "example.com", location_code: 2840, language_code: "en" },
    ]);
  });
});

describe("DataforseoKeyService account readiness", () => {
  /** The production failure this probe exists for: a genuine key on an account
   * DataForSEO answers `40104` for. The key is real, so it is still stored. */
  it("reports not_serving on a 403 and still stores the key", async () => {
    await seedMember("owner1", "owner");
    mockProbes(() => new Response(null, { status: 403 }));

    await expect(saveAsOwner()).resolves.toEqual({
      source: "org",
      last4: "cmQ=",
      readiness: "not_serving",
    });
    expect(await storedRow()).not.toBeUndefined();
  });

  it("reports not_serving when a 200 carries an account-refusal status", async () => {
    await seedMember("owner1", "owner");
    mockProbes(() =>
      Response.json({
        status_code: 40104,
        status_message: "Please verify your account before using the API.",
      }),
    );

    await expect(saveAsOwner()).resolves.toMatchObject({
      readiness: "not_serving",
    });
  });

  it("reports not_serving when only the task-level status refuses", async () => {
    await seedMember("owner1", "owner");
    mockProbes(() =>
      Response.json({ status_code: 20000, tasks: [{ status_code: 40200 }] }),
    );

    await expect(saveAsOwner()).resolves.toMatchObject({
      readiness: "not_serving",
    });
  });

  /** Transient limits share the 402xx prefix with the real refusals. Calling
   * them not_serving would tell someone their account is broken because they
   * were briefly busy — the same overreach this probe exists to end. */
  it.each([
    ["a rate limit", 40202],
    ["an hourly duplicate-task limit", 40205],
    ["a daily duplicate-task limit", 40206],
    ["too many simultaneous queries", 40209],
  ])("reports unknown, not not_serving, for %s", async (_label, status) => {
    await seedMember("owner1", "owner");
    mockProbes(() => Response.json({ status_code: status }));

    await expect(saveAsOwner()).resolves.toMatchObject({
      readiness: "unknown",
    });
  });

  /** An outage says nothing about the account, so it must not be reported as
   * either verdict — that overreach is the bug this probe was added to end. */
  it("reports unknown when the readiness probe cannot be reached", async () => {
    await seedMember("owner1", "owner");
    mockProbes(() => Promise.reject(new Error("network down")));

    await expect(saveAsOwner()).resolves.toMatchObject({
      readiness: "unknown",
    });
    expect(await storedRow()).not.toBeUndefined();
  });

  it("reports unknown on a 5xx from the readiness probe", async () => {
    await seedMember("owner1", "owner");
    mockProbes(() => new Response(null, { status: 503 }));

    await expect(saveAsOwner()).resolves.toMatchObject({
      readiness: "unknown",
    });
  });

  it("reports unknown when the envelope is not recognisable", async () => {
    await seedMember("owner1", "owner");
    mockProbes(() => Response.json({ unexpected: true }));

    await expect(saveAsOwner()).resolves.toMatchObject({
      readiness: "unknown",
    });
  });

  it("spends nothing on the readiness probe when the credential is rejected", async () => {
    await seedMember("owner1", "owner");
    fetchMock.mockResolvedValue(unauthorizedResponse());

    await expect(saveAsOwner()).rejects.toMatchObject({
      code: "DATAFORSEO_AUTH_FAILED",
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([USER_DATA_URL]);
  });
});

describe("DataforseoKeyService.getStatus", () => {
  it("reports none when neither an org key nor a global key exists", async () => {
    await seedMember("owner1", "owner");

    const status = await DataforseoKeyService.getStatus({
      userId: "owner1",
      organizationId: ORG_ID,
      authMode: "hosted",
      globalApiKey: undefined,
      hostedAccessOpen: false,
    });

    expect(status).toEqual({
      configured: false,
      source: "none",
      last4: null,
      canManage: true,
      platformDefaultAvailable: false,
    });
  });

  it("falls back to the global key when no org key is set", async () => {
    await seedMember("owner1", "owner");

    const status = await DataforseoKeyService.getStatus({
      userId: "owner1",
      organizationId: ORG_ID,
      authMode: "hosted",
      globalApiKey: "platform-default",
      hostedAccessOpen: false,
    });

    expect(status).toEqual({
      configured: true,
      source: "global",
      last4: null,
      canManage: true,
      platformDefaultAvailable: true,
    });
  });

  it("invites hosted open-access organizations to add their own key", async () => {
    await seedMember("owner1", "owner");

    const status = await DataforseoKeyService.getStatus({
      userId: "owner1",
      organizationId: ORG_ID,
      authMode: "hosted",
      globalApiKey: "platform-default",
      hostedAccessOpen: true,
    });

    expect(status).toEqual({
      configured: false,
      source: "none",
      last4: null,
      canManage: true,
      platformDefaultAvailable: false,
    });
  });

  it("prefers the org key and exposes only its last-4", async () => {
    await seedMember("owner1", "owner");
    mockServingAccount();
    await saveAsOwner();

    const status = await DataforseoKeyService.getStatus({
      userId: "owner1",
      organizationId: ORG_ID,
      authMode: "hosted",
      // Even with a global key present, the org key wins.
      globalApiKey: "platform-default",
      hostedAccessOpen: true,
    });

    expect(status).toEqual({
      configured: true,
      source: "org",
      last4: "cmQ=",
      canManage: true,
      // Hosted open access refuses the global key, so removing the org key would
      // fall back to nothing: the settings card must not offer that.
      platformDefaultAvailable: false,
    });
  });

  /** The settings copy "leave this empty to use the platform default" is only
   * true where the runtime would actually spend the operator's key. */
  it("reports a reachable platform default behind an org key on a metered deployment", async () => {
    await seedMember("owner1", "owner");
    mockServingAccount();
    await saveAsOwner();

    const status = await DataforseoKeyService.getStatus({
      userId: "owner1",
      organizationId: ORG_ID,
      authMode: "hosted",
      globalApiKey: "platform-default",
      hostedAccessOpen: false,
    });

    expect(status.source).toBe("org");
    expect(status.platformDefaultAvailable).toBe(true);
  });

  it("reports canManage=false for a hosted viewer", async () => {
    await seedMember("viewer1", "viewer");

    const status = await DataforseoKeyService.getStatus({
      userId: "viewer1",
      organizationId: ORG_ID,
      authMode: "hosted",
      globalApiKey: undefined,
      hostedAccessOpen: false,
    });

    expect(status.canManage).toBe(false);
  });
});
