import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  NonRetryableError,
  PsiRequestError,
  getRequiredEnvValueMock,
  fetchPageSpeedMock,
  shapePsiResultMock,
  crawlSiteMock,
  buildDeepReportMock,
  putDeepReportMock,
  markReportRunningMock,
  markReportDoneMock,
  markReportFailedMock,
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
    crawlSiteMock: vi.fn(),
    buildDeepReportMock: vi.fn(),
    putDeepReportMock: vi.fn(),
    markReportRunningMock: vi.fn(),
    markReportDoneMock: vi.fn(),
    markReportFailedMock: vi.fn(),
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
}));
vi.mock("@/server/services/seo-check/seo-reports-repository", () => ({
  markReportRunning: markReportRunningMock,
  markReportDone: markReportDoneMock,
  markReportFailed: markReportFailedMock,
}));

const { runDeepSeoCheck } = await import("./deep-seo-check-workflow");

function makeStep() {
  const order: string[] = [];
  return {
    order,
    do: async <T>(name: string, callback: () => Promise<T> | T): Promise<T> => {
      order.push(name);
      return callback();
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
  markReportRunningMock.mockResolvedValue(undefined);
  markReportDoneMock.mockResolvedValue(undefined);
  markReportFailedMock.mockResolvedValue(undefined);
});

describe("runDeepSeoCheck", () => {
  it("runs PSI then crawl+persist and commits done R2-first", async () => {
    const step = makeStep();
    await runDeepSeoCheck(step, PARAMS);

    expect(step.order).toEqual([
      "mark-running",
      "pagespeed",
      "crawl-and-persist",
    ]);
    expect(fetchPageSpeedMock).toHaveBeenCalledWith(
      "https://x.test/",
      "psi-key",
    );
    expect(buildDeepReportMock).toHaveBeenCalledWith({
      requestedUrl: "https://x.test/",
      crawl: CRAWL,
      psi: PSI,
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
});
