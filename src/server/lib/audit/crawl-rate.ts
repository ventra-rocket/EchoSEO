/**
 * The crawl's control law, in the units the site actually meters.
 *
 * A site's rate limit is requests per second per IP. The crawler used to control
 * concurrency instead and hope it landed on a rate, which is a units mismatch:
 * at the 2.6 s average latency measured on `kello.ventrarocket.vn`, a
 * concurrency of 3 offers 1.2 req/s and a concurrency of 25 offers 9.8 req/s
 * against a site that sustains 3-4. Every climb toward the ceiling tripped the
 * limit by construction, and the settled point we wanted was one the policy only
 * passed through on its way past it. A 5,000-page crawl averaged 1.78 req/s —
 * half the site's tolerance — while still collecting 429s in bursts.
 *
 * So this module owns one number: the offered rate. Concurrency becomes whatever
 * that rate times the site's latency implies, which is the right way round.
 */

/**
 * Where a crawl starts, in req/s. Just under the 3-4 req/s measured on a
 * Cloudflare-fronted site, so the first batch is unlikely to trip anything and
 * the climb starts from a useful place rather than from a floor.
 */
export const CRAWL_RATE_START = 3;

/**
 * The slowest rate the crawl will back itself down to. Below this a 5,000-page
 * audit cannot finish inside any reasonable wall time, so a site that refuses
 * even this is one we report against rather than keep backing off from.
 */
export const CRAWL_RATE_MIN = 0.5;

/**
 * A published `Crawl-delay` is honoured below that floor, because it is a
 * request rather than something discovered: `Crawl-delay: 4` means one request
 * every four seconds and we should not decide otherwise. It still needs a bound —
 * `Crawl-delay: 86400` is a day per page, and a directive we cannot honour at
 * all is better honoured as far as a bounded crawl can.
 */
export const CRAWL_DELAY_RATE_MIN = 0.1;

/**
 * The fastest a crawl goes, absent a `Crawl-delay`. Nothing measured needs more,
 * and a limit here bounds how far the additive climb can overshoot a site that
 * never refuses.
 */
export const CRAWL_RATE_MAX = 8;

/** Additive increase, per clean batch. */
const RATE_INCREASE = 0.25;

/**
 * The most a single refused batch may cost. A batch refused wholesale is not
 * proof the site serves nothing, so the estimate below never reads worse than
 * "three quarters of what we offered" from one batch's evidence — repeated
 * refusals compound, which is how a genuinely slow site is found.
 */
const MIN_SERVED_SHARE = 0.75;

/**
 * How fast the learned ceiling forgets, per clean batch. Multiplicative, so
 * recovery is symmetric with the decrease: from the floor back to 3 req/s takes
 * about 90 batches rather than the 560 an additive step needed.
 *
 * This matters more than it looks. The first version of this law lowered the
 * ceiling on *any* refusal and lifted it by a flat 0.005, which is a one-way
 * ratchet on any site that refuses occasionally for reasons of its own:
 * `kello.ventrarocket.vn` returns about one 429 per 139 pages while serving half
 * its own tolerance, and the deployed law was measured settling at 1.20 req/s on
 * it — worse than the 1.88 it replaced. Simulated over 5,000 pages: 119.7 min at
 * 0.70 req/s, against 21.9 min at 3.81 req/s for the law here.
 */
const CEILING_RELAX = 1.02;

type CrawlRateState = {
  /** Offered requests per second. */
  rate: number;
  /** The highest rate the climb may reach right now. */
  ceiling: number;
  /** The highest rate this crawl may ever reach — `Crawl-delay`, or the default. */
  cap: number;
};

/**
 * `Crawl-delay: n` is the site owner telling us its own limit instead of making
 * us find it by tripping over it, so it caps the crawl outright: one request
 * every n seconds and no climbing past it.
 *
 * `seedRate` is what this target was last *measured* to serve (see #88). With
 * one, the crawl opens there instead of at `CRAWL_RATE_START` and stops
 * rediscovering a limit it already found — which is why it is politeness
 * positive: the refusals that discovery costs are the ones it avoids.
 *
 * A seed sets the `ceiling` too, not just the rate. Seeding the rate alone
 * would leave the ceiling at `cap`, and `afterCleanBatch` adds
 * `RATE_INCREASE` per clean batch, so the crawl would climb straight back
 * through the refusal it was seeded to avoid within a handful of batches.
 * Pinning the ceiling keeps the law intact: going above a rate the site is
 * known to serve still has to be earned at `CEILING_RELAX` per clean batch.
 *
 * The seed is clamped to `CRAWL_RATE_START` on the way up, so one anomalous
 * stored number cannot open a crawl faster than an unseeded one would. A
 * `Crawl-delay` still wins outright through `cap`.
 */
export function initialCrawlRate(
  crawlDelaySeconds: number | null,
  seedRate: number | null = null,
): CrawlRateState {
  const cap =
    crawlDelaySeconds != null && crawlDelaySeconds > 0
      ? Math.max(
          CRAWL_DELAY_RATE_MIN,
          Math.min(CRAWL_RATE_MAX, 1 / crawlDelaySeconds),
        )
      : CRAWL_RATE_MAX;
  if (seedRate == null || !Number.isFinite(seedRate) || seedRate <= 0) {
    return { rate: Math.min(CRAWL_RATE_START, cap), ceiling: cap, cap };
  }
  const seed = Math.min(
    CRAWL_RATE_START,
    Math.max(CRAWL_RATE_MIN, seedRate),
    cap,
  );
  return { rate: seed, ceiling: seed, cap };
}

export function afterCleanBatch(state: CrawlRateState): CrawlRateState {
  const ceiling = Math.min(state.cap, state.ceiling * CEILING_RELAX);
  return {
    ...state,
    ceiling,
    rate: Math.min(ceiling, state.rate + RATE_INCREASE),
  };
}

/**
 * What the site just told us it will serve.
 *
 * `refusedShare` is the fraction of the batch it turned away, so
 * `rate × (1 - refusedShare)` is the rate it *did* serve at — a measurement
 * rather than a guessed backoff factor. That becomes both the new rate and the
 * ceiling the climb holds under, which is why one 429 in twenty-five costs 4% and
 * a wholesale refusal costs a quarter.
 */
export function afterCongestedBatch(
  state: CrawlRateState,
  refusedShare: number,
): CrawlRateState {
  // A `Crawl-delay` slower than the backoff floor is still the rate to honour,
  // so the floor is whichever of the two is lower.
  const floor = Math.min(CRAWL_RATE_MIN, state.cap);
  const served = Math.max(MIN_SERVED_SHARE, 1 - refusedShare);
  const next = Math.max(floor, state.rate * served);
  return { ...state, ceiling: next, rate: next };
}

/**
 * The gap between two request dispatches. Spacing the requests inside a batch is
 * what makes the offered rate real: firing a whole batch at once offers an
 * unbounded instantaneous rate no matter what number this module settles on, and
 * that burst is what a per-second limiter sees.
 */
export function dispatchIntervalMs(rate: number): number {
  return Math.round(1_000 / Math.max(CRAWL_DELAY_RATE_MIN, rate));
}
