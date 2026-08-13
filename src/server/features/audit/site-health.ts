/**
 * The card's headline number.
 *
 * The professional audit has never had a score: `overallScore` belongs to the
 * free checker, where it grades one page against the 21 rules. A crawl has issue
 * occurrences instead. So this defines one, and defines it as something a reader
 * can check rather than an index they have to trust:
 *
 *     score = share of crawled pages carrying no critical and no high issue
 *
 * The card prints the fraction next to it for exactly that reason. An unexplained
 * composite would undo the work Phase 01 just did on labelling every number with
 * its source — and it would not survive the first time someone compared it with
 * Ahrefs and asked what it means.
 *
 * `low` severity is excluded from the score on purpose: a site whose every page
 * carries one cosmetic warning is not a broken site, and a score that says so
 * would be ignored within a week.
 */

export type SeverityPageCounts = {
  /** Distinct crawled pages carrying at least one issue of that severity. */
  critical: number;
  high: number;
  low: number;
};

export type SiteHealth = {
  /** 0–100, rounded. */
  score: number;
  pagesCrawled: number;
  /** Pages with neither a critical nor a high issue — the score's numerator. */
  pagesClean: number;
  severity: SeverityPageCounts;
};

/**
 * Null when there is nothing to score: no crawl has completed, so the card must
 * show an empty state with an action rather than a zero that reads as "this site
 * is broken".
 */
export function computeSiteHealth(input: {
  pagesCrawled: number;
  /** Distinct pages carrying at least one critical OR high issue. */
  pagesWithCriticalOrHigh: number;
  severity: SeverityPageCounts;
}): SiteHealth | null {
  if (input.pagesCrawled <= 0) return null;

  // Clamped, not trusted: a site-level issue carries a `url` but no `page_id`
  // (`audit.schema.ts:250-253`), so its URL need not be among the crawled pages
  // and the affected count can exceed them. Without the clamp that would render
  // a negative numerator.
  const affected = Math.min(
    Math.max(input.pagesWithCriticalOrHigh, 0),
    input.pagesCrawled,
  );
  const pagesClean = input.pagesCrawled - affected;

  return {
    score: Math.round((pagesClean / input.pagesCrawled) * 100),
    pagesCrawled: input.pagesCrawled,
    pagesClean,
    severity: input.severity,
  };
}
