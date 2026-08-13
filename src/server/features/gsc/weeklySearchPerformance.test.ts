import { beforeEach, describe, expect, it, vi } from "vitest";

// The module under test reaches GscService for its default dependency, and that
// module graph ends at the D1 binding and the auth instance. Neither exists in a
// node test process, and neither is exercised here: the six GSC calls are
// injected. Mock the runtime leaves only, so the real GscApiError/GscTokenError
// classes — which the error classification depends on via `instanceof` — stay
// real.
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({}) }));

import type { GscPerformanceInput } from "@/server/features/gsc/searchAnalytics";
import { gatherWeeklySearchSignals } from "@/server/features/gsc/weeklySearchPerformance";
import { GscNotConnectedError } from "@/server/features/gsc/services/GscService";
import { GscApiError, GscTokenError } from "@/server/lib/gscClient";
import type { GscSearchAnalyticsRow } from "@/server/lib/gscClient";
import type { ReportPeriod } from "@/server/features/reports/report-types";

const PERIOD: ReportPeriod = {
  startDate: "2026-08-07",
  endDate: "2026-08-13",
  prevStartDate: "2026-07-31",
  prevEndDate: "2026-08-06",
  key: "2026-W33",
};

const SITE_URL = "sc-domain:example.com";

function row(
  key: string,
  clicks: number,
  impressions: number,
  position = 5,
): GscSearchAnalyticsRow {
  return {
    keys: [key],
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position,
  };
}

/** A `getPerformance` double that answers by dimension, plus the calls it saw. */
function stubPerformance(
  rowsByDimension: Record<string, GscSearchAnalyticsRow[]>,
) {
  const calls: GscPerformanceInput[] = [];
  const getPerformance = async (input: GscPerformanceInput) => {
    calls.push(input);
    const dimension = input.dimensions?.[0] ?? "";
    // The two `date` calls differ only by window, which is exactly what the
    // totals-vs-prevTotals assertions need to tell apart.
    const bucket =
      dimension === "date" && input.startDate === PERIOD.prevStartDate
        ? "date:prev"
        : dimension;
    return {
      siteUrl: SITE_URL,
      connectedBy: "owner@example.com",
      request: {
        startDate: input.startDate ?? "",
        endDate: input.endDate ?? "",
      },
      rows: rowsByDimension[bucket] ?? [],
    };
  };
  return { calls, getPerformance };
}

const CURRENT_DAILY = [
  row("2026-08-07", 40, 400),
  row("2026-08-08", 30, 300),
  row("2026-08-09", 50, 500),
];
const PREVIOUS_DAILY = [row("2026-07-31", 60, 900), row("2026-08-01", 40, 300)];

describe("gatherWeeklySearchSignals", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("takes totals from the date dimension, not from the capped top rows", async () => {
    const { getPerformance } = stubPerformance({
      date: CURRENT_DAILY,
      "date:prev": PREVIOUS_DAILY,
      // Top pages are the ten best of a larger site: summing them would report
      // 9 clicks against the real 120. This assertion is the regression guard.
      page: [
        row("https://example.com/a", 5, 50),
        row("https://example.com/b", 4, 40),
      ],
      query: [row("magento agency", 3, 30)],
      device: [row("MOBILE", 70, 700), row("DESKTOP", 50, 500)],
      country: [row("usa", 90, 900)],
    });

    const signals = await gatherWeeklySearchSignals({
      projectId: "project-1",
      period: PERIOD,
      getPerformance,
    });

    expect(signals.state).toBe("ok");
    if (signals.state !== "ok") return;
    expect(signals.siteUrl).toBe(SITE_URL);
    expect(signals.totals.clicks).toBe(120);
    expect(signals.totals.impressions).toBe(1200);
    expect(signals.totals.ctr).toBeCloseTo(0.1);
    expect(signals.prevTotals.clicks).toBe(100);
    expect(signals.prevTotals.impressions).toBe(1200);
    expect(signals.topPages.map((page) => page.key)).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
    expect(signals.topQueries.map((query) => query.key)).toEqual([
      "magento agency",
    ]);
    expect(signals.devices.map((device) => device.key)).toEqual([
      "MOBILE",
      "DESKTOP",
    ]);
    expect(signals.countries.map((country) => country.key)).toEqual(["usa"]);
  });

  it("issues six explicit-window requests with the documented dimensions", async () => {
    const { calls, getPerformance } = stubPerformance({
      date: CURRENT_DAILY,
      "date:prev": PREVIOUS_DAILY,
    });

    await gatherWeeklySearchSignals({
      projectId: "project-1",
      period: PERIOD,
      getPerformance,
    });

    expect(calls).toHaveLength(6);
    expect(calls).toEqual([
      {
        projectId: "project-1",
        startDate: "2026-08-07",
        endDate: "2026-08-13",
        dimensions: ["date"],
      },
      {
        projectId: "project-1",
        startDate: "2026-07-31",
        endDate: "2026-08-06",
        dimensions: ["date"],
      },
      {
        projectId: "project-1",
        startDate: "2026-08-07",
        endDate: "2026-08-13",
        dimensions: ["page"],
        rowLimit: 10,
      },
      {
        projectId: "project-1",
        startDate: "2026-08-07",
        endDate: "2026-08-13",
        dimensions: ["query"],
        rowLimit: 10,
      },
      {
        projectId: "project-1",
        startDate: "2026-08-07",
        endDate: "2026-08-13",
        dimensions: ["device"],
      },
      {
        projectId: "project-1",
        startDate: "2026-08-07",
        endDate: "2026-08-13",
        dimensions: ["country"],
        rowLimit: 10,
      },
    ]);
    // No call may fall back to the `dateRange` shorthand: it resolves against the
    // wall clock and would drift off the window this report is keyed on.
    for (const call of calls) {
      expect(call.dateRange).toBeUndefined();
    }
  });

  it("reports needs_reconnect for a 403, never no_data", async () => {
    const signals = await gatherWeeklySearchSignals({
      projectId: "project-1",
      period: PERIOD,
      getPerformance: async () => {
        throw new GscApiError(403, "Search Console denied the request");
      },
    });

    expect(signals).toEqual({ state: "needs_reconnect" });
  });

  it("reports needs_reconnect when no token could be minted", async () => {
    const signals = await gatherWeeklySearchSignals({
      projectId: "project-1",
      period: PERIOD,
      getPerformance: async () => {
        throw new GscTokenError("no access token available");
      },
    });

    expect(signals).toEqual({ state: "needs_reconnect" });
  });

  it("reports not_connected when the project has no property", async () => {
    const signals = await gatherWeeklySearchSignals({
      projectId: "project-1",
      period: PERIOD,
      getPerformance: async () => {
        throw new GscNotConnectedError("project-1");
      },
    });

    expect(signals).toEqual({ state: "not_connected" });
  });

  it("reports error for a 500 and logs one prefixed line", async () => {
    const signals = await gatherWeeklySearchSignals({
      projectId: "project-1",
      period: PERIOD,
      getPerformance: async () => {
        throw new GscApiError(500, "backend error", "<html>…</html>");
      },
    });

    expect(signals).toEqual({
      state: "error",
      message: "Search Console returned HTTP 500",
    });
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      "[weekly-report] search performance failed: Search Console returned HTTP 500",
    );
  });

  it("keeps credentials out of the error message it surfaces", async () => {
    const signals = await gatherWeeklySearchSignals({
      projectId: "project-1",
      period: PERIOD,
      getPerformance: async () => {
        throw new Error(
          "fetch failed for https://oauth2.googleapis.com/token?access_token=ya29.AVeryLongOpaqueSecretValue",
        );
      },
    });

    expect(signals.state).toBe("error");
    if (signals.state !== "error") return;
    expect(signals.message).toBe("Error: fetch failed for [url]");
    expect(signals.message).not.toContain("access_token");
    expect(signals.message).not.toContain("ya29");
  });

  it("reports no_data only when every call succeeded and both windows are empty", async () => {
    const { getPerformance } = stubPerformance({});

    const signals = await gatherWeeklySearchSignals({
      projectId: "project-1",
      period: PERIOD,
      getPerformance,
    });

    expect(signals).toEqual({ state: "no_data", siteUrl: SITE_URL });
  });

  it("stays ok when this week is empty but last week had traffic", async () => {
    // A real collapse to zero has to reach the email as numbers, not as
    // "no data": the drop is the story.
    const { getPerformance } = stubPerformance({ "date:prev": PREVIOUS_DAILY });

    const signals = await gatherWeeklySearchSignals({
      projectId: "project-1",
      period: PERIOD,
      getPerformance,
    });

    expect(signals.state).toBe("ok");
    if (signals.state !== "ok") return;
    expect(signals.totals).toEqual({
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    });
    expect(signals.prevTotals.clicks).toBe(100);
  });

  it("stays ok when impressions exist without a single click", async () => {
    const { getPerformance } = stubPerformance({
      date: [row("2026-08-07", 0, 250)],
    });

    const signals = await gatherWeeklySearchSignals({
      projectId: "project-1",
      period: PERIOD,
      getPerformance,
    });

    expect(signals.state).toBe("ok");
    if (signals.state !== "ok") return;
    expect(signals.totals.impressions).toBe(250);
  });
});
