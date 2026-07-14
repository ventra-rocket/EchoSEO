import { describe, expect, it } from "vitest";
import { makeGoodPage } from "@/server/lib/seo-rules/__tests__/on-page-signals-fixture";
import type { PsiResult } from "@/server/lib/psi/pagespeed";
import type { CrawlResult } from "./crawl";
import { buildDeepReport } from "./deep";

// Uses the real Phase 2 rules engine — this proves deep.ts wires PSI + crawl
// through evaluate/score correctly, not just that it calls mocks.

const PRIMARY = "https://site.test/";

function crawlOf(...urls: string[]): CrawlResult {
  return {
    pages: urls.map((url) => ({
      url,
      statusCode: 200,
      page: makeGoodPage({ url }),
    })),
  };
}

const GOOD_SCORES = {
  performance: 90,
  seo: 100,
  accessibility: 80,
  bestPractices: 95,
};

const PSI_WITH_CWV: PsiResult = {
  coreWebVitals: { lcpMs: 2000, inpMs: 100, cls: 0.05, ttfbMs: 500 },
  cwvSource: "field",
  scores: GOOD_SCORES,
};

const PSI_NO_CWV: PsiResult = {
  coreWebVitals: null,
  cwvSource: null,
  scores: GOOD_SCORES,
};

describe("buildDeepReport", () => {
  it("adds Core Web Vitals to the primary page when PSI has CWV data", () => {
    const report = buildDeepReport({
      requestedUrl: PRIMARY,
      crawl: crawlOf(PRIMARY),
      psi: PSI_WITH_CWV,
    });

    const categories = report.categoryScores.map((c) => c.category);
    expect(categories).toContain("core-web-vitals");
    expect(report.coreWebVitals).toEqual(PSI_WITH_CWV.coreWebVitals);
    expect(report.cwvSource).toBe("field");
    expect(report.psiScores).toEqual(GOOD_SCORES);
    // A good page + good CWV should score well and carry a CWV signal.
    expect(report.overallScore).toBeGreaterThan(80);
    expect(report.signals.some((s) => s.category === "core-web-vitals")).toBe(
      true,
    );
  });

  it("omits Core Web Vitals when PSI has none", () => {
    const report = buildDeepReport({
      requestedUrl: PRIMARY,
      crawl: crawlOf(PRIMARY),
      psi: PSI_NO_CWV,
    });

    const categories = report.categoryScores.map((c) => c.category);
    expect(categories).not.toContain("core-web-vitals");
    expect(report.coreWebVitals).toBeNull();
    expect(report.signals.some((s) => s.category === "core-web-vitals")).toBe(
      false,
    );
  });

  it("reflects a failing on-page check in the primary score", () => {
    const brokenCrawl: CrawlResult = {
      pages: [
        {
          url: PRIMARY,
          statusCode: 200,
          page: makeGoodPage({ url: PRIMARY, title: "" }),
        },
      ],
    };
    const good = buildDeepReport({
      requestedUrl: PRIMARY,
      crawl: crawlOf(PRIMARY),
      psi: PSI_NO_CWV,
    });
    const broken = buildDeepReport({
      requestedUrl: PRIMARY,
      crawl: brokenCrawl,
      psi: PSI_NO_CWV,
    });
    expect(broken.overallScore).toBeLessThan(good.overallScore);
  });

  it("emits one page entry per crawled page and reports the crawl count", () => {
    const report = buildDeepReport({
      requestedUrl: PRIMARY,
      crawl: crawlOf(PRIMARY, "https://site.test/a", "https://site.test/b"),
      psi: PSI_WITH_CWV,
    });

    expect(report.pages).toHaveLength(3);
    expect(report.crawl.pagesCrawled).toBe(3);
    expect(report.finalUrl).toBe(PRIMARY);
    expect(report.pageSummary.title).toBe(makeGoodPage().title);
  });
});
