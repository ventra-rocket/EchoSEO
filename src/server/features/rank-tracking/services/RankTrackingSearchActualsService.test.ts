/**
 * The Search Console overlay for tracked keywords, with the GSC client and the
 * rank-tracking repo mocked. What must hold:
 *
 * - a property that does not cover the tracked domain is never read at all;
 * - a keyword with no GSC row is only reported as such when the whole query set
 *   was read — otherwise the answer is "unknown", carried by `complete: false`;
 * - matching is case- and whitespace-insensitive, because GSC returns queries
 *   normalised while tracked keywords are typed by hand;
 * - a property switched mid-read cannot mislabel another site's numbers.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getConfigById = vi.fn();
const getKeywordsForConfig = vi.fn();
const getConnection = vi.fn();
const getPerformance = vi.fn<
  (input: { startRow?: number }) => Promise<{
    siteUrl: string;
    rows: unknown[];
  }>
>();

vi.mock(
  "@/server/features/rank-tracking/repositories/RankTrackingRepository",
  () => ({
    RankTrackingRepository: { getConfigById, getKeywordsForConfig },
  }),
);

vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscService: { getConnection, getPerformance },
  GscNotConnectedError: class extends Error {},
  isExpectedGrantFailure: (error: unknown) =>
    error instanceof Error && error.message === "grant-failed",
}));
// Imported after the mocks are registered: a static import would bind the real
// repository and GscService before `vi.mock` replaced them.
const { RankTrackingSearchActualsService } =
  await import("./RankTrackingSearchActualsService");

const INPUT = { projectId: "proj1", configId: "cfg1" };
const PROPERTY = "sc-domain:example.com";
const GSC_PAGE_SIZE = 1000;

function perf(rows: unknown[], siteUrl = PROPERTY) {
  return { siteUrl, connectedBy: null, request: {}, rows };
}

function queryRow(
  query: string,
  clicks: number,
  impressions: number,
  position: number,
) {
  return { keys: [query], clicks, impressions, ctr: 0.1, position };
}

/** A full page of filler rows, so the service sees the query set as truncated. */
function fullPage(): unknown[] {
  return Array.from({ length: GSC_PAGE_SIZE }, (_, index) =>
    queryRow(`filler ${index}`, 0, 1, 50),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getConfigById.mockResolvedValue({ id: "cfg1", domain: "example.com" });
  getKeywordsForConfig.mockResolvedValue([
    { id: "kw1", keyword: "Seo Tools" },
    { id: "kw2", keyword: "never searched" },
  ]);
  getConnection.mockResolvedValue({ siteUrl: PROPERTY });
});

describe("RankTrackingSearchActualsService.getActuals", () => {
  it("throws when the config is not in the caller's project", async () => {
    getConfigById.mockResolvedValue(null);
    await expect(
      RankTrackingSearchActualsService.getActuals(INPUT),
    ).rejects.toThrow();
  });

  it("returns not_connected when the project has no GSC property", async () => {
    getConnection.mockResolvedValue(null);
    const result = await RankTrackingSearchActualsService.getActuals(INPUT);
    expect(result.state).toBe("not_connected");
    expect(getPerformance).not.toHaveBeenCalled();
  });

  it("REFUSES a property that does not cover the tracked domain — no read issued", async () => {
    getConnection.mockResolvedValue({ siteUrl: "sc-domain:other-site.com" });
    const result = await RankTrackingSearchActualsService.getActuals(INPUT);
    expect(result).toMatchObject({
      state: "property_mismatch",
      property: "sc-domain:other-site.com",
      domain: "example.com",
    });
    expect(getPerformance).not.toHaveBeenCalled();
  });

  it("matches a tracked keyword to its query ignoring case and padding", async () => {
    getKeywordsForConfig.mockResolvedValue([
      { id: "kw1", keyword: "  SEO Tools  " },
    ]);
    getPerformance.mockResolvedValue(
      perf([queryRow("seo tools", 12, 340, 8.4)]),
    );

    const result = await RankTrackingSearchActualsService.getActuals(INPUT);

    expect(result).toMatchObject({
      state: "ready",
      source: "GSC",
      property: PROPERTY,
      complete: true,
      rows: [
        {
          trackingKeywordId: "kw1",
          clicks: 12,
          impressions: 340,
          position: 8.4,
        },
      ],
    });
  });

  it("matches a tracked keyword to its query ignoring repeated inner whitespace", async () => {
    // A keyword saved with a stray double space (or a tab) must still join its
    // GSC row: Google folds "seo  tools" to "seo tools" before matching, so the
    // tracked side has to fold the same way or it silently reads as absent.
    getKeywordsForConfig.mockResolvedValue([
      { id: "kw1", keyword: "seo   tools" },
      { id: "kw2", keyword: "best\tcoffee\tmaker" },
    ]);
    getPerformance.mockResolvedValue(
      perf([
        queryRow("seo tools", 12, 340, 8.4),
        queryRow("best coffee maker", 2, 20, 15),
      ]),
    );

    const result = await RankTrackingSearchActualsService.getActuals(INPUT);

    if (result.state !== "ready") throw new Error("expected ready");
    expect(result.rows.map((row) => row.trackingKeywordId).toSorted()).toEqual([
      "kw1",
      "kw2",
    ]);
  });

  it("reports a complete read when the query set ended — an absent keyword there is Google reporting nothing, not a proven zero", async () => {
    getPerformance.mockResolvedValue(perf([queryRow("seo tools", 3, 90, 11)]));

    const result = await RankTrackingSearchActualsService.getActuals(INPUT);

    expect(result).toMatchObject({ state: "ready", complete: true });
    // The keyword Google never reported is absent, not zero-filled: the caller
    // decides how to render it, and `complete` is what makes that honest.
    if (result.state !== "ready") throw new Error("expected ready");
    expect(result.rows.map((row) => row.trackingKeywordId)).toEqual(["kw1"]);
  });

  it("stops at the page cap and reports an incomplete read", async () => {
    getPerformance.mockResolvedValue(perf(fullPage()));

    const result = await RankTrackingSearchActualsService.getActuals(INPUT);

    expect(result).toMatchObject({ state: "ready", complete: false, rows: [] });
    expect(getPerformance).toHaveBeenCalledTimes(3);
    expect(getPerformance.mock.calls.map(([input]) => input.startRow)).toEqual([
      0, 1000, 2000,
    ]);
  });

  it("stops paging as soon as every tracked keyword is accounted for", async () => {
    const firstPage = fullPage();
    firstPage[0] = queryRow("seo tools", 5, 50, 9);
    firstPage[1] = queryRow("never searched", 1, 10, 40);
    getPerformance.mockResolvedValue(perf(firstPage));

    const result = await RankTrackingSearchActualsService.getActuals(INPUT);

    expect(result).toMatchObject({ state: "ready", complete: true });
    expect(getPerformance).toHaveBeenCalledTimes(1);
  });

  it("refuses to attribute rows when the property changed mid-read", async () => {
    getPerformance.mockResolvedValue(
      perf([queryRow("seo tools", 5, 50, 9)], "sc-domain:switched.com"),
    );

    const result = await RankTrackingSearchActualsService.getActuals(INPUT);

    expect(result).toMatchObject({
      state: "property_mismatch",
      property: PROPERTY,
    });
  });

  it("skips the read entirely when nothing is tracked yet", async () => {
    getKeywordsForConfig.mockResolvedValue([]);

    const result = await RankTrackingSearchActualsService.getActuals(INPUT);

    expect(result).toMatchObject({ state: "ready", complete: true, rows: [] });
    expect(getPerformance).not.toHaveBeenCalled();
  });

  it("degrades to not_connected on an expected grant failure", async () => {
    getPerformance.mockRejectedValue(new Error("grant-failed"));
    const result = await RankTrackingSearchActualsService.getActuals(INPUT);
    expect(result.state).toBe("not_connected");
  });

  it("propagates a real fault", async () => {
    getPerformance.mockRejectedValue(new Error("500 from GSC"));
    await expect(
      RankTrackingSearchActualsService.getActuals(INPUT),
    ).rejects.toThrow("500 from GSC");
  });
});
