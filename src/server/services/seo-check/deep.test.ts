import { describe, expect, it } from "vitest";
import { makeGoodPage } from "@/server/lib/seo-rules/__tests__/on-page-signals-fixture";
import type { PsiResult } from "@/server/lib/psi/pagespeed";
import type { GeoSignals } from "@/server/lib/seo-rules";
import type { CrawlResult } from "./crawl";
import { buildDeepReport } from "./deep";

// Uses the real Phase 2 rules engine — this proves deep.ts wires PSI + crawl
// through evaluate/score correctly, not just that it calls mocks.

const PRIMARY = "https://site.test/";

function crawlOf(...urls: string[]): CrawlResult {
  return {
    pages: urls.map((url) => ({
      url,
      normalizedUrl: url,
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

  it("keeps crawl-seam fields like redirectedFrom out of the report payload", () => {
    const crawl = crawlOf(PRIMARY, "https://site.test/login");
    for (const page of crawl.pages) {
      page.redirectedFrom = ["https://site.test/dashboard"];
    }
    const report = buildDeepReport({
      requestedUrl: PRIMARY,
      crawl,
      psi: PSI_NO_CWV,
    });
    // Deep reports are stored in R2 and re-validated on every read; redirect
    // sources are crawl-side context and must never reach the stored payload.
    for (const page of report.pages) {
      expect(page).not.toHaveProperty("redirectedFrom");
    }
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
          normalizedUrl: PRIMARY,
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

  // `crawlSite` refuses a non-2xx PRIMARY page but deliberately keeps non-2xx
  // internal ones, because a broken internal URL is a real finding. That
  // carve-out is only safe while such a page stays out of the headline number,
  // so pin it here rather than leaving it to deep.ts's current shape.
  it("keeps a broken internal page out of the headline score", () => {
    const withBrokenInternal: CrawlResult = {
      pages: [
        ...crawlOf(PRIMARY).pages,
        {
          url: "https://site.test/gone",
          normalizedUrl: "https://site.test/gone",
          statusCode: 404,
          page: makeGoodPage({ url: "https://site.test/gone" }),
        },
      ],
    };

    const baseline = buildDeepReport({
      requestedUrl: PRIMARY,
      crawl: crawlOf(PRIMARY),
      psi: PSI_WITH_CWV,
    });
    const withBroken = buildDeepReport({
      requestedUrl: PRIMARY,
      crawl: withBrokenInternal,
      psi: PSI_WITH_CWV,
    });

    expect(withBroken.overallScore).toBe(baseline.overallScore);
    expect(withBroken.categoryScores).toEqual(baseline.categoryScores);
    expect(withBroken.pages).toHaveLength(2);
  });

  it("builds a separate GEO section without touching the on-page score", () => {
    const geo: GeoSignals = {
      botAccess: { googlebot: true, googleExtended: false, gptbot: false },
      schemaTypes: [],
      hasSingleH1: true,
      hasHeadingHierarchy: true,
      robotsMeta: null,
      llmsTxtFound: false,
    };
    const withGeo = buildDeepReport({
      requestedUrl: PRIMARY,
      crawl: crawlOf(PRIMARY),
      psi: PSI_WITH_CWV,
      geo,
    });
    const without = buildDeepReport({
      requestedUrl: PRIMARY,
      crawl: crawlOf(PRIMARY),
      psi: PSI_WITH_CWV,
    });

    expect(without.geo).toBeNull();
    expect(withGeo.geo).not.toBeNull();
    // The GEO score is scored on its own — the on-page number is untouched, and
    // "geo" never appears among the main category scores.
    expect(withGeo.overallScore).toBe(without.overallScore);
    expect(withGeo.categoryScores.some((c) => c.category === "geo")).toBe(
      false,
    );
    // Surfaced facts carry through; llms.txt/bot policy are not scored.
    expect(withGeo.geo?.aiBots).toEqual({
      googleExtended: false,
      gptbot: false,
    });
    expect(withGeo.geo?.llmsTxt).toBe(false);
  });
});
