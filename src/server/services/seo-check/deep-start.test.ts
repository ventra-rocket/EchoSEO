import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as TurnstileModule from "./turnstile";
import { AppError } from "@/server/lib/errors";

// Typed arg shapes so the mocks' `.mock.calls` are typed (not `any`) — this
// keeps the assertions below free of unsafe member access / type assertions.
interface LeadArg {
  id: string;
  email: string;
  emailNormalized: string;
  url: string;
  domain: string;
  locale: string;
  source: string;
  confirmToken: string;
  confirmTokenExpiresAt: string;
}
interface ReportArg {
  id: string;
  leadId: string;
  domain: string;
  url: string;
  locale: string;
  status: string;
}
interface ConfirmationArg {
  to: string;
  targetUrl: string;
  confirmUrl: string;
  locale?: string;
}

const {
  isDeepCheckDisabledMock,
  verifyTurnstileTokenMock,
  checkIpRateLimitMock,
  getRequiredEnvValueMock,
  normalizeAndValidateStartUrlMock,
  safeFetchMock,
  captureServerErrorMock,
  createLeadWithReportMock,
  getEmailSenderMock,
  sendDeepCheckConfirmationMock,
} = vi.hoisted(() => ({
  isDeepCheckDisabledMock: vi.fn<() => Promise<boolean>>(),
  verifyTurnstileTokenMock: vi.fn(),
  checkIpRateLimitMock: vi.fn(),
  getRequiredEnvValueMock: vi.fn(),
  normalizeAndValidateStartUrlMock: vi.fn(),
  safeFetchMock: vi.fn(),
  captureServerErrorMock: vi.fn(),
  createLeadWithReportMock:
    vi.fn<(lead: LeadArg, report: ReportArg) => Promise<void>>(),
  getEmailSenderMock: vi.fn(),
  sendDeepCheckConfirmationMock:
    vi.fn<(sender: unknown, input: ConfirmationArg) => Promise<void>>(),
}));

vi.mock("cloudflare:workers", () => ({
  env: { RATE_LIMIT_DO: {} },
  waitUntil: (promise: Promise<unknown>) => promise,
}));
vi.mock("./deep-check-config", () => ({
  isDeepCheckDisabled: isDeepCheckDisabledMock,
}));
vi.mock("./turnstile", async (importOriginal) => ({
  ...(await importOriginal<typeof TurnstileModule>()),
  verifyTurnstileToken: verifyTurnstileTokenMock,
}));
vi.mock("./rate-limit-do", () => ({
  checkIpRateLimit: checkIpRateLimitMock,
}));
vi.mock("@/server/lib/runtime-env", () => ({
  getRequiredEnvValue: getRequiredEnvValueMock,
}));
vi.mock("@/server/lib/audit/url-policy", () => ({
  normalizeAndValidateStartUrl: normalizeAndValidateStartUrlMock,
}));
vi.mock("./safe-fetch", () => ({ safeFetch: safeFetchMock }));
vi.mock("@/server/lib/posthog", () => ({
  captureServerError: captureServerErrorMock,
}));
vi.mock("./leads-repository", () => ({
  createLeadWithReport: createLeadWithReportMock,
}));
vi.mock("@/server/email/sender", () => ({
  getEmailSender: getEmailSenderMock,
}));
vi.mock("./email/deep-check-confirmation", () => ({
  sendDeepCheckConfirmation: sendDeepCheckConfirmationMock,
}));

const { handleStartDeepCheckRequest } = await import("./deep-start");

function makeRequest(body: unknown, method = "POST"): Request {
  return new Request("https://echoseo.test/api/free-seo-check/deep", {
    method,
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.5",
    },
  });
}

const VALID_BODY = {
  url: "example.test",
  email: "founder@example.com",
  consent: true,
  turnstileToken: "ok",
};

beforeEach(() => {
  vi.clearAllMocks();
  isDeepCheckDisabledMock.mockResolvedValue(false);
  getRequiredEnvValueMock.mockResolvedValue("test-secret");
  verifyTurnstileTokenMock.mockResolvedValue({ success: true, errorCodes: [] });
  checkIpRateLimitMock.mockResolvedValue({
    allowed: true,
    remaining: 9,
    resetAt: Date.now() + 1_000,
  });
  normalizeAndValidateStartUrlMock.mockResolvedValue("https://example.test/");
  safeFetchMock.mockResolvedValue({ finalUrl: "https://example.test/" });
  createLeadWithReportMock.mockResolvedValue(undefined);
  getEmailSenderMock.mockReturnValue({ send: vi.fn() });
  sendDeepCheckConfirmationMock.mockResolvedValue(undefined);
});

describe("handleStartDeepCheckRequest", () => {
  it("rejects non-POST methods", async () => {
    const response = await handleStartDeepCheckRequest(makeRequest({}, "GET"));
    expect(response.status).toBe(405);
    expect(verifyTurnstileTokenMock).not.toHaveBeenCalled();
  });

  it("refuses with the kill-switch on, before creating a lead or emailing", async () => {
    isDeepCheckDisabledMock.mockResolvedValue(true);
    const response = await handleStartDeepCheckRequest(makeRequest(VALID_BODY));
    expect(response.status).toBe(503);
    expect(verifyTurnstileTokenMock).not.toHaveBeenCalled();
    expect(createLeadWithReportMock).not.toHaveBeenCalled();
    expect(sendDeepCheckConfirmationMock).not.toHaveBeenCalled();
  });

  it("rejects a missing email before any gate", async () => {
    const response = await handleStartDeepCheckRequest(
      makeRequest({ url: "example.test", consent: true, turnstileToken: "ok" }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "VALIDATION_ERROR" });
    expect(verifyTurnstileTokenMock).not.toHaveBeenCalled();
  });

  it("rejects when consent is not explicitly true", async () => {
    const response = await handleStartDeepCheckRequest(
      makeRequest({ ...VALID_BODY, consent: false }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "VALIDATION_ERROR" });
  });

  it("checks Turnstile before the rate limit", async () => {
    verifyTurnstileTokenMock.mockResolvedValue({
      success: false,
      errorCodes: ["invalid-input-response"],
    });
    const response = await handleStartDeepCheckRequest(makeRequest(VALID_BODY));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "FORBIDDEN" });
    expect(checkIpRateLimitMock).not.toHaveBeenCalled();
  });

  it("enforces the rate limit before disposable/SSRF checks", async () => {
    checkIpRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 1_000,
    });
    const response = await handleStartDeepCheckRequest(makeRequest(VALID_BODY));
    expect(response.status).toBe(429);
    expect(normalizeAndValidateStartUrlMock).not.toHaveBeenCalled();
    expect(createLeadWithReportMock).not.toHaveBeenCalled();
  });

  it("rejects disposable emails before touching the URL or DB", async () => {
    const response = await handleStartDeepCheckRequest(
      makeRequest({ ...VALID_BODY, email: "burner@mailinator.com" }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "VALIDATION_ERROR" });
    expect(normalizeAndValidateStartUrlMock).not.toHaveBeenCalled();
    expect(createLeadWithReportMock).not.toHaveBeenCalled();
  });

  it("blocks an SSRF target before creating a lead", async () => {
    normalizeAndValidateStartUrlMock.mockRejectedValue(
      new AppError("CRAWL_TARGET_BLOCKED"),
    );
    const response = await handleStartDeepCheckRequest(
      makeRequest({ ...VALID_BODY, url: "http://169.254.169.254/" }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "CRAWL_TARGET_BLOCKED" });
    expect(createLeadWithReportMock).not.toHaveBeenCalled();
    expect(sendDeepCheckConfirmationMock).not.toHaveBeenCalled();
  });

  it("rejects an auth interstitial before creating a lead or sending email", async () => {
    safeFetchMock.mockResolvedValue({
      finalUrl: "https://team.cloudflareaccess.com/cdn-cgi/access/login",
    });

    const response = await handleStartDeepCheckRequest(makeRequest(VALID_BODY));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "TARGET_BEHIND_AUTH" });
    expect(createLeadWithReportMock).not.toHaveBeenCalled();
    expect(sendDeepCheckConfirmationMock).not.toHaveBeenCalled();
  });

  it("creates an unconfirmed lead + confirming report and sends the opt-in email", async () => {
    const response = await handleStartDeepCheckRequest(makeRequest(VALID_BODY));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: "confirmation_sent" });

    expect(createLeadWithReportMock).toHaveBeenCalledTimes(1);
    const lead = createLeadWithReportMock.mock.calls[0]?.[0];
    const report = createLeadWithReportMock.mock.calls[0]?.[1];
    expect(lead).toMatchObject({
      email: "founder@example.com",
      emailNormalized: "founder@example.com",
      url: "https://example.test/",
      domain: "example.test",
      source: "free-seo-check",
    });
    expect(lead?.confirmToken).toMatch(/^[0-9a-f]{64}$/);
    expect(Date.parse(lead?.confirmTokenExpiresAt ?? "")).toBeGreaterThan(
      Date.now(),
    );

    expect(report).toMatchObject({
      leadId: lead?.id,
      domain: "example.test",
      url: "https://example.test/",
      status: "confirming",
    });

    expect(sendDeepCheckConfirmationMock).toHaveBeenCalledTimes(1);
    const confirmation = sendDeepCheckConfirmationMock.mock.calls[0]?.[1];
    expect(confirmation?.to).toBe("founder@example.com");
    expect(confirmation?.targetUrl).toBe("https://example.test/");
    expect(confirmation?.confirmUrl).toContain(
      "https://echoseo.test/free-seo-check/confirm?token=",
    );
    expect(confirmation?.confirmUrl).toContain(lead?.confirmToken ?? "");
  });

  it("persists the requester's locale on the lead, report, and opt-in email", async () => {
    await handleStartDeepCheckRequest(
      makeRequest({ ...VALID_BODY, locale: "vi" }),
    );
    expect(createLeadWithReportMock.mock.calls[0]?.[0]?.locale).toBe("vi");
    expect(createLeadWithReportMock.mock.calls[0]?.[1]?.locale).toBe("vi");
    const confirmation = sendDeepCheckConfirmationMock.mock.calls[0]?.[1];
    expect(confirmation?.locale).toBe("vi");
    // The emailed confirm link carries the language so the confirm page renders VN.
    expect(confirmation?.confirmUrl).toContain("lang=vi");
  });

  it("defaults locale to English when the request omits it", async () => {
    await handleStartDeepCheckRequest(makeRequest(VALID_BODY));
    expect(createLeadWithReportMock.mock.calls[0]?.[0]?.locale).toBe("en");
    expect(createLeadWithReportMock.mock.calls[0]?.[1]?.locale).toBe("en");
    // English links stay unchanged — no lang param.
    expect(
      sendDeepCheckConfirmationMock.mock.calls[0]?.[1]?.confirmUrl,
    ).not.toContain("lang=");
  });

  it("does not send the email if the lead insert fails", async () => {
    createLeadWithReportMock.mockRejectedValue(new Error("db down"));
    const response = await handleStartDeepCheckRequest(makeRequest(VALID_BODY));
    expect(response.status).toBe(500);
    expect(sendDeepCheckConfirmationMock).not.toHaveBeenCalled();
    expect(captureServerErrorMock).toHaveBeenCalled();
  });
});
