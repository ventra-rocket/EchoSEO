import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/lib/runtime-env", () => ({
  getRequiredEnvValue: vi.fn(async () => "test-api-key"),
}));

import { fetchQuestionsAnswers } from "@/server/lib/dataforseo/business";
import { AppError } from "@/server/lib/errors";

/** Issues one call through the shared authenticated fetch and returns the AppError it throws. */
async function captureFailure(
  status: number,
  body: unknown,
): Promise<AppError> {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  try {
    await fetchQuestionsAnswers({
      keyword: "test",
      locationCoordinate: "10.7769,106.7009",
      languageCode: "en",
      depth: 10,
    });
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error(`Expected HTTP ${status} to throw`);
}

describe("DataForSEO HTTP failures", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // The exact body a verified-email-but-unverified-account returns, captured
  // from production on 2026-08-12. Its status_code is the whole diagnosis, and
  // it used to be dropped before anything logged it.
  it("carries DataForSEO's own status_code and message in the error message", async () => {
    const error = await captureFailure(403, {
      version: "0.1.20260806",
      status_code: 40104,
      status_message:
        "Please verify your account before using the API. You can complete verification in the user panel: https://app.dataforseo.com/ .",
      cost: 0,
      tasks: null,
    });

    expect(error.message).toContain("40104");
    expect(error.message).toContain("Please verify your account");
  });

  it("treats 403 as an actionable DataForSEO auth failure, not an internal error", async () => {
    const error = await captureFailure(403, {
      status_code: 40104,
      status_message: "Please verify your account before using the API.",
    });

    expect(error.code).toBe("DATAFORSEO_AUTH_FAILED");
  });

  it("still treats a rejected credential (401) as an auth failure", async () => {
    const error = await captureFailure(401, {
      status_code: 40100,
      status_message: "You are not authorized to access this resource.",
    });

    expect(error.code).toBe("DATAFORSEO_AUTH_FAILED");
    expect(error.message).toContain("40100");
  });

  it("keeps the raw body available alongside the summarised message", async () => {
    const error = await captureFailure(403, {
      status_code: 40104,
      status_message: "Please verify your account before using the API.",
    });

    expect(error.details?.responseBody).toContain("40104");
  });

  it("degrades to the plain message when the body is not DataForSEO's envelope", async () => {
    const error = await captureFailure(403, "<html>gateway said no</html>");

    expect(error.message).not.toContain("(");
    expect(error.message).toContain("DataForSEO HTTP 403");
  });

  it("truncates an overlong upstream message so it cannot dominate the log line", async () => {
    const error = await captureFailure(403, {
      status_code: 40104,
      status_message: "x".repeat(500),
    });

    expect(error.message).toContain("...");
    expect(error.message.length).toBeLessThan(400);
  });
});
