/**
 * Authorization and live-validation contract for the BYO DataForSEO key service,
 * exercised against a real SQLite database (no D1 mock) with the DataForSEO probe
 * stubbed. The load-bearing guarantees: only owner/admin can write, a key is
 * validated live before it is stored, and a rejected or malformed key never
 * reaches the database.
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

let harness: FreeCheckTestDb;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

function okResponse() {
  return new Response(null, { status: 200 });
}
function unauthorizedResponse() {
  return new Response(null, { status: 401 });
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
    fetchMock.mockResolvedValue(okResponse());

    const result = await DataforseoKeyService.save({
      apiKey: VALID_KEY,
      userId: "owner1",
      organizationId: ORG_ID,
      authMode: "hosted",
    });

    expect(result).toEqual({ source: "org", last4: "cmQ=" });
    const row = await storedRow();
    expect(row?.keyLast4).toBe("cmQ=");
    // Stored encrypted, never verbatim, and decrypts back to the raw key.
    expect(row?.encryptedApiKey).not.toBe(VALID_KEY);
    expect(await decryptDataforseoKey(row.encryptedApiKey)).toBe(VALID_KEY);
    expect(row?.createdByUserId).toBe("owner1");
  });

  it("lets a hosted admin save a validated key", async () => {
    await seedMember("admin1", "admin");
    fetchMock.mockResolvedValue(okResponse());

    await expect(
      DataforseoKeyService.save({
        apiKey: VALID_KEY,
        userId: "admin1",
        organizationId: ORG_ID,
        authMode: "hosted",
      }),
    ).resolves.toEqual({ source: "org", last4: "cmQ=" });
    expect(await storedRow()).not.toBeUndefined();
  });

  it("treats a delegated (non-hosted) caller as owner", async () => {
    fetchMock.mockResolvedValue(okResponse());

    await expect(
      DataforseoKeyService.save({
        apiKey: VALID_KEY,
        userId: "solo",
        organizationId: ORG_ID,
        authMode: "local_noauth",
      }),
    ).resolves.toEqual({ source: "org", last4: "cmQ=" });
  });
});

describe("DataforseoKeyService validation", () => {
  it("rejects a key DataForSEO refuses and stores nothing", async () => {
    await seedMember("owner1", "owner");
    fetchMock.mockResolvedValue(unauthorizedResponse());

    await expect(
      DataforseoKeyService.save({
        apiKey: VALID_KEY,
        userId: "owner1",
        organizationId: ORG_ID,
        authMode: "hosted",
      }),
    ).rejects.toMatchObject({ code: "DATAFORSEO_AUTH_FAILED" });

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

  it("sends only a fixed DataForSEO URL with a Basic auth header", async () => {
    await seedMember("owner1", "owner");
    fetchMock.mockResolvedValue(okResponse());

    await DataforseoKeyService.save({
      apiKey: VALID_KEY,
      userId: "owner1",
      organizationId: ORG_ID,
      authMode: "hosted",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.dataforseo.com/v3/appendix/user_data");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      `Basic ${VALID_KEY}`,
    );
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
    });

    expect(status).toEqual({
      configured: false,
      source: "none",
      last4: null,
      canManage: true,
    });
  });

  it("falls back to the global key when no org key is set", async () => {
    await seedMember("owner1", "owner");

    const status = await DataforseoKeyService.getStatus({
      userId: "owner1",
      organizationId: ORG_ID,
      authMode: "hosted",
      globalApiKey: "platform-default",
    });

    expect(status).toEqual({
      configured: true,
      source: "global",
      last4: null,
      canManage: true,
    });
  });

  it("prefers the org key and exposes only its last-4", async () => {
    await seedMember("owner1", "owner");
    fetchMock.mockResolvedValue(okResponse());
    await DataforseoKeyService.save({
      apiKey: VALID_KEY,
      userId: "owner1",
      organizationId: ORG_ID,
      authMode: "hosted",
    });

    const status = await DataforseoKeyService.getStatus({
      userId: "owner1",
      organizationId: ORG_ID,
      authMode: "hosted",
      // Even with a global key present, the org key wins.
      globalApiKey: "platform-default",
    });

    expect(status).toEqual({
      configured: true,
      source: "org",
      last4: "cmQ=",
      canManage: true,
    });
  });

  it("reports canManage=false for a hosted viewer", async () => {
    await seedMember("viewer1", "viewer");

    const status = await DataforseoKeyService.getStatus({
      userId: "viewer1",
      organizationId: ORG_ID,
      authMode: "hosted",
      globalApiKey: undefined,
    });

    expect(status.canManage).toBe(false);
  });
});
