import { describe, expect, it } from "vitest";
import type { DeepReport } from "@/server/services/seo-check/deep-types";
import { desktopLab, hasLabData, mobileLab } from "./strategy-lab";

const NO_SCORES: DeepReport["psiScores"] = {
  performance: null,
  seo: null,
  accessibility: null,
  bestPractices: null,
};

function report(overrides: Partial<DeepReport> = {}): DeepReport {
  return {
    requestedUrl: "https://b.test/",
    finalUrl: "https://b.test/",
    statusCode: 200,
    fetchedAt: "2026-08-03T00:00:00.000Z",
    overallScore: 77,
    categoryScores: [],
    coreWebVitals: { lcpMs: 961, inpMs: 81, cls: 0, ttfbMs: 653 },
    cwvSource: "field",
    psiScores: {
      performance: 100,
      seo: 80,
      accessibility: 96,
      bestPractices: 96,
    },
    signals: [],
    pages: [],
    pageSummary: { title: "", metaDescription: "", h1: null, wordCount: 0 },
    crawl: { pagesCrawled: 1 },
    geo: null,
    ...overrides,
  };
}

describe("mobileLab", () => {
  it("is the report's own top-level lab fields — the scored strategy", () => {
    const r = report();
    expect(mobileLab(r)).toEqual({
      coreWebVitals: r.coreWebVitals,
      cwvSource: "field",
      psiScores: r.psiScores,
    });
  });
});

describe("desktopLab", () => {
  it("is null for reports stored before desktop capture existed", () => {
    // This is what suppresses the tab bar on legacy reports.
    expect(desktopLab(report())).toBeNull();
  });

  it("returns the stored desktop section when the report carries one", () => {
    const desktop = {
      coreWebVitals: { lcpMs: 1200, inpMs: 60, cls: 0.01, ttfbMs: 300 },
      cwvSource: "lab" as const,
      psiScores: {
        performance: 99,
        seo: 80,
        accessibility: 96,
        bestPractices: 92,
      },
    };
    expect(desktopLab(report({ desktop }))).toEqual(desktop);
  });
});

describe("hasLabData", () => {
  it("is false only when there is neither CWV nor a single Lighthouse score", () => {
    const empty = {
      coreWebVitals: null,
      cwvSource: null,
      psiScores: NO_SCORES,
    };
    expect(hasLabData(empty)).toBe(false);

    expect(
      hasLabData({
        ...empty,
        coreWebVitals: { lcpMs: 1, inpMs: 1, cls: 0, ttfbMs: 1 },
      }),
    ).toBe(true);
    // A single Lighthouse score is enough — PSI can withhold the others.
    expect(hasLabData({ ...empty, psiScores: { ...NO_SCORES, seo: 80 } })).toBe(
      true,
    );
  });
});
