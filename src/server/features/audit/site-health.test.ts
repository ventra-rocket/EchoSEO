import { describe, expect, it } from "vitest";
import { computeSiteHealth } from "./site-health";

const NO_ISSUES = { critical: 0, high: 0, low: 0 };

describe("computeSiteHealth", () => {
  it("scores the share of pages with no critical or high issue", () => {
    const health = computeSiteHealth({
      pagesCrawled: 656,
      pagesWithCriticalOrHigh: 52,
      severity: { critical: 12, high: 40, low: 300 },
    });

    expect(health).toEqual({
      score: 92,
      pagesCrawled: 656,
      pagesClean: 604,
      severity: { critical: 12, high: 40, low: 300 },
    });
  });

  it("ignores low-severity issues", () => {
    // A site whose every page carries one cosmetic warning is not a broken site.
    // A score that said otherwise would be ignored within a week.
    const health = computeSiteHealth({
      pagesCrawled: 100,
      pagesWithCriticalOrHigh: 0,
      severity: { critical: 0, high: 0, low: 100 },
    });

    expect(health?.score).toBe(100);
    expect(health?.pagesClean).toBe(100);
  });

  it("returns null when no crawl has completed", () => {
    // The card must offer "run the first audit", not a zero that reads as
    // "this site is broken".
    expect(
      computeSiteHealth({
        pagesCrawled: 0,
        pagesWithCriticalOrHigh: 0,
        severity: NO_ISSUES,
      }),
    ).toBeNull();
  });

  it("scores zero when every page has a critical or high issue", () => {
    const health = computeSiteHealth({
      pagesCrawled: 10,
      pagesWithCriticalOrHigh: 10,
      severity: { critical: 10, high: 3, low: 0 },
    });

    expect(health?.score).toBe(0);
    expect(health?.pagesClean).toBe(0);
  });

  it("clamps an affected count larger than the crawl", () => {
    // Site-level issues carry a url but no page_id, so their URL need not be one
    // of the crawled pages. Unclamped this would render a negative numerator.
    const health = computeSiteHealth({
      pagesCrawled: 5,
      pagesWithCriticalOrHigh: 9,
      severity: { critical: 9, high: 0, low: 0 },
    });

    expect(health?.pagesClean).toBe(0);
    expect(health?.score).toBe(0);
  });

  it("keeps the fraction the card prints, not just the percentage", () => {
    // The card shows "88 — 88% of pages (44/50)". Rounding alone would leave the
    // reader unable to check the number, which is the whole point of showing it.
    const health = computeSiteHealth({
      pagesCrawled: 50,
      pagesWithCriticalOrHigh: 6,
      severity: { critical: 1, high: 5, low: 2 },
    });

    expect(health).toMatchObject({
      score: 88,
      pagesClean: 44,
      pagesCrawled: 50,
    });
  });
});
