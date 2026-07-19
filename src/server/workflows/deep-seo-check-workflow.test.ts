import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  NonRetryableError,
  PsiRequestError,
  getRequiredEnvValueMock,
  fetchPageSpeedMock,
  shapePsiResultMock,
  extractScreenshotMock,
  crawlSiteMock,
  buildDeepReportMock,
  putDeepReportMock,
  putReportScreenshotMock,
  markReportRunningMock,
  markReportDoneMock,
  markReportFailedMock,
  sendReportReadyEmailMock,
} = vi.hoisted(() => {
  class FakeNonRetryableError extends Error {}
  class FakePsiRequestError extends Error {
    constructor(public readonly status: number) {
      super(`PSI request failed: ${status}`);
    }
  }
  return {
    NonRetryableError: FakeNonRetryableError,
    PsiRequestError: FakePsiRequestError,
    getRequiredEnvValueMock: vi.fn(),
    fetchPageSpeedMock: vi.fn(),
    shapePsiResultMock: vi.fn(),
    extractScreenshotMock: vi.fn(),
    crawlSiteMock: vi.fn(),
    buildDeepReportMock: vi.fn(),
    putDeepReportMock: vi.fn(),
    putReportScreenshotMock: vi.fn(),
    markReportRunningMock: vi.fn(),
    markReportDoneMock: vi.fn(),
    markReportFailedMock: vi.fn(),
    sendReportReadyEmailMock: vi.fn(),
  };
});

vi.mock("cloudflare:workers", () => ({
  WorkflowEntrypoint: class {
    isBase = true;
  },
}));
vi.mock("cloudflare:workflows", () => ({ NonRetryableError }));
vi.mock("@/server/lib/runtime-env", () => ({
  getRequiredEnvValue: getRequiredEnvValueMock,
}));
vi.mock("@/server/lib/psi/pagespeed", () => ({
  fetchPageSpeed: fetchPageSpeedMock,
  shapePsiResult: shapePsiResultMock,
  extractScreenshot: extractScreenshotMock,
  PsiRequestError,
}));
vi.mock("@/server/services/seo-check/crawl", () => ({
  crawlSite: crawlSiteMock,
}));
vi.mock("@/server/services/seo-check/deep", () => ({
  buildDeepReport: buildDeepReportMock,
}));
vi.mock("@/server/services/seo-check/report-store", () => ({
  putDeepReport: putDeepReportMock,
  putReportScreenshot: putReportScreenshotMock,
}));
vi.mock("@/server/services/seo-check/report-ready-email", () => ({
  sendReportReadyEmail: sendReportReadyEmailMock,
}));
vi.mock("@/server/services/seo-check/seo-reports-repository", () => ({
  markReportRunning: markReportRunningMock,
  markReportDone: markReportDoneMock,
  markReportFailed: markReportFailedMock,
}));

const { runDeepSeoCheck } = await import("./deep-seo-check-workflow");

function makeStep() {
  const order: string[] = [];
  /** Each step's durable output — what a retry would replay, and what the
   * 1 MiB cap applies to. */
  const results = new Map<string, unknown>();
  return {
    order,
    results,
    do: async <T>(name: string, callback: () => Promise<T> | T): Promise<T> => {
      order.push(name);
      const result = await callback();
      results.set(name, result);
      return result;
    },
  };
}

const PARAMS = { reportId: "r1", url: "https://x.test/" };
const PSI = { coreWebVitals: null, cwvSource: null, scores: {} };
const CRAWL = { pages: [] };
const REPORT = { requestedUrl: "https://x.test/" };

beforeEach(() => {
  vi.clearAllMocks();
  getRequiredEnvValueMock.mockResolvedValue("psi-key");
  fetchPageSpeedMock.mockResolvedValue({ raw: true });
  shapePsiResultMock.mockReturnValue(PSI);
  crawlSiteMock.mockResolvedValue(CRAWL);
  buildDeepReportMock.mockReturnValue(REPORT);
  putDeepReportMock.mockResolvedValue("deep-reports/r1.json");
  extractScreenshotMock.mockReturnValue(null);
  putReportScreenshotMock.mockResolvedValue(undefined);
  markReportRunningMock.mockResolvedValue(undefined);
  markReportDoneMock.mockResolvedValue(undefined);
  markReportFailedMock.mockResolvedValue(undefined);
  sendReportReadyEmailMock.mockResolvedValue(undefined);
});

describe("runDeepSeoCheck", () => {
  const SHOT = {
    bytes: new Uint8Array([1]),
    contentType: "image/webp",
    width: 412,
    height: 900,
  };

  it("stores the capture inside the PSI step and reports only its size", async () => {
    extractScreenshotMock.mockReturnValue(SHOT);
    const step = makeStep();
    await runDeepSeoCheck(step, PARAMS);

    expect(putReportScreenshotMock).toHaveBeenCalledWith("r1", SHOT);
    // Assert the step's own durable output, not what buildDeepReport received:
    // step results are capped at 1 MiB, so what matters is that the image bytes
    // never appear in the value that crosses the boundary.
    expect(step.results.get("pagespeed")).toEqual({
      psi: PSI,
      screenshot: { width: 412, height: 900 },
    });
  });

  // The capture is corroborating evidence, never a precondition: a report is
  // still worth delivering without a picture.
  it("still finishes the report when the capture cannot be stored", async () => {
    extractScreenshotMock.mockReturnValue(SHOT);
    putReportScreenshotMock.mockRejectedValue(new Error("r2 down"));

    const step = makeStep();
    await runDeepSeoCheck(step, PARAMS);

    expect(step.order).toContain("send-report-email");
    expect(markReportDoneMock).toHaveBeenCalled();
    expect(buildDeepReportMock).toHaveBeenCalledWith(
      expect.objectContaining({ screenshot: null }),
    );
  });

  it("runs PSI then crawl+persist and commits done R2-first", async () => {
    const step = makeStep();
    await runDeepSeoCheck(step, PARAMS);

    // The email goes last, after the report is committed: it is an announcement
    // of finished work, never a precondition for it.
    expect(step.order).toEqual([
      "mark-running",
      "pagespeed",
      "crawl-and-persist",
      "send-report-email",
    ]);
    expect(sendReportReadyEmailMock).toHaveBeenCalledWith("r1");
    expect(fetchPageSpeedMock).toHaveBeenCalledWith(
      "https://x.test/",
      "psi-key",
    );
    expect(buildDeepReportMock).toHaveBeenCalledWith({
      requestedUrl: "https://x.test/",
      crawl: CRAWL,
      psi: PSI,
      screenshot: null,
    });
    expect(putDeepReportMock).toHaveBeenCalledWith("r1", REPORT);
    expect(markReportDoneMock).toHaveBeenCalledWith(
      "r1",
      "deep-reports/r1.json",
    );
    expect(markReportFailedMock).not.toHaveBeenCalled();
  });

  it("fails fast on a shaping error and records the failure once", async () => {
    shapePsiResultMock.mockImplementation(() => {
      throw new Error("bad payload");
    });
    const step = makeStep();

    // A successful fetch with a bad payload must not retry (would re-spend quota).
    await expect(runDeepSeoCheck(step, PARAMS)).rejects.toBeInstanceOf(
      NonRetryableError,
    );
    expect(fetchPageSpeedMock).toHaveBeenCalledTimes(1);
    expect(crawlSiteMock).not.toHaveBeenCalled();
    expect(markReportDoneMock).not.toHaveBeenCalled();
    expect(markReportFailedMock).toHaveBeenCalledWith("r1", expect.any(String));
  });

  it("fails fast (non-retryable) on a permanent PSI 4xx to protect the quota", async () => {
    fetchPageSpeedMock.mockRejectedValue(new PsiRequestError(400));
    const step = makeStep();

    await expect(runDeepSeoCheck(step, PARAMS)).rejects.toBeInstanceOf(
      NonRetryableError,
    );
    expect(shapePsiResultMock).not.toHaveBeenCalled();
    expect(markReportFailedMock).toHaveBeenCalledWith("r1", expect.any(String));
  });

  it.each([429, 500])(
    "keeps a transient PSI %i retryable (rethrown as-is, not NonRetryable)",
    async (status) => {
      fetchPageSpeedMock.mockRejectedValue(new PsiRequestError(status));
      const step = makeStep();

      const rejection = await runDeepSeoCheck(step, PARAMS).catch(
        (error: unknown) => error,
      );
      expect(rejection).toBeInstanceOf(PsiRequestError);
      expect(rejection).not.toBeInstanceOf(NonRetryableError);
      expect(markReportFailedMock).toHaveBeenCalledWith(
        "r1",
        expect.any(String),
      );
    },
  );

  it("marks the report failed when the crawl throws", async () => {
    crawlSiteMock.mockRejectedValue(new Error("dns"));
    const step = makeStep();

    await expect(runDeepSeoCheck(step, PARAMS)).rejects.toThrow();
    expect(markReportDoneMock).not.toHaveBeenCalled();
    expect(markReportFailedMock).toHaveBeenCalledWith("r1", expect.any(String));
  });

  it("announces nothing when the audit failed", async () => {
    // The cron sweep mails terminal reports, failures included — this route must
    // not race it from inside the error path it is already handling.
    crawlSiteMock.mockRejectedValue(new Error("dns"));

    await expect(runDeepSeoCheck(makeStep(), PARAMS)).rejects.toThrow();

    expect(sendReportReadyEmailMock).not.toHaveBeenCalled();
  });

  it("keeps a finished report finished when the email step throws", async () => {
    // A mail problem must never reach the failure path and undo committed work:
    // the report exists in R2, its page renders, and the sweep retries the mail.
    sendReportReadyEmailMock.mockRejectedValue(new Error("d1 blip"));

    await expect(runDeepSeoCheck(makeStep(), PARAMS)).rejects.toThrow();

    expect(markReportDoneMock).toHaveBeenCalled();
    expect(markReportFailedMock).not.toHaveBeenCalled();
  });
});
