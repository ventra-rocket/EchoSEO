/**
 * The cron drain loop's admission rules.
 *
 * The loop spends an organization's DataForSEO key unattended, so what it
 * refuses to do matters more than what it starts: it must not admit unbounded
 * work into one tick, must not lose a config's slot when a run could not start,
 * and must not advance a schedule it could not verify. Each case here pins one
 * of those, using the fake repository as the observable surface — the real
 * queries are covered in RankTrackingRepository.query.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_KEYWORDS_PER_CONFIG } from "@/shared/rank-tracking";
import type { RankCheckTriggerResult } from "@/types/schemas/rank-tracking";

/** Only the fields these tests assert on; the loop passes more. */
type ClaimInput = {
  configId: string;
  projectId: string;
  observedNextCheckAt: string;
  nextCheckAt: string;
  lastSkipReason?: string | null;
};
type StartInput = { config: { id: string } };

const mocks = vi.hoisted(() => ({
  getDueConfigsWithOrganization: vi.fn(),
  getKeywordCountsForConfigs: vi.fn(),
  claimDueConfig: vi.fn<(input: ClaimInput) => Promise<boolean>>(),
  beginRankCheckRun:
    vi.fn<(input: StartInput) => Promise<RankCheckTriggerResult>>(),
  orgMayUsePaidFeatures: vi.fn(),
  resolveDataforseoCredentials: vi.fn(),
  resolveDataforseoCredentialAccess: vi.fn(),
  isHostedServerAuthMode: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock(
  "@/server/features/rank-tracking/repositories/RankTrackingRepository",
  () => ({
    RankTrackingRepository: {
      getDueConfigsWithOrganization: mocks.getDueConfigsWithOrganization,
      getKeywordCountsForConfigs: mocks.getKeywordCountsForConfigs,
      claimDueConfig: mocks.claimDueConfig,
    },
  }),
);
vi.mock("@/server/features/rank-tracking/services/rankCheckRunGuards", () => ({
  beginRankCheckRun: mocks.beginRankCheckRun,
}));
vi.mock("@/server/billing/subscription", () => ({
  orgMayUsePaidFeatures: mocks.orgMayUsePaidFeatures,
}));
vi.mock("@/server/lib/dataforseo/resolve-credentials", () => ({
  resolveDataforseoCredentials: mocks.resolveDataforseoCredentials,
}));
vi.mock("@/server/lib/dataforseo/credential-access-policy", () => ({
  resolveDataforseoCredentialAccess: mocks.resolveDataforseoCredentialAccess,
}));
vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: mocks.isHostedServerAuthMode,
}));

// Dynamic on purpose: the mocks above must be installed before this module
// resolves its own imports.
const { runScheduledRankChecks } = await import("./scheduledRankChecks");

const BUDGET = 1000;
// The loop only forwards this binding to `beginRankCheckRun`, which is mocked
// here, so no method is ever invoked. Typed rather than cast so that a future
// read of a second binding fails at this fixture instead of at runtime.
const ENV: Pick<Env, "RANK_CHECK_WORKFLOW"> = {
  RANK_CHECK_WORKFLOW: {
    get: () => Promise.reject(new Error("unused")),
    create: () => Promise.reject(new Error("unused")),
    createBatch: () => Promise.reject(new Error("unused")),
  },
};

function dueConfig(overrides: { id: string; nextCheckAt?: string }) {
  return {
    id: overrides.id,
    projectId: "project-1",
    domain: `${overrides.id}.example.com`,
    locationCode: 2840,
    languageCode: "en",
    devices: "both" as const,
    serpDepth: 40,
    scheduleInterval: "weekly" as const,
    nextCheckAt: overrides.nextCheckAt ?? "2026-08-23T00:00:00.000Z",
    organizationId: "org-1",
  };
}

/** Config ids in the order the loop actually asked to start them. */
function startedConfigIds() {
  return mocks.beginRankCheckRun.mock.calls.map(([input]) => input.config.id);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.isHostedServerAuthMode.mockResolvedValue(true);
  mocks.orgMayUsePaidFeatures.mockResolvedValue(true);
  mocks.resolveDataforseoCredentials.mockResolvedValue({ key: "k" });
  mocks.resolveDataforseoCredentialAccess.mockResolvedValue("organization");
  mocks.claimDueConfig.mockResolvedValue(true);
  mocks.beginRankCheckRun.mockResolvedValue({ ok: true, runId: "run-1" });
  mocks.getKeywordCountsForConfigs.mockResolvedValue(new Map());
});

describe("runScheduledRankChecks — admission control", () => {
  it("stops admitting configs once the unit budget would be exceeded", async () => {
    // 600 units each (300 keywords × 2 devices): the third would reach 1,800.
    const configs = ["c-1", "c-2", "c-3"].map((id) => dueConfig({ id }));
    mocks.getDueConfigsWithOrganization.mockResolvedValue(configs);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(
      new Map(configs.map((config) => [config.id, 300])),
    );

    await runScheduledRankChecks(ENV);

    expect(startedConfigIds()).toEqual(["c-1"]);
  });

  it("always admits the first config, even when it alone exceeds the budget", async () => {
    // The legal maximum config is 1,000 keywords × 2 devices = 2,000 units,
    // twice the budget. Exempting the first start is what stops it starving.
    const oversized = dueConfig({ id: "c-huge" });
    mocks.getDueConfigsWithOrganization.mockResolvedValue([oversized]);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(
      new Map([[oversized.id, MAX_KEYWORDS_PER_CONFIG]]),
    );
    expect(MAX_KEYWORDS_PER_CONFIG * 2).toBeGreaterThan(BUDGET);

    await runScheduledRankChecks(ENV);

    expect(startedConfigIds()).toEqual(["c-huge"]);
  });

  it("advances a keywordless config without spending budget on it", async () => {
    const [empty, real] = [
      dueConfig({ id: "c-empty" }),
      dueConfig({ id: "c" }),
    ];
    mocks.getDueConfigsWithOrganization.mockResolvedValue([empty, real]);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(
      new Map([[real.id, 10]]),
    );

    await runScheduledRankChecks(ENV);

    expect(startedConfigIds()).toEqual(["c"]);
    expect(mocks.claimDueConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        configId: "c-empty",
        lastSkipReason: "no_keywords",
      }),
    );
  });
});

describe("runScheduledRankChecks — schedule ownership", () => {
  it("restores the original due time when a run is already active", async () => {
    const config = dueConfig({ id: "c-1" });
    mocks.getDueConfigsWithOrganization.mockResolvedValue([config]);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(new Map([["c-1", 10]]));
    mocks.beginRankCheckRun.mockResolvedValue({
      ok: false,
      reason: "already_running",
      blockingRunId: "run-blocking",
    });

    await runScheduledRankChecks(ENV);

    const [[claim], [restore]] = mocks.claimDueConfig.mock.calls;
    expect(claim.observedNextCheckAt).toBe("2026-08-23T00:00:00.000Z");
    // The restore is the inverse swap, so the config stays due next tick
    // instead of silently waiting a whole interval.
    expect(restore.nextCheckAt).toBe(claim.observedNextCheckAt);
    expect(restore.observedNextCheckAt).toBe(claim.nextCheckAt);
    // Omitted, so it cannot clobber a reason the blocking run wrote.
    expect(restore).not.toHaveProperty("lastSkipReason");
  });

  it("does not start a run when the claim was lost to a concurrent change", async () => {
    mocks.getDueConfigsWithOrganization.mockResolvedValue([
      dueConfig({ id: "c-1" }),
    ]);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(new Map([["c-1", 10]]));
    mocks.claimDueConfig.mockResolvedValue(false);

    await runScheduledRankChecks(ENV);

    expect(mocks.beginRankCheckRun).not.toHaveBeenCalled();
  });

  it("leaves the schedule advanced when the workflow throws", async () => {
    mocks.getDueConfigsWithOrganization.mockResolvedValue([
      dueConfig({ id: "c-1" }),
    ]);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(new Map([["c-1", 10]]));
    mocks.beginRankCheckRun.mockRejectedValue(new Error("workflows down"));

    await runScheduledRankChecks(ENV);

    // One claim only: no restore. A systemic outage must not make every config
    // due again on the very next tick.
    expect(mocks.claimDueConfig).toHaveBeenCalledTimes(1);
  });

  it("leaves a config due when its access check errors", async () => {
    mocks.getDueConfigsWithOrganization.mockResolvedValue([
      dueConfig({ id: "c-1" }),
    ]);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(new Map([["c-1", 10]]));
    mocks.orgMayUsePaidFeatures.mockRejectedValue(new Error("billing down"));

    await runScheduledRankChecks(ENV);

    // nextCheckAt is the schedule anchor: writing it on an error would
    // permanently shift this config's slot and herd-sync configs after an
    // outage. Leaving the row due is the retry.
    expect(mocks.claimDueConfig).not.toHaveBeenCalled();
    expect(mocks.beginRankCheckRun).not.toHaveBeenCalled();
  });
});

describe("runScheduledRankChecks — gates", () => {
  it("flags an unentitled org and skips it", async () => {
    mocks.getDueConfigsWithOrganization.mockResolvedValue([
      dueConfig({ id: "c-1" }),
    ]);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(new Map([["c-1", 10]]));
    mocks.orgMayUsePaidFeatures.mockResolvedValue(false);

    await runScheduledRankChecks(ENV);

    expect(mocks.claimDueConfig).toHaveBeenCalledWith(
      expect.objectContaining({ lastSkipReason: "plan_required" }),
    );
    expect(mocks.beginRankCheckRun).not.toHaveBeenCalled();
  });

  it("flags a missing DataForSEO key instead of failing a run", async () => {
    mocks.getDueConfigsWithOrganization.mockResolvedValue([
      dueConfig({ id: "c-1" }),
    ]);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(new Map([["c-1", 10]]));
    mocks.resolveDataforseoCredentialAccess.mockResolvedValue("unavailable");

    await runScheduledRankChecks(ENV);

    expect(mocks.claimDueConfig).toHaveBeenCalledWith(
      expect.objectContaining({ lastSkipReason: "key_missing" }),
    );
    expect(mocks.beginRankCheckRun).not.toHaveBeenCalled();
  });

  it("checks each organization once per tick, not once per config", async () => {
    const configs = ["c-1", "c-2", "c-3"].map((id) => dueConfig({ id }));
    mocks.getDueConfigsWithOrganization.mockResolvedValue(configs);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(
      new Map(configs.map((config) => [config.id, 10])),
    );

    await runScheduledRankChecks(ENV);

    expect(startedConfigIds()).toHaveLength(3);
    expect(mocks.orgMayUsePaidFeatures).toHaveBeenCalledTimes(1);
    expect(mocks.resolveDataforseoCredentials).toHaveBeenCalledTimes(1);
  });

  it("makes no billing call at all when self-hosted", async () => {
    mocks.isHostedServerAuthMode.mockResolvedValue(false);
    mocks.getDueConfigsWithOrganization.mockResolvedValue([
      dueConfig({ id: "c-1" }),
    ]);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(new Map([["c-1", 10]]));

    await runScheduledRankChecks(ENV);

    expect(mocks.orgMayUsePaidFeatures).not.toHaveBeenCalled();
    expect(startedConfigIds()).toEqual(["c-1"]);
  });
});

describe("runScheduledRankChecks — containment", () => {
  it("keeps draining after one config throws", async () => {
    const configs = ["c-bad", "c-good"].map((id) => dueConfig({ id }));
    mocks.getDueConfigsWithOrganization.mockResolvedValue(configs);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(
      new Map(configs.map((config) => [config.id, 10])),
    );
    mocks.claimDueConfig.mockImplementation(async (input) => {
      if (input.configId === "c-bad") throw new Error("row is broken");
      return true;
    });

    await runScheduledRankChecks(ENV);

    expect(startedConfigIds()).toEqual(["c-good"]);
  });

  it("stops the loop once the tick deadline passes", async () => {
    const configs = ["c-1", "c-2"].map((id) => dueConfig({ id }));
    mocks.getDueConfigsWithOrganization.mockResolvedValue(configs);
    mocks.getKeywordCountsForConfigs.mockResolvedValue(
      new Map(configs.map((config) => [config.id, 10])),
    );
    // Real time up to the deadline check, then far past it: the first config is
    // admitted and the second is left for the next tick rather than risking the
    // Worker's cron kill.
    const start = Date.now();
    let call = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      call += 1;
      return call <= 2 ? start : start + 10 * 60 * 1000;
    });

    await runScheduledRankChecks(ENV);

    expect(startedConfigIds()).toEqual(["c-1"]);
  });
});
