import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  checkIpRateLimitMock,
  findLeadByConfirmTokenMock,
  markLeadConfirmedMock,
  findReportByLeadIdMock,
  tryQueueConfirmingReportMock,
  enqueueDeepCheckMock,
  captureServerErrorMock,
} = vi.hoisted(() => ({
  checkIpRateLimitMock: vi.fn(),
  findLeadByConfirmTokenMock: vi.fn(),
  markLeadConfirmedMock: vi.fn(),
  findReportByLeadIdMock: vi.fn(),
  tryQueueConfirmingReportMock: vi.fn(),
  enqueueDeepCheckMock: vi.fn(),
  captureServerErrorMock: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: { RATE_LIMIT_DO: {} },
  waitUntil: (promise: Promise<unknown>) => promise,
}));
vi.mock("@/server/lib/posthog", () => ({
  captureServerError: captureServerErrorMock,
}));
vi.mock("./rate-limit-do", () => ({
  checkIpRateLimit: checkIpRateLimitMock,
}));
vi.mock("./leads-repository", () => ({
  findLeadByConfirmToken: findLeadByConfirmTokenMock,
  markLeadConfirmed: markLeadConfirmedMock,
}));
vi.mock("./seo-reports-repository", () => ({
  findReportByLeadId: findReportByLeadIdMock,
  tryQueueConfirmingReport: tryQueueConfirmingReportMock,
}));
vi.mock("./deep-check-enqueue", () => ({
  enqueueDeepCheck: enqueueDeepCheckMock,
}));

const { handleConfirmDeepCheckRequest } = await import("./deep-confirm");

function makeRequest(body: unknown, method = "POST"): Request {
  return new Request("https://echoseo.test/api/free-seo-check/confirm", {
    method,
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    headers: { "content-type": "application/json" },
  });
}

const TOKEN = "a".repeat(64);
const FUTURE = new Date(Date.now() + 60_000).toISOString();
const PAST = new Date(Date.now() - 60_000).toISOString();

function lead(overrides: Record<string, unknown> = {}) {
  return {
    id: "lead-1",
    email: "founder@example.com",
    emailNormalized: "founder@example.com",
    url: "https://example.test/",
    domain: "example.test",
    locale: "en",
    source: "free-seo-check",
    confirmToken: TOKEN,
    confirmTokenExpiresAt: FUTURE,
    consentConfirmedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  checkIpRateLimitMock.mockResolvedValue({
    allowed: true,
    remaining: 9,
    resetAt: Date.now() + 1_000,
  });
  findLeadByConfirmTokenMock.mockResolvedValue(lead());
  markLeadConfirmedMock.mockResolvedValue(undefined);
  findReportByLeadIdMock.mockResolvedValue({
    id: "report-1",
    leadId: "lead-1",
    status: "confirming",
  });
  tryQueueConfirmingReportMock.mockResolvedValue(true);
  enqueueDeepCheckMock.mockResolvedValue(undefined);
});

describe("handleConfirmDeepCheckRequest", () => {
  it("rejects non-POST methods", async () => {
    const response = await handleConfirmDeepCheckRequest(
      makeRequest({}, "GET"),
    );
    expect(response.status).toBe(405);
    expect(findLeadByConfirmTokenMock).not.toHaveBeenCalled();
  });

  it("enforces the rate limit", async () => {
    checkIpRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 1_000,
    });
    const response = await handleConfirmDeepCheckRequest(
      makeRequest({ token: TOKEN }),
    );
    expect(response.status).toBe(429);
    expect(findLeadByConfirmTokenMock).not.toHaveBeenCalled();
  });

  it("rejects a body without a token", async () => {
    const response = await handleConfirmDeepCheckRequest(makeRequest({}));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "VALIDATION_ERROR" });
  });

  it("returns 404 for an unknown token", async () => {
    findLeadByConfirmTokenMock.mockResolvedValue(null);
    const response = await handleConfirmDeepCheckRequest(
      makeRequest({ token: "nope" }),
    );
    expect(response.status).toBe(404);
    expect(markLeadConfirmedMock).not.toHaveBeenCalled();
    expect(enqueueDeepCheckMock).not.toHaveBeenCalled();
  });

  it("rejects an expired token that was never confirmed", async () => {
    findLeadByConfirmTokenMock.mockResolvedValue(
      lead({ confirmTokenExpiresAt: PAST }),
    );
    const response = await handleConfirmDeepCheckRequest(
      makeRequest({ token: TOKEN }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "VALIDATION_ERROR" });
    expect(markLeadConfirmedMock).not.toHaveBeenCalled();
    expect(enqueueDeepCheckMock).not.toHaveBeenCalled();
  });

  it("confirms consent, queues the report, and enqueues exactly once", async () => {
    const response = await handleConfirmDeepCheckRequest(
      makeRequest({ token: TOKEN }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "confirmed" });

    expect(markLeadConfirmedMock).toHaveBeenCalledTimes(1);
    expect(markLeadConfirmedMock.mock.calls[0]?.[0]).toBe("lead-1");
    expect(tryQueueConfirmingReportMock).toHaveBeenCalledWith("report-1");
    expect(enqueueDeepCheckMock).toHaveBeenCalledTimes(1);
    expect(enqueueDeepCheckMock).toHaveBeenCalledWith("report-1");
  });

  it("does not enqueue when the report CAS loses the race", async () => {
    tryQueueConfirmingReportMock.mockResolvedValue(false);
    const response = await handleConfirmDeepCheckRequest(
      makeRequest({ token: TOKEN }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "confirmed" });
    expect(markLeadConfirmedMock).toHaveBeenCalledTimes(1);
    expect(enqueueDeepCheckMock).not.toHaveBeenCalled();
  });

  it("is idempotent when already confirmed and already queued", async () => {
    findLeadByConfirmTokenMock.mockResolvedValue(
      lead({ consentConfirmedAt: "2026-01-01T00:00:00.000Z" }),
    );
    tryQueueConfirmingReportMock.mockResolvedValue(false);
    const response = await handleConfirmDeepCheckRequest(
      makeRequest({ token: TOKEN }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "already_confirmed" });
    expect(markLeadConfirmedMock).not.toHaveBeenCalled();
    expect(enqueueDeepCheckMock).not.toHaveBeenCalled();
  });

  it("recovers a report stranded in confirming after a partial failure", async () => {
    // Consent was recorded on an earlier attempt, but the report never queued.
    findLeadByConfirmTokenMock.mockResolvedValue(
      lead({ consentConfirmedAt: "2026-01-01T00:00:00.000Z" }),
    );
    tryQueueConfirmingReportMock.mockResolvedValue(true);
    const response = await handleConfirmDeepCheckRequest(
      makeRequest({ token: TOKEN }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "already_confirmed" });
    expect(markLeadConfirmedMock).not.toHaveBeenCalled();
    expect(enqueueDeepCheckMock).toHaveBeenCalledTimes(1);
    expect(enqueueDeepCheckMock).toHaveBeenCalledWith("report-1");
  });

  it("records consent but does not enqueue when the report is missing", async () => {
    findReportByLeadIdMock.mockResolvedValue(null);
    const response = await handleConfirmDeepCheckRequest(
      makeRequest({ token: TOKEN }),
    );
    expect(response.status).toBe(200);
    expect(markLeadConfirmedMock).toHaveBeenCalledTimes(1);
    expect(tryQueueConfirmingReportMock).not.toHaveBeenCalled();
    expect(enqueueDeepCheckMock).not.toHaveBeenCalled();
  });
});
