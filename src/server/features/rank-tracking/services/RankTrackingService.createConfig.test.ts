/**
 * Re-adding a domain, against a real SQLite database.
 *
 * Archiving a domain only flips `is_active`; the (project, domain, location) row
 * and all its keyword and ranking history survive. So "add domain" has two
 * outcomes, and both are load-bearing: reactivating the old row keeps a user's
 * history instead of colliding with the unique index, and the active-config cap
 * has to gate that reactivation too, or archiving and re-adding is a way to walk
 * a project past the cap indefinitely.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";
import {
  projects,
  rankTrackingConfigs,
  rankTrackingKeywords,
} from "@/db/schema";
import { MAX_CONFIGS_PER_PROJECT } from "@/shared/rank-tracking";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

// Dynamic on purpose: the service resolves `db` at module scope, so the vi.mock
// above has to be installed before this module evaluates.
const { RankTrackingService } = await import("./RankTrackingService");

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const ARCHIVED_ID = "22222222-2222-4222-8222-222222222222";
const DOMAIN = "example.com";
const LOCATION_CODE = 2840;

async function seedArchivedConfig(harness: FreeCheckTestDb) {
  await harness.db.insert(rankTrackingConfigs).values({
    id: ARCHIVED_ID,
    projectId: PROJECT_ID,
    domain: DOMAIN,
    locationCode: LOCATION_CODE,
    languageCode: "cs",
    devices: "desktop",
    serpDepth: 20,
    scheduleInterval: "daily",
    scheduledEnabled: true,
    isActive: false,
    nextCheckAt: "2026-01-01T00:00:00.000Z",
    lastSkipReason: "insufficient_credits",
  });
  await harness.db.insert(rankTrackingKeywords).values({
    id: "keyword-1",
    configId: ARCHIVED_ID,
    keyword: "historic keyword",
  });
}

/** `count` extra active configs on distinct locations, to fill the cap. */
async function seedActiveConfigs(harness: FreeCheckTestDb, count: number) {
  const rows = Array.from({ length: count }, (_, index) => ({
    id: `filler-${index}`,
    projectId: PROJECT_ID,
    domain: `filler-${index}.example.com`,
    locationCode: LOCATION_CODE,
    serpDepth: 40,
  }));
  for (let i = 0; i < rows.length; i += 100) {
    await harness.db.insert(rankTrackingConfigs).values(rows.slice(i, i + 100));
  }
}

async function readConfig(harness: FreeCheckTestDb, id: string) {
  const rows = await harness.db.select().from(rankTrackingConfigs);
  return rows.find((row) => row.id === id);
}

function addDomain(overrides: { languageCode?: string } = {}) {
  return RankTrackingService.createConfig({
    projectId: PROJECT_ID,
    domain: DOMAIN,
    locationCode: LOCATION_CODE,
    languageCode: overrides.languageCode ?? "en",
    devices: "both",
    serpDepth: 40,
    scheduleInterval: "weekly",
  });
}

describe("RankTrackingService.createConfig — re-adding an archived domain", () => {
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
    await harness.db.insert(projects).values({
      id: PROJECT_ID,
      organizationId: "org1",
      name: "Project",
    });
  });

  afterEach(() => {
    harness.raw.close();
    testDb.current = null;
  });

  it("reactivates the archived row instead of failing on the unique index", async () => {
    await seedArchivedConfig(harness);

    const { configId } = await addDomain();

    // Same row: that is what preserves the keyword and ranking history.
    expect(configId).toBe(ARCHIVED_ID);
    const rows = await harness.db.select().from(rankTrackingConfigs);
    expect(rows).toHaveLength(1);
    const keywords = await harness.db.select().from(rankTrackingKeywords);
    expect(keywords).toHaveLength(1);
  });

  it("applies the freshly chosen settings to the reactivated row", async () => {
    await seedArchivedConfig(harness);

    await addDomain({ languageCode: "en" });

    const config = await readConfig(harness, ARCHIVED_ID);
    expect(config?.isActive).toBe(true);
    expect(config?.languageCode).toBe("en");
    expect(config?.devices).toBe("both");
    expect(config?.serpDepth).toBe(40);
    expect(config?.scheduleInterval).toBe("weekly");
  });

  it("clears the stale skip reason so the row shows no outdated warning", async () => {
    await seedArchivedConfig(harness);

    await addDomain();

    expect((await readConfig(harness, ARCHIVED_ID))?.lastSkipReason).toBeNull();
  });

  it("leaves the reactivated config disarmed, like a fresh one", async () => {
    // The create path never arms scheduledEnabled, so inheriting a stale `true`
    // would resume unattended DataForSEO spending with nobody opting in.
    await seedArchivedConfig(harness);

    await addDomain();

    expect((await readConfig(harness, ARCHIVED_ID))?.scheduledEnabled).toBe(
      false,
    );
  });

  it("still rejects a domain that is actively tracked", async () => {
    await harness.db.insert(rankTrackingConfigs).values({
      id: ARCHIVED_ID,
      projectId: PROJECT_ID,
      domain: DOMAIN,
      locationCode: LOCATION_CODE,
      serpDepth: 40,
      isActive: true,
    });

    await expect(addDomain()).rejects.toThrow(/already being tracked/);
  });

  it("enforces the config cap on reactivation, not just on insert", async () => {
    await seedArchivedConfig(harness);
    await seedActiveConfigs(harness, MAX_CONFIGS_PER_PROJECT);

    await expect(addDomain()).rejects.toThrow(/Maximum/);
    // The archived row must stay archived: a refused add changes nothing.
    expect((await readConfig(harness, ARCHIVED_ID))?.isActive).toBe(false);
  });

  it("allows the reactivation that exactly fills the cap", async () => {
    await seedArchivedConfig(harness);
    await seedActiveConfigs(harness, MAX_CONFIGS_PER_PROJECT - 1);

    await expect(addDomain()).resolves.toEqual({ configId: ARCHIVED_ID });
  });
});
