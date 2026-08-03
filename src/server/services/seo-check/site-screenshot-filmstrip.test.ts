/**
 * Tests for `handleSiteFilmstripRequest` — split from site-screenshot.test.ts
 * for the per-file line cap; the mock scaffold mirrors that file's because
 * both exercise the same module.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  normalizeUrlMock,
  checkIpRateLimitMock,
  isScreenshotDisabledMock,
  getScreenshotDailyCeilingMock,
  getSiteFilmstripMock,
  putSiteFilmstripMock,
  fetchPageSpeedMock,
} = vi.hoisted(() => ({
  normalizeUrlMock: vi.fn(),
  checkIpRateLimitMock: vi.fn(),
  isScreenshotDisabledMock: vi.fn(),
  getScreenshotDailyCeilingMock: vi.fn(),
  getSiteFilmstripMock: vi.fn(),
  putSiteFilmstripMock: vi.fn(),
  fetchPageSpeedMock: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: { RATE_LIMIT_DO: {} },
  waitUntil: (promise: Promise<unknown>) => promise,
}));
vi.mock("@/server/lib/posthog", () => ({ captureServerError: vi.fn() }));
vi.mock("@/server/lib/runtime-env", () => ({ getRequiredEnvValue: vi.fn() }));
vi.mock("@/server/lib/audit/url-policy", () => ({
  normalizeAndValidateStartUrl: normalizeUrlMock,
}));
vi.mock("@/server/lib/psi/pagespeed", () => ({
  fetchPageSpeed: fetchPageSpeedMock,
  extractScreenshot: vi.fn(),
  extractFilmstrip: vi.fn(),
  shapePsiLabResult: vi.fn(),
}));
vi.mock("./rate-limit-do", () => ({ checkIpRateLimit: checkIpRateLimitMock }));
vi.mock("./deep-check-config", () => ({
  isScreenshotDisabled: isScreenshotDisabledMock,
  getScreenshotDailyCeiling: getScreenshotDailyCeilingMock,
}));
vi.mock("./site-screenshot-store", () => ({
  getSiteScreenshot: vi.fn(),
  putSiteScreenshot: vi.fn(),
  getSiteFilmstrip: getSiteFilmstripMock,
  putSiteFilmstrip: putSiteFilmstripMock,
}));

const { handleSiteFilmstripRequest } = await import("./site-screenshot");

const PAGE_URL = "https://kello.test/";

function makeFilmstripRequest(
  url = PAGE_URL,
  method = "GET",
  strategy?: string,
): Request {
  const query = new URLSearchParams({ url });
  if (strategy !== undefined) query.set("strategy", strategy);
  return new Request(
    `https://echoseo.test/api/free-seo-check/site-filmstrip?${query}`,
    { method, headers: { "cf-connecting-ip": "203.0.113.7" } },
  );
}

function storedBundle() {
  return {
    body: new Response('{"version":1,"frames":[],"capturedAt":"x"}').body,
    httpMetadata: { contentType: "application/json" },
    uploaded: new Date(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  normalizeUrlMock.mockImplementation(async (u: string) => u);
  checkIpRateLimitMock.mockResolvedValue({ allowed: true });
  getSiteFilmstripMock.mockResolvedValue(null);
});

describe("handleSiteFilmstripRequest", () => {
  it("serves the stored bundle with the shared evidence headers", async () => {
    getSiteFilmstripMock.mockResolvedValue(storedBundle());

    const response = await handleSiteFilmstripRequest(makeFilmstripRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Cache-Control")).toContain("public");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(getSiteFilmstripMock).toHaveBeenCalledWith("kello.test", "desktop");
  });

  it("reads the strategy the caller asked for", async () => {
    getSiteFilmstripMock.mockResolvedValue(storedBundle());

    await handleSiteFilmstripRequest(
      makeFilmstripRequest(PAGE_URL, "GET", "mobile"),
    );

    expect(getSiteFilmstripMock).toHaveBeenCalledWith("kello.test", "mobile");
  });

  // Load-bearing: the client pre-warm fires concurrent GETs, and this module
  // has no single-flight — a filmstrip path that could render would
  // double-render every strategy. Absence must be a plain 404, never a spend.
  it("404s when no bundle exists and NEVER renders or spends the ceiling", async () => {
    const response = await handleSiteFilmstripRequest(makeFilmstripRequest());

    expect(response.status).toBe(404);
    expect(fetchPageSpeedMock).not.toHaveBeenCalled();
    expect(isScreenshotDisabledMock).not.toHaveBeenCalled();
    expect(getScreenshotDailyCeilingMock).not.toHaveBeenCalled();
    expect(putSiteFilmstripMock).not.toHaveBeenCalled();
    // Only the per-IP READ budget is consulted — never the render allowance.
    expect(checkIpRateLimitMock).toHaveBeenCalledTimes(1);
    expect(checkIpRateLimitMock).toHaveBeenCalledWith(
      {},
      "screenshot:203.0.113.7",
      expect.objectContaining({ limit: 300 }),
    );
  });

  it("serves a stale bundle rather than rendering a fresh one", async () => {
    getSiteFilmstripMock.mockResolvedValue({
      ...storedBundle(),
      uploaded: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });

    const response = await handleSiteFilmstripRequest(makeFilmstripRequest());

    expect(response.status).toBe(200);
    expect(fetchPageSpeedMock).not.toHaveBeenCalled();
  });

  it("shares the capture endpoint's per-IP read budget", async () => {
    checkIpRateLimitMock.mockResolvedValue({ allowed: false });

    const response = await handleSiteFilmstripRequest(makeFilmstripRequest());

    expect(response.status).toBe(429);
    expect(getSiteFilmstripMock).not.toHaveBeenCalled();
  });

  it("400s on a junk strategy", async () => {
    const response = await handleSiteFilmstripRequest(
      makeFilmstripRequest(PAGE_URL, "GET", "print"),
    );

    expect(response.status).toBe(400);
    expect(getSiteFilmstripMock).not.toHaveBeenCalled();
  });

  it("validates the target URL through the SSRF policy", async () => {
    normalizeUrlMock.mockRejectedValue(new Error("CRAWL_TARGET_BLOCKED"));

    const response = await handleSiteFilmstripRequest(
      makeFilmstripRequest("http://169.254.169.254/"),
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(getSiteFilmstripMock).not.toHaveBeenCalled();
  });

  it("rejects a non-GET method", async () => {
    const response = await handleSiteFilmstripRequest(
      makeFilmstripRequest(PAGE_URL, "POST"),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });
});
