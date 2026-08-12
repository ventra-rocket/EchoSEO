import { describe, expect, it } from "vitest";

import {
  firstRejectionMessage,
  resolveRankCheckRunStatus,
} from "@/server/features/rank-tracking/services/rankCheckRunStatus";

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

function rejected(reason: unknown): PromiseSettledResult<unknown> {
  return { status: "rejected", reason };
}

function fulfilled(): PromiseSettledResult<unknown> {
  return { status: "fulfilled", value: {} };
}

describe("firstRejectionMessage", () => {
  it("returns null when every call succeeded", () => {
    expect(firstRejectionMessage([fulfilled(), fulfilled()])).toBeNull();
  });

  it("returns null for an empty batch", () => {
    expect(firstRejectionMessage([])).toBeNull();
  });

  /** The production case: an account DataForSEO will not serve refuses every
   * call, so the run writes no snapshots and the row has to name the provider
   * instead of only counting what it missed. */
  it("reports the provider reason when every call was refused", () => {
    const message =
      "DataForSEO HTTP 403 on /v3/serp/google/organic/live/advanced (40104: Please verify your account before using the API)";

    expect(
      firstRejectionMessage([
        rejected(new Error(message)),
        rejected(new Error(message)),
      ]),
    ).toBe(message);
  });

  it("reports a missing key, refused before the provider is ever called", () => {
    expect(
      firstRejectionMessage([
        rejected(
          new Error("No DataForSEO API key configured for this organization"),
        ),
      ]),
    ).toBe("No DataForSEO API key configured for this organization");
  });

  /** A partial run names its cause too: "checked 8 of 10, and here is why the
   * other two did not" beats a bare count. */
  it("keeps the first reason when only some calls failed", () => {
    expect(
      firstRejectionMessage([
        fulfilled(),
        rejected(new Error("first")),
        rejected(new Error("second")),
      ]),
    ).toBe("first");
  });

  it("survives a thrown non-Error", () => {
    expect(firstRejectionMessage([rejected("plain string")])).toBe(
      "plain string",
    );
  });
});
