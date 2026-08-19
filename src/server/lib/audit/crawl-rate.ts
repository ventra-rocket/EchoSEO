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
 * Multiplicative decrease. 0.75 rather than the usual halving: the limit this
 * backs off from recovers in about five seconds, so a single trip should not
 * undo a long climb. A halving plus the old exponential sleep paid a minute of
 * hibernation for a five-second problem and landed far below the sustainable
 * rate.
 */
const RATE_DECREASE = 0.75;

/**
 * A refused batch is evidence about *where the limit is*, not just a reason to
 * slow down once. The rate that tripped it becomes a ceiling the climb holds
 * under, so the sawtooth settles just below the site's real limit instead of
 * rediscovering it every few batches.
 */
const CEILING_AFTER_TRIP = 0.9;

/**
 * ...but a ceiling learned from one trip must not pin a whole crawl: an upstream
 * hiccup that refuses one batch would otherwise hold every later batch under a
 * limit that was never real. Each clean batch lifts it slightly — +0.5 req/s per
 * 100 batches — so a real limit still holds, because trips keep re-lowering it
 * faster than this raises it.
 *
 * Simulated against a 3.5 req/s sliding-window limiter at 1.2 s latency over
 * 5,000 pages: 0 relax gives 25.1 min but leaves a false trip pinned for the
 * whole crawl (29.5 min); 0.05 recovers from a false trip but re-trips the real
 * limit six times. 0.005 costs 0.3 min against a real limit and recovers a false
 * one in a few hundred pages.
 */
const CEILING_RELAX = 0.005;

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
 */
export function initialCrawlRate(
  crawlDelaySeconds: number | null,
): CrawlRateState {
  const cap =
    crawlDelaySeconds != null && crawlDelaySeconds > 0
      ? Math.max(
          CRAWL_DELAY_RATE_MIN,
          Math.min(CRAWL_RATE_MAX, 1 / crawlDelaySeconds),
        )
      : CRAWL_RATE_MAX;
  return { rate: Math.min(CRAWL_RATE_START, cap), ceiling: cap, cap };
}

export function afterCleanBatch(state: CrawlRateState): CrawlRateState {
  const ceiling = Math.min(state.cap, state.ceiling + CEILING_RELAX);
  return {
    ...state,
    ceiling,
    rate: Math.min(ceiling, state.rate + RATE_INCREASE),
  };
}

export function afterCongestedBatch(state: CrawlRateState): CrawlRateState {
  // A `Crawl-delay` slower than the backoff floor is still the rate to honour,
  // so the floor is whichever of the two is lower.
  const floor = Math.min(CRAWL_RATE_MIN, state.cap);
  return {
    ...state,
    ceiling: Math.max(floor, state.rate * CEILING_AFTER_TRIP),
    rate: Math.max(floor, state.rate * RATE_DECREASE),
  };
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
