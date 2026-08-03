import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LiteReport, Signal } from "./types";

const {
  checkIpRateLimitMock,
  getLiteCheckSnapshotMock,
  isDeepCheckDisabledMock,
  captureServerErrorMock,
} = vi.hoisted(() => ({
  checkIpRateLimitMock: vi.fn(),
  getLiteCheckSnapshotMock: vi.fn(),
  isDeepCheckDisabledMock: vi.fn(),
  captureServerErrorMock: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: { RATE_LIMIT_DO: {} },
  waitUntil: (promise: Promise<unknown>) => promise,
}));
vi.mock("@/server/lib/posthog", () => ({
  captureServerError: captureServerErrorMock,
}));
vi.mock("./rate-limit-do", () => ({ checkIpRateLimit: checkIpRateLimitMock }));
vi.mock("./check-store", () => ({
  getLiteCheckSnapshot: getLiteCheckSnapshotMock,
}));
vi.mock("./deep-check-config", () => ({
  isDeepCheckDisabled: isDeepCheckDisabledMock,
}));

const { handleCheckReadRequest, buildCheckPageMetaTags } =
  await import("./check-read");

const CHECK_ID = "0b6d3a1e-4f2c-4d5b-9a7e-1c2d3e4f5a6b";

// `server-https` carries a real `locales.vi` entry in the rule catalog, so the
// localization assertions below run the actual read-time seam end to end.
const HTTPS_SIGNAL: Signal = {
  id: "server-https",
  category: "server",
  status: "pass",
  label: "Served over HTTPS",
  severity: "critical",
  problem: "problem text",
  fixSteps: ["step"],
  googleSourceUrl: "https://developers.google.com/x",
  guideQuote: "quote",
  lastReviewedDate: "2026-07-13",
};

const REPORT: LiteReport = {
  requestedUrl: "example.test",
  finalUrl: "https://Example.test/page",
  statusCode: 200,
  fetchedAt: "2026-08-01T00:00:00.000Z",
  overallScore: 90,
  categoryScores: [],
  signals: [HTTPS_SIGNAL],
  pageSummary: { title: "t", metaDescription: "", h1: null, wordCount: 10 },
  deepTeaser: { coreWebVitalsMetricCount: 4 },
};

function makeRequest(id: string, method = "GET"): Request {
  return new Request(
    `https://echoseo.test/api/free-seo-check/check?id=${encodeURIComponent(id)}`,
    { method, headers: { "cf-connecting-ip": "203.0.113.7" } },
  );
}

/** Stands in for shared/free-seo-check's `publicUrl`, which server.ts injects. */
function publicUrl(pathname: string): string {
  return `https://echoseo.test${pathname}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  checkIpRateLimitMock.mockResolvedValue({ allowed: true });
  getLiteCheckSnapshotMock.mockResolvedValue({
    report: REPORT,
    locale: "en",
    createdAt: "2026-08-03T10:00:00Z",
  });
  isDeepCheckDisabledMock.mockResolvedValue(false);
});

describe("handleCheckReadRequest", () => {
  it("returns the snapshot for a known check", async () => {
    const response = await handleCheckReadRequest(makeRequest(CHECK_ID));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      report: REPORT,
      locale: "en",
      createdAt: "2026-08-03T10:00:00Z",
      deepAvailable: true,
    });
    expect(getLiteCheckSnapshotMock).toHaveBeenCalledWith(CHECK_ID);
  });

  it("localizes the signal text for a Vietnamese snapshot", async () => {
    getLiteCheckSnapshotMock.mockResolvedValue({
      report: REPORT,
      locale: "vi",
      createdAt: "2026-08-03T10:00:00Z",
    });

    const body = await (
      await handleCheckReadRequest(makeRequest(CHECK_ID))
    ).json<{ report: LiteReport }>();

    // The stored label is canonical EN; the wire carries the catalog's vi text.
    expect(body.report.signals[0].label).toBe("Trang được phân phát qua HTTPS");
    // Non-presentational fields survive localization untouched.
    expect(body.report.signals[0].guideQuote).toBe("quote");
  });

  it("404s a missing or corrupt snapshot the same way", async () => {
    getLiteCheckSnapshotMock.mockResolvedValue(null);

    const response = await handleCheckReadRequest(makeRequest(CHECK_ID));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "NOT_FOUND" });
  });

  it.each(["", "not-a-uuid", "../../etc/passwd", "1 OR 1=1"])(
    "rejects %j before touching the rate limiter or R2",
    async (id) => {
      const response = await handleCheckReadRequest(makeRequest(id));

      expect(response.status).toBe(400);
      // A junk-id flood on a public endpoint must not cost a DO round-trip.
      expect(checkIpRateLimitMock).not.toHaveBeenCalled();
      expect(getLiteCheckSnapshotMock).not.toHaveBeenCalled();
    },
  );

  it("rate-limits reads on their own budget, not the Lite check's", async () => {
    await handleCheckReadRequest(makeRequest(CHECK_ID));

    expect(checkIpRateLimitMock).toHaveBeenCalledWith(
      {},
      "check-read:203.0.113.7",
      { limit: 120, windowMs: 10 * 60 * 1000 },
    );
  });

  it("429s once the read budget is spent", async () => {
    checkIpRateLimitMock.mockResolvedValue({ allowed: false });

    const response = await handleCheckReadRequest(makeRequest(CHECK_ID));

    expect(response.status).toBe(429);
    expect(getLiteCheckSnapshotMock).not.toHaveBeenCalled();
  });

  it("reads the Deep kill-switch fresh on every request", async () => {
    // The snapshot froze while Deep was up; the switch flipped since. The
    // response must say so, or the page offers a form that refuses.
    isDeepCheckDisabledMock.mockResolvedValue(true);
    const paused = await handleCheckReadRequest(makeRequest(CHECK_ID));
    expect(await paused.json()).toMatchObject({ deepAvailable: false });

    isDeepCheckDisabledMock.mockResolvedValue(false);
    const resumed = await handleCheckReadRequest(makeRequest(CHECK_ID));
    expect(await resumed.json()).toMatchObject({ deepAvailable: true });
  });

  it("emits the share_view funnel metric with the snapshot's domain", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await handleCheckReadRequest(makeRequest(CHECK_ID));

    expect(log).toHaveBeenCalledWith(
      "[metric] event=share_view domain=example.test",
    );
    log.mockRestore();
  });

  it("rejects non-GET methods", async () => {
    const response = await handleCheckReadRequest(
      makeRequest(CHECK_ID, "POST"),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });
});

describe("buildCheckPageMetaTags", () => {
  it("builds the score-in-title card from the snapshot", async () => {
    const tags = await buildCheckPageMetaTags(CHECK_ID, publicUrl);

    expect(tags).toContainEqual({
      attr: "property",
      key: "og:title",
      content: "SEO score 90/100 — example.test",
    });
    expect(tags).toContainEqual({
      attr: "property",
      key: "og:url",
      content: `https://echoseo.test/c/${CHECK_ID}`,
    });
    // The static brand card, with the dimensions unfurl bots want up front.
    expect(tags).toContainEqual({
      attr: "property",
      key: "og:image",
      content: "https://echoseo.test/og-free-seo-check.png",
    });
    expect(tags).toContainEqual({
      attr: "property",
      key: "og:image:width",
      content: "1200",
    });
    expect(tags).toContainEqual({
      attr: "name",
      key: "twitter:card",
      content: "summary_large_image",
    });
  });

  it("uses the Vietnamese description for a Vietnamese snapshot", async () => {
    getLiteCheckSnapshotMock.mockResolvedValue({
      report: REPORT,
      locale: "vi",
      createdAt: "2026-08-03T10:00:00Z",
    });

    const tags = await buildCheckPageMetaTags(CHECK_ID, publicUrl);
    const description = tags?.find((tag) => tag.key === "og:description");

    expect(description?.content).toContain("Kiểm tra SEO");
  });

  it("returns null for a missing snapshot", async () => {
    getLiteCheckSnapshotMock.mockResolvedValue(null);
    expect(await buildCheckPageMetaTags(CHECK_ID, publicUrl)).toBeNull();
  });

  it("returns null for a non-UUID id without touching R2", async () => {
    expect(await buildCheckPageMetaTags("../../x", publicUrl)).toBeNull();
    expect(getLiteCheckSnapshotMock).not.toHaveBeenCalled();
  });

  it("returns null when the snapshot's final URL cannot be parsed", async () => {
    getLiteCheckSnapshotMock.mockResolvedValue({
      report: { ...REPORT, finalUrl: "not a url" },
      locale: "en",
      createdAt: "2026-08-03T10:00:00Z",
    });
    expect(await buildCheckPageMetaTags(CHECK_ID, publicUrl)).toBeNull();
  });
});
