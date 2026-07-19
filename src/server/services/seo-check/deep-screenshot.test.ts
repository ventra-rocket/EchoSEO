import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  checkIpRateLimitMock,
  findReportByIdMock,
  resolveCanonicalRootMock,
  getReportScreenshotMock,
  captureServerErrorMock,
} = vi.hoisted(() => ({
  checkIpRateLimitMock: vi.fn(),
  findReportByIdMock: vi.fn(),
  resolveCanonicalRootMock: vi.fn(),
  getReportScreenshotMock: vi.fn(),
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
vi.mock("./seo-reports-repository", () => ({
  findReportById: findReportByIdMock,
}));
vi.mock("./report-view", () => ({
  resolveCanonicalRoot: resolveCanonicalRootMock,
}));
vi.mock("./report-store", () => ({
  getReportScreenshot: getReportScreenshotMock,
}));

const { handleDeepScreenshotRequest } = await import("./deep-screenshot");

const REPORT_ID = "0b6d3a1e-4f2c-4d5b-9a7e-1c2d3e4f5a6b";
const CANONICAL_ID = "9f8e7d6c-5b4a-4392-8171-0a1b2c3d4e5f";

function makeRequest(id: string, method = "GET"): Request {
  return new Request(
    `https://echoseo.test/api/free-seo-check/screenshot?id=${encodeURIComponent(id)}`,
    { method, headers: { "cf-connecting-ip": "203.0.113.7" } },
  );
}

function r2Object(body: string) {
  return {
    body: new Response(body).body,
    httpMetadata: { contentType: "image/webp" },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  checkIpRateLimitMock.mockResolvedValue({ allowed: true });
  findReportByIdMock.mockResolvedValue({ id: REPORT_ID, status: "done" });
  resolveCanonicalRootMock.mockResolvedValue({
    id: REPORT_ID,
    status: "done",
  });
  getReportScreenshotMock.mockResolvedValue(r2Object("bytes"));
});

describe("handleDeepScreenshotRequest", () => {
  it("serves the stored capture with its content type", async () => {
    const response = await handleDeepScreenshotRequest(makeRequest(REPORT_ID));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(await response.text()).toBe("bytes");
  });

  // The URL is a bearer capability, so it must not reach a shared cache, and
  // must never be indexed or leak its id through a referrer.
  it("marks the response private, noindex, and referrer-free", async () => {
    const response = await handleDeepScreenshotRequest(makeRequest(REPORT_ID));

    expect(response.headers.get("Cache-Control")).toContain("private");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  // A deduped report never ran its own check: its capture belongs to the
  // canonical root, so the R2 read must use that id, not the one in the URL.
  it("reads the capture of the canonical report, not the requested one", async () => {
    resolveCanonicalRootMock.mockResolvedValue({
      id: CANONICAL_ID,
      status: "done",
    });

    await handleDeepScreenshotRequest(makeRequest(REPORT_ID));

    expect(getReportScreenshotMock).toHaveBeenCalledWith(CANONICAL_ID);
  });

  // Bytes can exist in R2 before the D1 row commits `done`. Serving them early
  // would expose a report the visitor is not yet meant to see.
  it.each(["running", "queued", "failed"])(
    "refuses to serve a %s report",
    async (status) => {
      resolveCanonicalRootMock.mockResolvedValue({ id: REPORT_ID, status });

      const response = await handleDeepScreenshotRequest(
        makeRequest(REPORT_ID),
      );

      expect(response.status).toBe(404);
      expect(getReportScreenshotMock).not.toHaveBeenCalled();
    },
  );

  it("404s when the report has no stored capture", async () => {
    getReportScreenshotMock.mockResolvedValue(null);

    const response = await handleDeepScreenshotRequest(makeRequest(REPORT_ID));
    expect(response.status).toBe(404);
  });

  it("404s when the canonical chain is broken", async () => {
    resolveCanonicalRootMock.mockResolvedValue(null);

    const response = await handleDeepScreenshotRequest(makeRequest(REPORT_ID));
    expect(response.status).toBe(404);
  });

  it("404s for an unknown id", async () => {
    findReportByIdMock.mockResolvedValue(null);

    const response = await handleDeepScreenshotRequest(makeRequest(REPORT_ID));
    expect(response.status).toBe(404);
  });

  // Junk ids are rejected before they can cost a rate-limit round trip or a
  // database read — every real id is a crypto.randomUUID().
  it("rejects a non-UUID id without touching the rate limiter or the database", async () => {
    const response = await handleDeepScreenshotRequest(
      makeRequest("../../etc/passwd"),
    );

    expect(response.status).toBe(400);
    expect(checkIpRateLimitMock).not.toHaveBeenCalled();
    expect(findReportByIdMock).not.toHaveBeenCalled();
  });

  it("applies the read rate limit", async () => {
    checkIpRateLimitMock.mockResolvedValue({ allowed: false });

    const response = await handleDeepScreenshotRequest(makeRequest(REPORT_ID));
    expect(response.status).toBe(429);
    expect(getReportScreenshotMock).not.toHaveBeenCalled();
  });

  it("rejects a non-GET method", async () => {
    const response = await handleDeepScreenshotRequest(
      makeRequest(REPORT_ID, "POST"),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });
});
