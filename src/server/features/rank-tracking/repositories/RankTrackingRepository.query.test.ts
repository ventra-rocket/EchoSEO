/**
 * The two queries the cron's drain depends on, against a real SQLite database.
 *
 * `getDueConfigsWithOrganization` must return a *stable, oldest-first* total
 * order: without it, a backlog larger than one tick has the same arbitrary rows
 * refill every tick and the oldest configs never run. `claimDueConfig` is the
 * compare-and-set that makes each advance exclusive, so a config is claimed by
 * exactly one tick and a config that could not start gets its slot back.
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

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

// Dynamic on purpose: the repository resolves `db` at module scope, so the
// vi.mock above has to be installed before this module evaluates.
const { RankTrackingRepository } = await import("./RankTrackingRepository");

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-08-23T12:00:00.000Z";

async function seedConfig(
  harness: FreeCheckTestDb,
  overrides: {
    id: string;
    domain?: string;
    locationCode?: number;
    scheduleInterval?: "daily" | "weekly" | "monthly" | "manual";
    scheduledEnabled?: boolean;
    isActive?: boolean;
    nextCheckAt?: string | null;
    lastSkipReason?: string | null;
  },
) {
  await harness.db.insert(rankTrackingConfigs).values({
    id: overrides.id,
    projectId: PROJECT_ID,
    domain: overrides.domain ?? `${overrides.id}.example.com`,
    locationCode: overrides.locationCode ?? 2840,
    serpDepth: 40,
    scheduleInterval: overrides.scheduleInterval ?? "weekly",
    scheduledEnabled: overrides.scheduledEnabled ?? true,
    isActive: overrides.isActive ?? true,
    // `??` would coalesce an explicit null back to the default due time, so a
    // "never checked" fixture would silently seed as due and the exclusion it
    // exists to prove would pass for the wrong reason. Presence, not nullishness.
    nextCheckAt:
      "nextCheckAt" in overrides
        ? overrides.nextCheckAt
        : "2026-08-23T00:00:00.000Z",
    lastSkipReason: overrides.lastSkipReason ?? null,
  });
}

async function readConfig(harness: FreeCheckTestDb, id: string) {
  const rows = await harness.db.select().from(rankTrackingConfigs);
  return rows.find((row) => row.id === id);
}

describe("RankTrackingRepository — scheduler queries", () => {
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

  describe("getDueConfigsWithOrganization", () => {
    it("returns due configs oldest first", async () => {
      // Inserted newest-first so insertion order cannot pass for sort order.
      await seedConfig(harness, {
        id: "c-new",
        nextCheckAt: "2026-08-23T11:00:00.000Z",
      });
      await seedConfig(harness, {
        id: "c-old",
        nextCheckAt: "2026-06-01T00:00:00.000Z",
      });
      await seedConfig(harness, {
        id: "c-mid",
        nextCheckAt: "2026-07-01T00:00:00.000Z",
      });

      const due =
        await RankTrackingRepository.getDueConfigsWithOrganization(NOW);

      expect(due.map((config) => config.id)).toEqual([
        "c-old",
        "c-mid",
        "c-new",
      ]);
    });

    it("breaks ties on id so the order is total, not arbitrary", async () => {
      const sameDueTime = "2026-08-01T00:00:00.000Z";
      await seedConfig(harness, { id: "c-b", nextCheckAt: sameDueTime });
      await seedConfig(harness, { id: "c-c", nextCheckAt: sameDueTime });
      await seedConfig(harness, { id: "c-a", nextCheckAt: sameDueTime });

      const due =
        await RankTrackingRepository.getDueConfigsWithOrganization(NOW);

      expect(due.map((config) => config.id)).toEqual(["c-a", "c-b", "c-c"]);
    });

    it("excludes a manual config carrying a stale due time", async () => {
      // The loop cannot advance a manual config's schedule, so selecting one
      // would re-select it every tick forever.
      await seedConfig(harness, {
        id: "c-manual",
        scheduleInterval: "manual",
        nextCheckAt: "2026-01-01T00:00:00.000Z",
      });

      const due =
        await RankTrackingRepository.getDueConfigsWithOrganization(NOW);

      expect(due).toEqual([]);
    });

    it("excludes configs that are inactive, unarmed, or not yet due", async () => {
      await seedConfig(harness, { id: "c-archived", isActive: false });
      await seedConfig(harness, { id: "c-unarmed", scheduledEnabled: false });
      await seedConfig(harness, {
        id: "c-future",
        nextCheckAt: "2026-12-01T00:00:00.000Z",
      });
      await seedConfig(harness, { id: "c-never", nextCheckAt: null });
      await seedConfig(harness, { id: "c-due" });

      const due =
        await RankTrackingRepository.getDueConfigsWithOrganization(NOW);

      expect(due.map((config) => config.id)).toEqual(["c-due"]);
    });
  });

  describe("claimDueConfig", () => {
    it("advances the schedule when the observed due time still matches", async () => {
      await seedConfig(harness, {
        id: "c-1",
        nextCheckAt: "2026-08-23T00:00:00.000Z",
        lastSkipReason: "insufficient_credits",
      });

      const claimed = await RankTrackingRepository.claimDueConfig({
        configId: "c-1",
        projectId: PROJECT_ID,
        observedNextCheckAt: "2026-08-23T00:00:00.000Z",
        nextCheckAt: "2026-08-30T00:00:00.000Z",
        lastSkipReason: null,
      });

      expect(claimed).toBe(true);
      const config = await readConfig(harness, "c-1");
      expect(config?.nextCheckAt).toBe("2026-08-30T00:00:00.000Z");
      expect(config?.lastSkipReason).toBeNull();
    });

    it("refuses the claim when the config changed underneath us", async () => {
      await seedConfig(harness, {
        id: "c-1",
        nextCheckAt: "2026-08-23T06:00:00.000Z",
      });

      const claimed = await RankTrackingRepository.claimDueConfig({
        configId: "c-1",
        projectId: PROJECT_ID,
        // What a concurrent tick observed before an edit moved the due time.
        observedNextCheckAt: "2026-08-23T00:00:00.000Z",
        nextCheckAt: "2026-08-30T00:00:00.000Z",
      });

      expect(claimed).toBe(false);
      const config = await readConfig(harness, "c-1");
      expect(config?.nextCheckAt).toBe("2026-08-23T06:00:00.000Z");
    });

    it("grants the claim to exactly one of two concurrent ticks", async () => {
      await seedConfig(harness, {
        id: "c-1",
        nextCheckAt: "2026-08-23T00:00:00.000Z",
      });

      const claim = () =>
        RankTrackingRepository.claimDueConfig({
          configId: "c-1",
          projectId: PROJECT_ID,
          observedNextCheckAt: "2026-08-23T00:00:00.000Z",
          nextCheckAt: "2026-08-30T00:00:00.000Z",
        });

      expect([await claim(), await claim()]).toEqual([true, false]);
    });

    it("restores the original due time so a blocked config retries next tick", async () => {
      await seedConfig(harness, {
        id: "c-1",
        nextCheckAt: "2026-08-23T00:00:00.000Z",
      });

      await RankTrackingRepository.claimDueConfig({
        configId: "c-1",
        projectId: PROJECT_ID,
        observedNextCheckAt: "2026-08-23T00:00:00.000Z",
        nextCheckAt: "2026-08-30T00:00:00.000Z",
        lastSkipReason: null,
      });
      // The run could not start, so the slot goes back.
      const restored = await RankTrackingRepository.claimDueConfig({
        configId: "c-1",
        projectId: PROJECT_ID,
        observedNextCheckAt: "2026-08-30T00:00:00.000Z",
        nextCheckAt: "2026-08-23T00:00:00.000Z",
      });

      expect(restored).toBe(true);
      expect((await readConfig(harness, "c-1"))?.nextCheckAt).toBe(
        "2026-08-23T00:00:00.000Z",
      );
    });

    it("leaves lastSkipReason alone when the caller omits it", async () => {
      // The restore path must not clobber a reason the blocking run just wrote.
      await seedConfig(harness, {
        id: "c-1",
        nextCheckAt: "2026-08-23T00:00:00.000Z",
        lastSkipReason: "insufficient_credits",
      });

      await RankTrackingRepository.claimDueConfig({
        configId: "c-1",
        projectId: PROJECT_ID,
        observedNextCheckAt: "2026-08-23T00:00:00.000Z",
        nextCheckAt: "2026-08-30T00:00:00.000Z",
      });

      expect((await readConfig(harness, "c-1"))?.lastSkipReason).toBe(
        "insufficient_credits",
      );
    });

    it("refuses to claim an archived or disarmed config", async () => {
      await seedConfig(harness, {
        id: "c-archived",
        isActive: false,
        nextCheckAt: "2026-08-23T00:00:00.000Z",
      });
      await seedConfig(harness, {
        id: "c-unarmed",
        scheduledEnabled: false,
        nextCheckAt: "2026-08-23T00:00:00.000Z",
      });

      const claim = (configId: string) =>
        RankTrackingRepository.claimDueConfig({
          configId,
          projectId: PROJECT_ID,
          observedNextCheckAt: "2026-08-23T00:00:00.000Z",
          nextCheckAt: "2026-08-30T00:00:00.000Z",
        });

      expect(await claim("c-archived")).toBe(false);
      expect(await claim("c-unarmed")).toBe(false);
    });
  });

  describe("getKeywordCountsForConfigs", () => {
    it("counts per config and omits keywordless ones", async () => {
      await seedConfig(harness, { id: "c-1" });
      await seedConfig(harness, { id: "c-2" });
      await seedConfig(harness, { id: "c-empty" });
      await harness.db.insert(rankTrackingKeywords).values([
        { id: "k-1", configId: "c-1", keyword: "alpha" },
        { id: "k-2", configId: "c-1", keyword: "beta" },
        { id: "k-3", configId: "c-2", keyword: "gamma" },
      ]);

      const counts = await RankTrackingRepository.getKeywordCountsForConfigs([
        "c-1",
        "c-2",
        "c-empty",
      ]);

      expect(counts.get("c-1")).toBe(2);
      expect(counts.get("c-2")).toBe(1);
      // Absent, not zero — the scheduler treats a miss as zero units.
      expect(counts.get("c-empty")).toBeUndefined();
    });

    it("returns an empty map for no configs without issuing a query", async () => {
      const counts = await RankTrackingRepository.getKeywordCountsForConfigs(
        [],
      );
      expect(counts.size).toBe(0);
    });
  });
});
