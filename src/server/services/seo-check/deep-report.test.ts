import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkIpRateLimitMock, loadReportViewMock, captureServerErrorMock } =
  vi.hoisted(() => ({
    checkIpRateLimitMock: vi.fn(),
    loadReportViewMock: vi.fn(),
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
vi.mock("./report-view", () => ({ loadReportView: loadReportViewMock }));

const { handleDeepReportRequest } = await import("./deep-report");

const REPORT_ID = "0b6d3a1e-4f2c-4d5b-9a7e-1c2d3e4f5a6b";

function makeRequest(id: string, method = "GET"): Request {
  return new Request(
    `https://echoseo.test/api/free-seo-check/report?id=${encodeURIComponent(id)}`,
    { method, headers: { "cf-connecting-ip": "203.0.113.7" } },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  checkIpRateLimitMock.mockResolvedValue({ allowed: true });
  loadReportViewMock.mockResolvedValue({ status: "pending" });
});

describe("handleDeepReportRequest", () => {
  it("returns the view for a known report", async () => {
    const view = {
      status: "done",
      report: { overallScore: 77 },
      deduped: false,
    };
    loadReportViewMock.mockResolvedValue(view);

    const response = await handleDeepReportRequest(makeRequest(REPORT_ID));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(view);
    expect(loadReportViewMock).toHaveBeenCalledWith(REPORT_ID);
  });

  it("404s an unknown report", async () => {
    loadReportViewMock.mockResolvedValue(null);

    const response = await handleDeepReportRequest(makeRequest(REPORT_ID));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "NOT_FOUND" });
  });

  it.each(["", "not-a-uuid", "../../etc/passwd", "1 OR 1=1"])(
    "rejects %j before touching the rate limiter or the database",
    async (id) => {
      const response = await handleDeepReportRequest(makeRequest(id));

      expect(response.status).toBe(400);
      // A junk-id flood on a public endpoint must not cost a DO round-trip.
      expect(checkIpRateLimitMock).not.toHaveBeenCalled();
      expect(loadReportViewMock).not.toHaveBeenCalled();
    },
  );

  it("rate-limits reads on their own budget, not the Lite check's", async () => {
    await handleDeepReportRequest(makeRequest(REPORT_ID));

    expect(checkIpRateLimitMock).toHaveBeenCalledWith(
      {},
      "report:203.0.113.7",
      { limit: 120, windowMs: 10 * 60 * 1000 },
    );
  });

  it("429s once the read budget is spent", async () => {
    checkIpRateLimitMock.mockResolvedValue({ allowed: false });

    const response = await handleDeepReportRequest(makeRequest(REPORT_ID));

    expect(response.status).toBe(429);
    expect(loadReportViewMock).not.toHaveBeenCalled();
  });

  it("rejects non-GET methods", async () => {
    const response = await handleDeepReportRequest(
      makeRequest(REPORT_ID, "POST"),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });
});
