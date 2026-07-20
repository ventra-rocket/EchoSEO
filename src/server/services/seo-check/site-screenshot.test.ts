import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  normalizeUrlMock,
  checkIpRateLimitMock,
  isScreenshotDisabledMock,
  getScreenshotDailyCeilingMock,
  getSiteScreenshotMock,
  putSiteScreenshotMock,
  fetchPageSpeedMock,
  extractScreenshotMock,
  getRequiredEnvValueMock,
  captureServerErrorMock,
} = vi.hoisted(() => ({
  normalizeUrlMock: vi.fn(),
  checkIpRateLimitMock: vi.fn(),
  isScreenshotDisabledMock: vi.fn(),
  getScreenshotDailyCeilingMock: vi.fn(),
  getSiteScreenshotMock: vi.fn(),
  putSiteScreenshotMock: vi.fn(),
  fetchPageSpeedMock: vi.fn(),
  extractScreenshotMock: vi.fn(),
  getRequiredEnvValueMock: vi.fn(),
  captureServerErrorMock: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: { RATE_LIMIT_DO: {} },
  waitUntil: (promise: Promise<unknown>) => promise,
}));
vi.mock("@/server/lib/posthog", () => ({
  captureServerError: captureServerErrorMock,
}));
vi.mock("@/server/lib/runtime-env", () => ({
  getRequiredEnvValue: getRequiredEnvValueMock,
}));
vi.mock("@/server/lib/audit/url-policy", () => ({
  normalizeAndValidateStartUrl: normalizeUrlMock,
}));
vi.mock("@/server/lib/psi/pagespeed", () => ({
  fetchPageSpeed: fetchPageSpeedMock,
  extractScreenshot: extractScreenshotMock,
}));
vi.mock("./rate-limit-do", () => ({ checkIpRateLimit: checkIpRateLimitMock }));
vi.mock("./deep-check-config", () => ({
  isScreenshotDisabled: isScreenshotDisabledMock,
  getScreenshotDailyCeiling: getScreenshotDailyCeilingMock,
}));
vi.mock("./site-screenshot-store", () => ({
  getSiteScreenshot: getSiteScreenshotMock,
  putSiteScreenshot: putSiteScreenshotMock,
}));

const { handleSiteScreenshotRequest } = await import("./site-screenshot");

const PAGE_URL = "https://kello.test/";

function makeRequest(url = PAGE_URL, method = "GET"): Request {
  return new Request(
    `https://echoseo.test/api/free-seo-check/site-screenshot?url=${encodeURIComponent(url)}`,
    { method, headers: { "cf-connecting-ip": "203.0.113.7" } },
  );
}

function cachedObject(uploaded: Date) {
  return {
    body: new Response("bytes").body,
    httpMetadata: { contentType: "image/webp" },
    uploaded,
  };
}

const FRESH_SHOT = {
  bytes: new Uint8Array([1, 2, 3]),
  contentType: "image/webp",
  width: 1350,
  height: 900,
};

beforeEach(() => {
  vi.clearAllMocks();
  normalizeUrlMock.mockImplementation(async (u: string) => u);
  checkIpRateLimitMock.mockResolvedValue({ allowed: true });
  isScreenshotDisabledMock.mockResolvedValue(false);
  getScreenshotDailyCeilingMock.mockResolvedValue(300);
  getSiteScreenshotMock.mockResolvedValue(null);
  putSiteScreenshotMock.mockResolvedValue(undefined);
  getRequiredEnvValueMock.mockResolvedValue("psi-key");
  fetchPageSpeedMock.mockResolvedValue({ raw: true });
  extractScreenshotMock.mockReturnValue(FRESH_SHOT);
});

describe("handleSiteScreenshotRequest", () => {
  it("serves a fresh cached capture without rendering", async () => {
    getSiteScreenshotMock.mockResolvedValue(cachedObject(new Date()));

    const response = await handleSiteScreenshotRequest(makeRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(fetchPageSpeedMock).not.toHaveBeenCalled();
    // A cache hit must never spend a render slot.
    expect(checkIpRateLimitMock).toHaveBeenCalledTimes(1);
  });

  it("renders desktop, stores, and serves on a cache miss", async () => {
    const response = await handleSiteScreenshotRequest(makeRequest());

    expect(response.status).toBe(200);
    expect(fetchPageSpeedMock).toHaveBeenCalledWith(
      PAGE_URL,
      "psi-key",
      "desktop",
      expect.any(AbortSignal),
    );
    expect(putSiteScreenshotMock).toHaveBeenCalledWith(
      "kello.test",
      FRESH_SHOT,
    );
  });

  // The cache is keyed by domain, so the caller's path/query must never reach
  // PSI — otherwise the first caller could pin a domain's shared capture to any
  // page on it. Only the origin root is ever rendered.
  it("renders the origin root, not the caller's path or query", async () => {
    await handleSiteScreenshotRequest(
      makeRequest("https://kello.test/search?q=INJECTED#frag"),
    );

    expect(fetchPageSpeedMock).toHaveBeenCalledWith(
      "https://kello.test/",
      "psi-key",
      "desktop",
      expect.any(AbortSignal),
    );
  });

  it("re-renders when the cached capture is stale", async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    getSiteScreenshotMock.mockResolvedValue(cachedObject(twoDaysAgo));

    await handleSiteScreenshotRequest(makeRequest());

    expect(fetchPageSpeedMock).toHaveBeenCalled();
    expect(putSiteScreenshotMock).toHaveBeenCalled();
  });

  it("marks the response cacheable, noindex, and sniff-proof", async () => {
    const response = await handleSiteScreenshotRequest(makeRequest());

    expect(response.headers.get("Cache-Control")).toContain("public");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("validates the target URL through the SSRF policy", async () => {
    normalizeUrlMock.mockRejectedValue(new Error("CRAWL_TARGET_BLOCKED"));

    const response = await handleSiteScreenshotRequest(
      makeRequest("http://169.254.169.254/"),
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(fetchPageSpeedMock).not.toHaveBeenCalled();
  });

  it("applies the per-IP read limit before any render", async () => {
    checkIpRateLimitMock.mockResolvedValue({ allowed: false });

    const response = await handleSiteScreenshotRequest(makeRequest());

    expect(response.status).toBe(429);
    expect(fetchPageSpeedMock).not.toHaveBeenCalled();
  });

  // The kill-switch and the daily ceiling are about cost, not correctness, so a
  // stale capture is served rather than nothing.
  it("serves a stale capture instead of rendering when disabled", async () => {
    isScreenshotDisabledMock.mockResolvedValue(true);
    getSiteScreenshotMock.mockResolvedValue(
      cachedObject(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    );

    const response = await handleSiteScreenshotRequest(makeRequest());

    expect(response.status).toBe(200);
    expect(fetchPageSpeedMock).not.toHaveBeenCalled();
  });

  it("refuses without a capture when disabled and nothing is cached", async () => {
    isScreenshotDisabledMock.mockResolvedValue(true);

    const response = await handleSiteScreenshotRequest(makeRequest());

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(fetchPageSpeedMock).not.toHaveBeenCalled();
  });

  it("stops rendering once the global daily ceiling is hit", async () => {
    // First call = per-IP read (allowed); second = global render allowance.
    checkIpRateLimitMock
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false });

    const response = await handleSiteScreenshotRequest(makeRequest());

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(fetchPageSpeedMock).not.toHaveBeenCalled();
    expect(checkIpRateLimitMock).toHaveBeenCalledWith(
      {},
      "screenshot-render-global",
      expect.objectContaining({ limit: 300 }),
    );
  });

  it("serves a stale capture when PSI omits the screenshot", async () => {
    extractScreenshotMock.mockReturnValue(null);
    getSiteScreenshotMock.mockResolvedValue(
      cachedObject(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    );

    const response = await handleSiteScreenshotRequest(makeRequest());

    expect(response.status).toBe(200);
    expect(putSiteScreenshotMock).not.toHaveBeenCalled();
  });

  it("404s and stores nothing when no capture and no cache", async () => {
    extractScreenshotMock.mockReturnValue(null);

    const response = await handleSiteScreenshotRequest(makeRequest());

    // A missing thumbnail is a 404 (non-reported), not a 5xx server fault.
    expect(response.status).toBe(404);
    expect(putSiteScreenshotMock).not.toHaveBeenCalled();
  });

  // The ceiling protects cost, so when it is hit but a (stale) capture exists,
  // the visitor still gets an image rather than an empty frame.
  it("serves a stale capture when the render ceiling is hit", async () => {
    checkIpRateLimitMock
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false });
    getSiteScreenshotMock.mockResolvedValue(
      cachedObject(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    );

    const response = await handleSiteScreenshotRequest(makeRequest());

    expect(response.status).toBe(200);
    expect(fetchPageSpeedMock).not.toHaveBeenCalled();
  });

  it("rejects a non-GET method", async () => {
    const response = await handleSiteScreenshotRequest(
      makeRequest(PAGE_URL, "POST"),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });
});
