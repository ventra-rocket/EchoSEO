import { describe, expect, it } from "vitest";
import {
  CRAWL_DELAY_RATE_MIN,
  CRAWL_RATE_MAX,
  CRAWL_RATE_MIN,
  CRAWL_RATE_START,
  afterCleanBatch,
  afterCongestedBatch,
  dispatchIntervalMs,
  initialCrawlRate,
} from "./crawl-rate";

describe("initialCrawlRate", () => {
  it("starts just under the rate a Cloudflare-fronted site was measured to give", () => {
    // 3-4 req/s per IP measured; starting there rather than at a floor is the
    // point of controlling rate at all.
    expect(initialCrawlRate(null)).toEqual({
      rate: CRAWL_RATE_START,
      ceiling: CRAWL_RATE_MAX,
      cap: CRAWL_RATE_MAX,
    });
  });

  it("obeys a Crawl-delay the site published", () => {
    // The site owner naming their own limit has to beat our discovery of it —
    // including below the rate the crawl would otherwise refuse to go.
    expect(initialCrawlRate(4)).toEqual({
      rate: 0.25,
      ceiling: 0.25,
      cap: 0.25,
    });
  });

  it("never lets a Crawl-delay raise the crawl above its own ceiling", () => {
    expect(initialCrawlRate(0.01).rate).toBe(CRAWL_RATE_START);
    expect(initialCrawlRate(0.01).cap).toBe(CRAWL_RATE_MAX);
  });

  it("ignores a zero or negative Crawl-delay rather than dividing by it", () => {
    expect(initialCrawlRate(0)).toEqual(initialCrawlRate(null));
    expect(initialCrawlRate(-5)).toEqual(initialCrawlRate(null));
  });

  it("floors an absurd Crawl-delay instead of never finishing", () => {
    // `Crawl-delay: 86400` would be a day per page. Honour the intent as far as
    // a bounded crawl can and let the audit finish.
    expect(initialCrawlRate(86_400).rate).toBe(CRAWL_DELAY_RATE_MIN);
  });
});

describe("afterCongestedBatch", () => {
  it("gives up a quarter of the rate, not half of it", () => {
    // The old halving plus an escalating sleep paid a minute of hibernation for
    // a limit that recovers in five seconds, and landed far below sustainable.
    const backed = afterCongestedBatch(initialCrawlRate(null));

    expect(backed.rate).toBeCloseTo(2.25);
  });

  it("remembers the rate that tripped as a ceiling to climb under", () => {
    const backed = afterCongestedBatch(initialCrawlRate(null));

    expect(backed.ceiling).toBeCloseTo(2.7);
    // The climb cannot walk straight back into the refusal it just took.
    expect(afterCleanBatch(backed).rate).toBeCloseTo(2.5);
  });

  it("never drops below the floor however often the site refuses", () => {
    let state = initialCrawlRate(null);
    for (let i = 0; i < 40; i += 1) state = afterCongestedBatch(state);

    expect(state.rate).toBe(CRAWL_RATE_MIN);
  });
});

describe("afterCleanBatch", () => {
  it("climbs one step at a time toward the ceiling", () => {
    const first = afterCleanBatch(initialCrawlRate(null));

    expect(first.rate).toBeCloseTo(3.25);
    expect(afterCleanBatch(first).rate).toBeCloseTo(3.5);
  });

  it("settles at the ceiling instead of overshooting it", () => {
    let state = initialCrawlRate(null);
    for (let i = 0; i < 100; i += 1) state = afterCleanBatch(state);

    expect(state.rate).toBe(CRAWL_RATE_MAX);
  });

  it("holds a Crawl-delay however long the crawl behaves", () => {
    let state = initialCrawlRate(4);
    for (let i = 0; i < 100; i += 1) state = afterCleanBatch(state);

    expect(state.rate).toBeCloseTo(0.25);
  });

  it("lifts a ceiling learned from a single early trip", () => {
    // A one-off refusal must not hold a 5,000-page crawl under 90% of whatever
    // rate happened to be in flight when it arrived.
    const tripped = afterCongestedBatch(initialCrawlRate(null));
    let state = tripped;
    for (let i = 0; i < 200; i += 1) state = afterCleanBatch(state);

    expect(state.rate).toBeGreaterThan(tripped.ceiling);
    expect(state.rate).toBeCloseTo(3.7);
  });

  it("keeps a real limit down, because trips keep re-lowering it", () => {
    // A site that refuses at 3.5 req/s: the sawtooth has to stay near it rather
    // than relax its way back to the default ceiling.
    let state = initialCrawlRate(null);
    const rates: number[] = [];
    for (let i = 0; i < 60; i += 1) {
      state =
        state.rate > 3.5 ? afterCongestedBatch(state) : afterCleanBatch(state);
      rates.push(state.rate);
    }

    const settled = rates.slice(-30);
    const average = settled.reduce((a, b) => a + b, 0) / settled.length;
    // Within 20% of the site's real limit, which is the acceptance bar.
    expect(average).toBeGreaterThan(3.5 * 0.8);
    expect(Math.max(...settled)).toBeLessThanOrEqual(3.75);
  });
});

describe("dispatchIntervalMs", () => {
  it("spaces requests so the offered rate is the controlled one", () => {
    expect(dispatchIntervalMs(4)).toBe(250);
    expect(dispatchIntervalMs(0.5)).toBe(2_000);
  });

  it("clamps at the slowest honourable rate rather than dividing by zero", () => {
    expect(dispatchIntervalMs(0)).toBe(10_000);
    expect(dispatchIntervalMs(-1)).toBe(10_000);
  });
});
