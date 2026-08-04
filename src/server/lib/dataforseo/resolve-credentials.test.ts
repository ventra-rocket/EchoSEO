/**
 * DataForSEO key resolution precedence: per-organization BYO key → global
 * operator env key → none. Runs against a real SQLite database so the stored
 * decrypt path is exercised, not stubbed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { resolveDataforseoCredentials } = await import("./resolve-credentials");
const { OrganizationSeoCredentialRepository, encryptDataforseoKey } =
  await import("@/server/features/seo-credentials/OrganizationSeoCredentialRepository");

describe("resolveDataforseoCredentials", () => {
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

  it("prefers the organization's own key when present", async () => {
    // A stored org key wins even if a global env key also exists.
    vi.stubEnv("DATAFORSEO_API_KEY", "global-key");
    await OrganizationSeoCredentialRepository.upsert({
      organizationId: "org1",
      encryptedApiKey: await encryptDataforseoKey("org-key"),
      keyLast4: "-key",
      createdByUserId: "user1",
    });

    const resolved = await resolveDataforseoCredentials("org1");
    expect(resolved).toEqual({ apiKey: "org-key", source: "org" });
  });

  it("falls back to the global env key when the org has none", async () => {
    vi.stubEnv("DATAFORSEO_API_KEY", "global-key");

    const resolved = await resolveDataforseoCredentials("org1");
    expect(resolved).toEqual({ apiKey: "global-key", source: "global" });
  });

  it("reports none when neither an org key nor a global env key exists", async () => {
    vi.stubEnv("DATAFORSEO_API_KEY", "");

    const resolved = await resolveDataforseoCredentials("org1");
    expect(resolved).toEqual({ apiKey: null, source: "none" });
  });
});
