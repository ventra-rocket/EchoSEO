import { describe, expect, it } from "vitest";
import { deepReportSchema } from "./deep-types";

/**
 * Stored-payload compatibility contract for `deepReportSchema`.
 *
 * Deep reports live in R2 for their full retention window and are re-validated
 * on every `/r/{id}` read (`getDeepReport`), so a payload written before a
 * field existed must keep parsing long after the schema grew. These fixtures
 * are frozen JSON exactly as R2 stores it — never "fix" them to match the
 * current writer; that would defeat their purpose.
 */

/** One realistic persisted signal — legacy payloads carry these unchanged. */
const STORED_SIGNAL = {
  id: "meta-title",
  category: "meta",
  status: "warn",
  label: "Title tag present, 10-60 characters",
  severity: "critical",
  problem: "The title is short.",
  fixSteps: ["Write a longer title."],
  googleSourceUrl: "https://developers.google.com/search",
  guideQuote: "A verbatim English quote from Google.",
  lastReviewedDate: "2026-07-13",
  measurement: { kind: "chars", value: 8 },
};

/**
 * Byte-shape of a report written before the desktop strategy existed: full lab
 * data at the top level (mobile), and no `desktop` key anywhere.
 */
const LEGACY_REPORT = {
  requestedUrl: "https://legacy.test/",
  finalUrl: "https://legacy.test/",
  statusCode: 200,
  fetchedAt: "2026-07-15T00:00:00.000Z",
  overallScore: 77,
  categoryScores: [{ category: "meta", score: 80 }],
  coreWebVitals: { lcpMs: 961, inpMs: 81, cls: 0, ttfbMs: 653 },
  cwvSource: "field",
  psiScores: { performance: 100, seo: 80, accessibility: 96, bestPractices: 96 },
  signals: [STORED_SIGNAL],
  pages: [
    {
      url: "https://legacy.test/",
      statusCode: 200,
      overallScore: 80,
      signals: [STORED_SIGNAL],
    },
  ],
  pageSummary: { title: "Legacy", metaDescription: "", h1: null, wordCount: 120 },
  crawl: { pagesCrawled: 1 },
  geo: null,
};

describe("deepReportSchema stored-payload compatibility", () => {
  it("keeps validating a report stored before the desktop field existed", () => {
    const parsed = deepReportSchema.parse(LEGACY_REPORT);

    expect(parsed.desktop).toBeUndefined();
    // The top-level lab fields ARE the mobile data — no rename, no migration.
    expect(parsed.coreWebVitals).toEqual(LEGACY_REPORT.coreWebVitals);
    expect(parsed.cwvSource).toBe("field");
    expect(parsed.psiScores).toEqual(LEGACY_REPORT.psiScores);
  });

  it("keeps validating the oldest stored shape (pre-GEO, pre-normalizedUrl)", () => {
    const { geo: _geo, ...withoutGeo } = LEGACY_REPORT;
    const parsed = deepReportSchema.parse(withoutGeo);

    expect(parsed.geo).toBeNull();
    expect(parsed.desktop).toBeUndefined();
    expect(parsed.pages[0]?.normalizedUrl).toBeUndefined();
  });

  it("round-trips a report that carries the desktop section", () => {
    const withDesktop = {
      ...LEGACY_REPORT,
      desktop: {
        coreWebVitals: { lcpMs: 1200, inpMs: 60, cls: 0.01, ttfbMs: 300 },
        cwvSource: "lab",
        psiScores: {
          performance: 99,
          seo: 80,
          accessibility: 96,
          bestPractices: 92,
        },
      },
    };

    const parsed = deepReportSchema.parse(withDesktop);
    expect(parsed.desktop).toEqual(withDesktop.desktop);
  });

  it("accepts a desktop section whose PSI carried no usable data", () => {
    const withEmptyDesktop = {
      ...LEGACY_REPORT,
      desktop: {
        coreWebVitals: null,
        cwvSource: null,
        psiScores: {
          performance: null,
          seo: null,
          accessibility: null,
          bestPractices: null,
        },
      },
    };

    const parsed = deepReportSchema.parse(withEmptyDesktop);
    expect(parsed.desktop).toEqual(withEmptyDesktop.desktop);
  });
});
