import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeepReport } from "./deep-types";

const { r2GetMock, r2PutMock, r2DeleteMock } = vi.hoisted(() => ({
  r2GetMock: vi.fn(),
  r2PutMock: vi.fn(),
  r2DeleteMock: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: { R2: { get: r2GetMock, put: r2PutMock, delete: r2DeleteMock } },
}));

const { getDeepReport, putDeepReport, deleteDeepReports } =
  await import("./report-store");

const REPORT: DeepReport = {
  requestedUrl: "https://b.test/",
  finalUrl: "https://b.test/",
  statusCode: 200,
  fetchedAt: "2026-07-15T00:00:00.000Z",
  overallScore: 77,
  categoryScores: [{ category: "meta", score: 80 }],
  coreWebVitals: { lcpMs: 961, inpMs: 81, cls: 0, ttfbMs: 653 },
  cwvSource: "field",
  psiScores: {
    performance: 100,
    seo: 80,
    accessibility: 96,
    bestPractices: 96,
  },
  signals: [],
  pages: [],
  pageSummary: {
    title: "B",
    metaDescription: "",
    h1: null,
    wordCount: 120,
  },
  crawl: { pagesCrawled: 1 },
  screenshot: null,
};

/** Stands in for the R2 object body the Worker runtime hands back. */
function r2Object(json: () => Promise<unknown>) {
  return { json };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("putDeepReport", () => {
  it("writes the payload under the report's key and returns it", async () => {
    const key = await putDeepReport("r1", REPORT);

    expect(key).toBe("deep-reports/r1.json");
    expect(r2PutMock).toHaveBeenCalledWith(
      "deep-reports/r1.json",
      JSON.stringify(REPORT),
      { httpMetadata: { contentType: "application/json" } },
    );
  });
});

describe("getDeepReport", () => {
  it("round-trips a payload written by putDeepReport", async () => {
    // Through JSON so the test proves the serialized form parses back, not just
    // that the same object reference comes out the other side.
    const stored: unknown = JSON.parse(JSON.stringify(REPORT));
    r2GetMock.mockResolvedValue(r2Object(async () => stored));

    await expect(getDeepReport("r1")).resolves.toEqual(REPORT);
    expect(r2GetMock).toHaveBeenCalledWith("deep-reports/r1.json");
  });

  it("returns null when the object is missing", async () => {
    r2GetMock.mockResolvedValue(null);
    await expect(getDeepReport("r1")).resolves.toBeNull();
  });

  it("returns null instead of throwing when the payload is corrupted", async () => {
    // A truncated object would otherwise surface as a 500 to an anonymous
    // reader; the read path is built to degrade to a failed report instead.
    r2GetMock.mockResolvedValue(
      r2Object(() => Promise.reject(new SyntaxError("Unexpected end of JSON"))),
    );

    await expect(getDeepReport("r1")).resolves.toBeNull();
  });

  it("returns null when the payload no longer matches the schema", async () => {
    // e.g. written by an older deploy whose DeepReport shape has since changed.
    r2GetMock.mockResolvedValue(
      r2Object(async () => ({ requestedUrl: "https://b.test/" })),
    );

    await expect(getDeepReport("r1")).resolves.toBeNull();
  });

  // Every report written before screenshots existed lacks the field. Payloads
  // are re-validated on every read, so without the schema default those reports
  // would fail validation and 404 — losing reports that are otherwise intact.
  it("still reads a payload written before screenshots existed", async () => {
    const { screenshot: _omitted, ...legacy } = REPORT;
    r2GetMock.mockResolvedValue(r2Object(async () => legacy));

    const read = await getDeepReport("r1");
    expect(read).not.toBeNull();
    expect(read!.screenshot).toBeNull();
  });
});

describe("deleteDeepReports", () => {
  beforeEach(() => r2DeleteMock.mockResolvedValue(undefined));

  // The sweep takes up to 500 expired + 500 abandoned leads, and each report
  // now yields both a payload key and a derived screenshot key — more than one
  // R2 call can carry. An over-cap call is rejected wholesale, and the caller
  // deletes the D1 rows regardless, so an unchunked delete would strand those
  // objects permanently with no way to re-derive their keys.
  it("splits a delete larger than R2 accepts into whole calls", async () => {
    const keys = Array.from({ length: 1500 }, (_, i) => `deep-reports/${i}`);

    await expect(deleteDeepReports(keys)).resolves.toEqual([]);

    expect(r2DeleteMock).toHaveBeenCalledTimes(2);
    expect(r2DeleteMock.mock.calls[0][0]).toHaveLength(1000);
    expect(r2DeleteMock.mock.calls[1][0]).toHaveLength(500);
  });

  it("reports the keys of a failed batch and still purges the rest", async () => {
    const keys = Array.from({ length: 1500 }, (_, i) => `deep-reports/${i}`);
    r2DeleteMock.mockRejectedValueOnce(new Error("r2 down"));

    const orphaned = await deleteDeepReports(keys);

    // The second batch must still be attempted — one bad call cannot be
    // allowed to strand every key behind it.
    expect(r2DeleteMock).toHaveBeenCalledTimes(2);
    expect(orphaned).toHaveLength(1000);
    expect(orphaned).not.toContain("deep-reports/1400");
  });

  it("makes no call at all for an empty sweep", async () => {
    await expect(deleteDeepReports([])).resolves.toEqual([]);
    expect(r2DeleteMock).not.toHaveBeenCalled();
  });
});
