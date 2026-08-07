/**
 * The scheduled-run opt-in against a real SQLite database.
 *
 * `scheduledEnabled` is the only switch in the product that spends an
 * organization's DataForSEO key repeatedly and unattended, so the rules that
 * arm and disarm it belong to the service, not to whichever form happens to
 * call it. These cases pin the ones a caller could otherwise violate: a config
 * that runs on no schedule must not hold an opt-in, an untouched flag must
 * survive an unrelated edit, and arming a config must give the cron a due time
 * it can actually select on.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";
import { projects, rankTrackingConfigs } from "@/db/schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { RankTrackingService } = await import("./RankTrackingService");

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const CONFIG_ID = "22222222-2222-4222-8222-222222222222";

async function seedConfig(
  harness: FreeCheckTestDb,
  overrides: {
    scheduleInterval?: "daily" | "weekly" | "monthly" | "manual";
    scheduledEnabled?: boolean;
    nextCheckAt?: string | null;
  } = {},
) {
  await harness.db.insert(rankTrackingConfigs).values({
    id: CONFIG_ID,
    projectId: PROJECT_ID,
    domain: "example.com",
    serpDepth: 40,
    scheduleInterval: overrides.scheduleInterval ?? "weekly",
    scheduledEnabled: overrides.scheduledEnabled ?? false,
    nextCheckAt: overrides.nextCheckAt ?? null,
  });
}

async function readConfig(harness: FreeCheckTestDb) {
  const rows = await harness.db.select().from(rankTrackingConfigs);
  return rows[0];
}

describe("RankTrackingService.updateConfig — scheduled-run opt-in", () => {
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

  it("retires the opt-in when the schedule becomes manual", async () => {
    await seedConfig(harness, {
      scheduleInterval: "weekly",
      scheduledEnabled: true,
      nextCheckAt: "2026-01-01T00:00:00.000Z",
    });

    await RankTrackingService.updateConfig(CONFIG_ID, PROJECT_ID, {
      scheduleInterval: "manual",
    });

    const config = await readConfig(harness);
    expect(config.scheduledEnabled).toBe(false);
    expect(config.nextCheckAt).toBeNull();
  });

  it("refuses to arm a config that runs on no schedule", async () => {
    await seedConfig(harness, { scheduleInterval: "manual" });

    await RankTrackingService.updateConfig(CONFIG_ID, PROJECT_ID, {
      scheduledEnabled: true,
    });

    const config = await readConfig(harness);
    expect(config.scheduledEnabled).toBe(false);
    expect(config.nextCheckAt).toBeNull();
  });

  it("gives a newly armed config a due time the cron can select", async () => {
    await seedConfig(harness, {
      scheduleInterval: "weekly",
      nextCheckAt: null,
    });

    await RankTrackingService.updateConfig(CONFIG_ID, PROJECT_ID, {
      scheduledEnabled: true,
    });

    const config = await readConfig(harness);
    expect(config.scheduledEnabled).toBe(true);
    expect(config.nextCheckAt).not.toBeNull();
  });

  it("leaves the opt-in alone when an unrelated field is edited", async () => {
    await seedConfig(harness, {
      scheduleInterval: "weekly",
      scheduledEnabled: true,
      nextCheckAt: "2026-01-01T00:00:00.000Z",
    });

    await RankTrackingService.updateConfig(CONFIG_ID, PROJECT_ID, {
      isActive: false,
    });

    const config = await readConfig(harness);
    expect(config.scheduledEnabled).toBe(true);
  });
});
