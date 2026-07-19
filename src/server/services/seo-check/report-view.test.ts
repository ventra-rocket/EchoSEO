import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFix } from "@/server/lib/seo-rules";
import type { DeepReport } from "./deep-types";
import type { DeepSignal } from "./deep-types";
import type { ReportRow } from "./seo-reports-repository";

const { findReportByIdMock, getDeepReportMock } = vi.hoisted(() => ({
  findReportByIdMock: vi.fn(),
  getDeepReportMock: vi.fn(),
}));

vi.mock("./seo-reports-repository", () => ({
  findReportById: findReportByIdMock,
}));
vi.mock("./report-store", () => ({ getDeepReport: getDeepReportMock }));

const { loadReportView } = await import("./report-view");

const REPORT: DeepReport = {
  requestedUrl: "https://b.test/",
  finalUrl: "https://b.test/",
  statusCode: 200,
  fetchedAt: "2026-07-15T00:00:00.000Z",
  overallScore: 77,
  categoryScores: [],
  coreWebVitals: null,
  cwvSource: null,
  psiScores: {
    performance: null,
    seo: null,
    accessibility: null,
    bestPractices: null,
  },
  signals: [],
  pages: [],
  pageSummary: { title: "", metaDescription: "", h1: null, wordCount: 0 },
  crawl: { pagesCrawled: 1 },
  screenshot: null,
};

function row(overrides: Partial<ReportRow> & { id: string }): ReportRow {
  return {
    leadId: "lead-1",
    domain: "b.test",
    url: "https://b.test/",
    locale: "en",
    status: "queued",
    canonicalReportId: null,
    r2Key: null,
    error: null,
    finishedAt: null,
    emailSentAt: null,
    createdAt: "2026-07-15T00:00:00.000Z",
    updatedAt: "2026-07-15T00:00:00.000Z",
    ...overrides,
  };
}

/** Registers rows so findReportById resolves them by id, like D1 would. */
function givenRows(...rows: ReportRow[]) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  findReportByIdMock.mockImplementation(
    async (id: string) => byId.get(id) ?? null,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getDeepReportMock.mockResolvedValue(REPORT);
});

describe("loadReportView", () => {
  it("returns null for an unknown id so the caller can 404", async () => {
    givenRows();
    expect(await loadReportView("nope")).toBeNull();
  });

  it("serves the payload of a report that ran itself", async () => {
    givenRows(row({ id: "r1", status: "done", r2Key: "deep-reports/r1.json" }));

    expect(await loadReportView("r1")).toEqual({
      status: "done",
      report: REPORT,
      deduped: false,
      locale: "en",
    });
    expect(getDeepReportMock).toHaveBeenCalledWith("r1");
  });

  it("renders signals in the requester's language for a vi report", async () => {
    givenRows(
      row({
        id: "r1",
        status: "done",
        locale: "vi",
        r2Key: "deep-reports/r1.json",
      }),
    );
    const englishSignal: DeepSignal = {
      id: "meta-title",
      category: "meta",
      status: "warn",
      label: "Title tag present, 10-60 characters",
      severity: "critical",
      problem: "English problem.",
      fixSteps: ["English step."],
      googleSourceUrl: "https://developers.google.com/x",
      guideQuote: "An English quote from Google.",
      lastReviewedDate: "2026-07-13",
    };
    getDeepReportMock.mockResolvedValue({
      ...REPORT,
      signals: [englishSignal],
    });

    const view = await loadReportView("r1");
    if (view?.status !== "done") throw new Error("expected a done view");
    expect(view.locale).toBe("vi");
    const fix = getFix("meta-title", "vi");
    expect(view.report.signals[0]?.label).toBe(fix?.label);
    expect(view.report.signals[0]?.problem).toBe(fix?.problem);
    // The Google quote is never translated — it stays exactly as stored.
    expect(view.report.signals[0]?.guideQuote).toBe(englishSignal.guideQuote);
  });

  it.each(["confirming", "queued", "running"] as const)(
    "reports %s as pending",
    async (status) => {
      givenRows(row({ id: "r1", status }));
      expect(await loadReportView("r1")).toEqual({
        status: "pending",
        locale: "en",
      });
    },
  );

  it("surfaces the row's own message when the check failed", async () => {
    givenRows(row({ id: "r1", status: "failed", error: "It broke." }));
    expect(await loadReportView("r1")).toEqual({
      status: "failed",
      message: "It broke.",
      locale: "en",
    });
  });

  describe("canonical resolution", () => {
    it("follows a single hop to the report that actually ran", async () => {
      givenRows(
        row({ id: "r2", status: "queued", canonicalReportId: "r1" }),
        row({ id: "r1", status: "done", r2Key: "deep-reports/r1.json" }),
      );

      expect(await loadReportView("r2")).toEqual({
        status: "done",
        report: REPORT,
        deduped: true,
        locale: "en",
      });
      expect(getDeepReportMock).toHaveBeenCalledWith("r1");
    });

    it("follows a 2-hop chain to the terminal root", async () => {
      // Reachable per Slice 2b: R2 attaches to R1; R1's enqueue then fails, so
      // R1 reverts + releases and later loses a re-won reservation to R3.
      // A single-hop reader would stop at R1 and report `pending` forever.
      givenRows(
        row({ id: "r2", status: "queued", canonicalReportId: "r1" }),
        row({ id: "r1", status: "queued", canonicalReportId: "r3" }),
        row({ id: "r3", status: "done", r2Key: "deep-reports/r3.json" }),
      );

      expect(await loadReportView("r2")).toEqual({
        status: "done",
        report: REPORT,
        deduped: true,
        locale: "en",
      });
      expect(getDeepReportMock).toHaveBeenCalledWith("r3");
    });

    it("reports pending while the resolved root is still running", async () => {
      givenRows(
        row({ id: "r2", status: "queued", canonicalReportId: "r1" }),
        row({ id: "r1", status: "running" }),
      );
      expect(await loadReportView("r2")).toEqual({
        status: "pending",
        locale: "en",
      });
    });

    it("fails instead of looping when the chain cycles", async () => {
      givenRows(
        row({ id: "r1", status: "queued", canonicalReportId: "r2" }),
        row({ id: "r2", status: "queued", canonicalReportId: "r1" }),
      );

      await expect(loadReportView("r1")).resolves.toEqual({
        status: "failed",
        message: "The deep check could not be completed.",
        locale: "en",
      });
    });

    it("fails instead of hanging when the chain exceeds the depth cap", async () => {
      givenRows(
        ...Array.from({ length: 8 }, (_, index) =>
          row({
            id: `r${index}`,
            status: "queued",
            canonicalReportId: `r${index + 1}`,
          }),
        ),
      );

      await expect(loadReportView("r0")).resolves.toEqual({
        status: "failed",
        message: "The deep check could not be completed.",
        locale: "en",
      });
    });

    it("fails when the canonical it points at is gone", async () => {
      givenRows(row({ id: "r2", status: "queued", canonicalReportId: "r1" }));

      await expect(loadReportView("r2")).resolves.toEqual({
        status: "failed",
        message: "The deep check could not be completed.",
        locale: "en",
      });
    });
  });

  it("degrades to failed when a done row has no payload in R2", async () => {
    // R2 is written before the D1 `done` commit, so this means the stores
    // drifted — an anonymous reader must not get a 500 out of it.
    givenRows(row({ id: "r1", status: "done", r2Key: "deep-reports/r1.json" }));
    getDeepReportMock.mockResolvedValue(null);

    expect(await loadReportView("r1")).toEqual({
      status: "failed",
      message: "The deep check could not be completed.",
      locale: "en",
    });
  });
});
