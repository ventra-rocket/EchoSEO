/**
 * Per-organization SEO credential storage against a real SQLite database, so the
 * encrypt-at-rest round-trip, single-row upsert overwrite, and cascade-safe
 * remove run the way D1 runs them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";
import { organizationSeoCredentials } from "@/db/schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const {
  OrganizationSeoCredentialRepository,
  encryptDataforseoKey,
  decryptDataforseoKey,
} = await import("./OrganizationSeoCredentialRepository");

describe("OrganizationSeoCredentialRepository", () => {
  let harness: FreeCheckTestDb;

  beforeEach(async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-for-symmetric-crypto");
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
    await harness.db.insert(organization).values({
      id: "org1",
      name: "Org",
      slug: "org-1",
      createdAt: new Date(),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encrypts on write and decrypts back to the raw key", async () => {
    const raw = "bG9naW46cGFzc3dvcmQ="; // base64 login:password
    await OrganizationSeoCredentialRepository.upsert({
      organizationId: "org1",
      encryptedApiKey: await encryptDataforseoKey(raw),
      keyLast4: raw.slice(-4),
      createdByUserId: "user1",
    });

    const stored =
      await OrganizationSeoCredentialRepository.getEncrypted("org1");
    expect(stored).not.toBeNull();
    // Never store the key verbatim.
    expect(stored?.encryptedApiKey).not.toBe(raw);
    expect(stored?.keyLast4).toBe("cmQ=");
    expect(stored?.provider).toBe("dataforseo");
    expect(stored?.createdByUserId).toBe("user1");
    expect(await decryptDataforseoKey(stored!.encryptedApiKey)).toBe(raw);
  });

  it("overwrites the key in place on a second save (single row per org)", async () => {
    const first = await encryptDataforseoKey("first-key");
    const second = await encryptDataforseoKey("second-key");

    await OrganizationSeoCredentialRepository.upsert({
      organizationId: "org1",
      encryptedApiKey: first,
      keyLast4: "key1",
      createdByUserId: "user1",
    });
    await OrganizationSeoCredentialRepository.upsert({
      organizationId: "org1",
      encryptedApiKey: second,
      keyLast4: "key2",
      createdByUserId: "user2",
    });

    const rows = await harness.db.select().from(organizationSeoCredentials);
    expect(rows).toHaveLength(1);
    expect(await decryptDataforseoKey(rows[0].encryptedApiKey)).toBe(
      "second-key",
    );
    expect(rows[0].keyLast4).toBe("key2");
    // createdByUserId records the first setter and stays honest to its name.
    expect(rows[0].createdByUserId).toBe("user1");
  });

  it("removes the credential row", async () => {
    await OrganizationSeoCredentialRepository.upsert({
      organizationId: "org1",
      encryptedApiKey: await encryptDataforseoKey("some-key"),
      keyLast4: "-key",
      createdByUserId: "user1",
    });
    expect(
      await OrganizationSeoCredentialRepository.getEncrypted("org1"),
    ).not.toBeNull();

    await OrganizationSeoCredentialRepository.remove("org1");
    expect(
      await OrganizationSeoCredentialRepository.getEncrypted("org1"),
    ).toBeNull();
  });
});
