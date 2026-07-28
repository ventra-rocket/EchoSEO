import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/lib/errors";

const {
  verifyTurnstileTokenMock,
  checkIpRateLimitMock,
  getCachedLiteReportMock,
  putCachedLiteReportMock,
  runLiteCheckMock,
  getRequiredEnvValueMock,
  normalizeAndValidateStartUrlMock,
  captureServerErrorMock,
  isDeepCheckDisabledMock,
} = vi.hoisted(() => ({
  verifyTurnstileTokenMock: vi.fn(),
  checkIpRateLimitMock: vi.fn(),
  getCachedLiteReportMock: vi.fn(),
  putCachedLiteReportMock: vi.fn(),
  runLiteCheckMock: vi.fn(),
  getRequiredEnvValueMock: vi.fn(),
  normalizeAndValidateStartUrlMock: vi.fn(),
  captureServerErrorMock: vi.fn(),
  isDeepCheckDisabledMock: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: { RATE_LIMIT_DO: {} },
  waitUntil: (promise: Promise<unknown>) => promise,
}));
vi.mock("./turnstile", () => ({
  verifyTurnstileToken: verifyTurnstileTokenMock,
}));
vi.mock("./rate-limit-do", () => ({
  checkIpRateLimit: checkIpRateLimitMock,
}));
vi.mock("./cache", () => ({
  getCachedLiteReport: getCachedLiteReportMock,
  putCachedLiteReport: putCachedLiteReportMock,
}));
vi.mock("./lite", () => ({ runLiteCheck: runLiteCheckMock }));
vi.mock("./deep-check-config", () => ({
  isDeepCheckDisabled: isDeepCheckDisabledMock,
}));
vi.mock("@/server/lib/runtime-env", () => ({
  getRequiredEnvValue: getRequiredEnvValueMock,
}));
vi.mock("@/server/lib/audit/url-policy", () => ({
  normalizeAndValidateStartUrl: normalizeAndValidateStartUrlMock,
}));
vi.mock("@/server/lib/posthog", () => ({
  captureServerError: captureServerErrorMock,
}));

const { handleFreeSeoCheckRequest } = await import("./api");

function makeRequest(body: unknown, method = "POST"): Request {
  return new Request("https://echoseo.test/api/free-seo-check", {
    method,
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.5",
    },
  });
}

const FAKE_REPORT = {
  requestedUrl: "example.test",
  finalUrl: "https://example.test/",
  statusCode: 200,
  fetchedAt: "2026-01-01T00:00:00.000Z",
  overallScore: 90,
  categoryScores: [],
  signals: [],
  pageSummary: { title: "", metaDescription: "", h1: null, wordCount: 0 },
  deepTeaser: { coreWebVitalsMetricCount: 4 },
};

beforeEach(() => {
  vi.clearAllMocks();
  getRequiredEnvValueMock.mockResolvedValue("test-secret");
  verifyTurnstileTokenMock.mockResolvedValue({ success: true, errorCodes: [] });
  checkIpRateLimitMock.mockResolvedValue({
    allowed: true,
    remaining: 9,
    resetAt: Date.now() + 1_000,
  });
  normalizeAndValidateStartUrlMock.mockResolvedValue("https://example.test/");
  getCachedLiteReportMock.mockResolvedValue(null);
  runLiteCheckMock.mockResolvedValue(FAKE_REPORT);
  putCachedLiteReportMock.mockResolvedValue(undefined);
  isDeepCheckDisabledMock.mockResolvedValue(false);
});

describe("handleFreeSeoCheckRequest", () => {
  it("rejects non-POST methods", async () => {
    const response = await handleFreeSeoCheckRequest(makeRequest({}, "GET"));

    expect(response.status).toBe(405);
    expect(verifyTurnstileTokenMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid body before any gate runs", async () => {
    const response = await handleFreeSeoCheckRequest(makeRequest({}));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "VALIDATION_ERROR" });
    expect(verifyTurnstileTokenMock).not.toHaveBeenCalled();
    expect(captureServerErrorMock).not.toHaveBeenCalled();
  });

  it("checks Turnstile before the rate limit", async () => {
    verifyTurnstileTokenMock.mockResolvedValue({
      success: false,
      errorCodes: ["invalid-input-response"],
    });

    const response = await handleFreeSeoCheckRequest(
      makeRequest({ url: "example.test", turnstileToken: "bad" }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "FORBIDDEN" });
    expect(checkIpRateLimitMock).not.toHaveBeenCalled();
    expect(getCachedLiteReportMock).not.toHaveBeenCalled();
  });

  it("checks the rate limit before touching SSRF validation or the cache", async () => {
    checkIpRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 1_000,
    });

    const response = await handleFreeSeoCheckRequest(
      makeRequest({ url: "example.test", turnstileToken: "ok" }),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "RATE_LIMITED" });
    expect(normalizeAndValidateStartUrlMock).not.toHaveBeenCalled();
    expect(getCachedLiteReportMock).not.toHaveBeenCalled();
  });

  it("validates the URL (SSRF gate) before checking the cache", async () => {
    normalizeAndValidateStartUrlMock.mockRejectedValue(
      new AppError("CRAWL_TARGET_BLOCKED"),
    );

    const response = await handleFreeSeoCheckRequest(
      makeRequest({ url: "http://169.254.169.254/", turnstileToken: "ok" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "CRAWL_TARGET_BLOCKED" });
    expect(getCachedLiteReportMock).not.toHaveBeenCalled();
  });

  it("returns a cached report without crawling on a cache hit", async () => {
    getCachedLiteReportMock.mockResolvedValue(FAKE_REPORT);

    const response = await handleFreeSeoCheckRequest(
      makeRequest({ url: "example.test", turnstileToken: "ok" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      report: FAKE_REPORT,
      cached: true,
      deepAvailable: true,
    });
    expect(getCachedLiteReportMock).toHaveBeenCalledWith("example.test");
    expect(runLiteCheckMock).not.toHaveBeenCalled();
    expect(putCachedLiteReportMock).not.toHaveBeenCalled();
  });

  it("does not serve a cached score for an auth interstitial", async () => {
    getCachedLiteReportMock.mockResolvedValue({
      ...FAKE_REPORT,
      finalUrl: "https://team.cloudflareaccess.com/cdn-cgi/access/login",
    });

    const response = await handleFreeSeoCheckRequest(
      makeRequest({ url: "example.test", turnstileToken: "ok" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "TARGET_BEHIND_AUTH" });
    expect(runLiteCheckMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a cache hit", true],
    ["a cache miss", false],
  ])(
    "reports the deep tier as unavailable on %s when the kill-switch is on",
    async (_label, cacheHit) => {
      // Without this the page offers a form that asks for an email, a consent
      // tick, and a CAPTCHA, then refuses the request outright.
      isDeepCheckDisabledMock.mockResolvedValue(true);
      getCachedLiteReportMock.mockResolvedValue(cacheHit ? FAKE_REPORT : null);

      const response = await handleFreeSeoCheckRequest(
        makeRequest({ url: "example.test", turnstileToken: "ok" }),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ deepAvailable: false });
    },
  );

  it("reads the kill-switch per request rather than serving it from cache", async () => {
    // The switch can flip at any time; a report cached while it was off must
    // not keep hiding the form once it is back on.
    getCachedLiteReportMock.mockResolvedValue(FAKE_REPORT);
    isDeepCheckDisabledMock.mockResolvedValue(true);
    const paused = await handleFreeSeoCheckRequest(
      makeRequest({ url: "example.test", turnstileToken: "ok" }),
    );
    expect(await paused.json()).toMatchObject({
      cached: true,
      deepAvailable: false,
    });

    isDeepCheckDisabledMock.mockResolvedValue(false);
    const resumed = await handleFreeSeoCheckRequest(
      makeRequest({ url: "example.test", turnstileToken: "ok" }),
    );
    expect(await resumed.json()).toMatchObject({
      cached: true,
      deepAvailable: true,
    });
  });

  it("crawls and caches the result on a cache miss", async () => {
    const response = await handleFreeSeoCheckRequest(
      makeRequest({ url: "example.test", turnstileToken: "ok" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      report: FAKE_REPORT,
      cached: false,
      deepAvailable: true,
    });
    expect(runLiteCheckMock).toHaveBeenCalledWith("https://example.test/");
    expect(putCachedLiteReportMock).toHaveBeenCalledWith(
      "example.test",
      FAKE_REPORT,
    );
  });

  it("maps an unreachable target to 502 and does not cache the failure", async () => {
    runLiteCheckMock.mockRejectedValue(new AppError("UPSTREAM_UNAVAILABLE"));

    const response = await handleFreeSeoCheckRequest(
      makeRequest({ url: "example.test", turnstileToken: "ok" }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "UPSTREAM_UNAVAILABLE" });
    expect(putCachedLiteReportMock).not.toHaveBeenCalled();
  });

  it("maps an unexpected error to 500 and reports it", async () => {
    runLiteCheckMock.mockRejectedValue(new Error("boom"));

    const response = await handleFreeSeoCheckRequest(
      makeRequest({ url: "example.test", turnstileToken: "ok" }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "INTERNAL_ERROR" });
    expect(captureServerErrorMock).toHaveBeenCalled();
  });
});
