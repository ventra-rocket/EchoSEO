/**
 * Pacing accumulator for a crawl: how hard the site pushed back, and the rate
 * the crawl settled at. The rate law itself lives in `crawl-rate.ts`; this only
 * records what that law did, so a finished audit can be asked what it cost
 * without re-deriving it from Workflow step durations (issue #88).
 */

/** Running totals over a crawl. The rate is fed in post-adjustment each batch. */
type CrawlPacing = {
  congestedBatches: number;
  refusedRequests: number;
  lowestRate: number;
  highestRate: number;
};

/** The summary kept once the crawl ends: the run's rate span and refusal cost. */
export type CrawlPacingSummary = {
  settledRate: number;
  lowestRate: number;
  highestRate: number;
  refusedRequests: number;
  congestedBatches: number;
};

export function initialPacing(rate: number): CrawlPacing {
  return {
    congestedBatches: 0,
    refusedRequests: 0,
    lowestRate: rate,
    highestRate: rate,
  };
}

/**
 * Fold one batch into the accumulator. `refusedShare` is the fraction of the
 * batch the site refused (0 for a clean batch); `rate` is the offered rate after
 * this batch's adjustment, so the low/high span tracks what was actually used.
 * Pure — returns a new accumulator.
 */
export function foldBatchPacing(
  pacing: CrawlPacing,
  input: { refusedShare: number; batchSize: number; rate: number },
): CrawlPacing {
  const congested = input.refusedShare > 0;
  return {
    congestedBatches: pacing.congestedBatches + (congested ? 1 : 0),
    refusedRequests:
      pacing.refusedRequests +
      (congested ? Math.round(input.refusedShare * input.batchSize) : 0),
    lowestRate: Math.min(pacing.lowestRate, input.rate),
    highestRate: Math.max(pacing.highestRate, input.rate),
  };
}

/** Seal the accumulator with the rate the crawl ended at. */
export function pacingSummary(
  pacing: CrawlPacing,
  settledRate: number,
): CrawlPacingSummary {
  return {
    settledRate,
    lowestRate: pacing.lowestRate,
    highestRate: pacing.highestRate,
    refusedRequests: pacing.refusedRequests,
    congestedBatches: pacing.congestedBatches,
  };
}

/** The `audits` columns a summary writes, kept beside the shape they mirror. */
export function pacingColumns(summary: CrawlPacingSummary) {
  return {
    crawlSettledRate: summary.settledRate,
    crawlLowestRate: summary.lowestRate,
    crawlHighestRate: summary.highestRate,
    crawlRefusedRequests: summary.refusedRequests,
    crawlCongestedBatches: summary.congestedBatches,
  };
}
