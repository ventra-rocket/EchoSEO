import { describe, expect, it } from "vitest";

import { resolveRankCheckRunStatus } from "@/server/features/rank-tracking/services/rankCheckRunStatus";

describe("resolveRankCheckRunStatus", () => {
  // The production case, 2026-08-12: four runs stored `completed` with
  // keywords_checked = 0 while every DataForSEO call returned 403.
  it("fails a run where no keyword could be checked", () => {
    expect(
      resolveRankCheckRunStatus({ keywordsChecked: 0, keywordsTotal: 3 }),
    ).toBe("failed");
  });

  it("completes a partial run, which carries its own error message", () => {
    expect(
      resolveRankCheckRunStatus({ keywordsChecked: 1, keywordsTotal: 3 }),
    ).toBe("completed");
  });

  it("completes a fully successful run", () => {
    expect(
      resolveRankCheckRunStatus({ keywordsChecked: 3, keywordsTotal: 3 }),
    ).toBe("completed");
  });

  // Guard the vacuous-signal regression directly: a dead provider must not be
  // able to produce a 24h window with zero `failed` rows.
  it("cannot report a dead provider as a clean 24h window", () => {
    const deadProviderRuns = [
      { keywordsChecked: 0, keywordsTotal: 3 },
      { keywordsChecked: 0, keywordsTotal: 1 },
      { keywordsChecked: 0, keywordsTotal: 1 },
    ];

    const statuses = deadProviderRuns.map(resolveRankCheckRunStatus);

    expect(statuses.every((status) => status === "failed")).toBe(true);
  });

  // A config with nothing to check is not a failure — there was no work.
  it("does not fail a run that had no keywords to begin with", () => {
    expect(
      resolveRankCheckRunStatus({ keywordsChecked: 0, keywordsTotal: 0 }),
    ).toBe("completed");
  });
});
