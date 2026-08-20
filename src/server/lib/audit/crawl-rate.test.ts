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

  it("opens at the rate this target was last measured to serve", () => {
    // The whole point of issue #91: a re-crawl must not spend forty batches
    // rediscovering a limit the last crawl already measured.
    expect(initialCrawlRate(null, 1.75)).toEqual({
      rate: 1.75,
      ceiling: 1.75,
      cap: CRAWL_RATE_MAX,
    });
  });

  it("pins the ceiling to the seed, not just the rate", () => {
    // Seeding the rate alone would leave the ceiling at the cap, and
    // `afterCleanBatch` adds `RATE_INCREASE` per clean batch — so the crawl
    // would climb straight back into the refusal the seed exists to avoid.
    // Going above a known-served rate has to be earned one clean batch a time.
    const seeded = afterCleanBatch(initialCrawlRate(null, 1.75));
    expect(seeded.rate).toBeLessThan(2);
  });

  it("behaves exactly as an unseeded crawl when the target has no history", () => {
    expect(initialCrawlRate(null, null)).toEqual(initialCrawlRate(null));
    expect(initialCrawlRate(4, null)).toEqual(initialCrawlRate(4));
  });

  it("refuses a stored number that is not a usable rate", () => {
    // A null column is the ordinary case, but a zero, a negative, or a NaN that
    // reached the column would otherwise stall the crawl at the floor.
    expect(initialCrawlRate(null, 0)).toEqual(initialCrawlRate(null));
    expect(initialCrawlRate(null, -2)).toEqual(initialCrawlRate(null));
    expect(initialCrawlRate(null, Number.NaN)).toEqual(initialCrawlRate(null));
  });

  it("never opens faster than an unseeded crawl would", () => {
    // One anomalous stored number must not grant a crawl more than the default
    // start, which is the only rate with measurement behind it.
    expect(initialCrawlRate(null, 99).rate).toBe(CRAWL_RATE_START);
  });

  it("keeps a published Crawl-delay above the seed", () => {
    // The site owner naming its limit beats our own measurement of it.
    expect(initialCrawlRate(4, 2.5)).toEqual({
      rate: 0.25,
      ceiling: 0.25,
      cap: 0.25,
    });
  });

  it("holds a seed below the backoff floor at the floor", () => {
    expect(initialCrawlRate(null, 0.01).rate).toBe(CRAWL_RATE_MIN);
  });
});

describe("afterCongestedBatch", () => {
  it("charges one 429 in twenty-five as four percent, not a halving", () => {
    // The defect this fixes: the first version halved-ish on any refusal and
    // crept back by a flat step, so a site that returns the odd 429 at any rate
    // ratcheted the crawl to its floor. `kello.ventrarocket.vn` does exactly
    // that — about one 429 per 139 pages — and the crawl settled at 1.20 req/s,
    // below the 1.88 it was meant to beat.
    const backed = afterCongestedBatch(initialCrawlRate(null), 0.04);

    expect(backed.rate).toBeCloseTo(2.88);
    expect(backed.ceiling).toBeCloseTo(2.88);
  });

  it("reads the refused share as the rate the site did serve", () => {
    // Offered 3, refused a fifth: it served 2.4. A measurement, not a guess.
    expect(afterCongestedBatch(initialCrawlRate(null), 0.2).rate).toBeCloseTo(
      2.4,
    );
  });

  it("never assumes one refused batch means the site serves nothing", () => {
    // A batch refused wholesale is still only one batch. Repeated refusals
    // compound, which is how a genuinely slow site gets found.
    expect(afterCongestedBatch(initialCrawlRate(null), 1).rate).toBeCloseTo(
      2.25,
    );
  });

  it("holds the new rate as the ceiling, so the climb starts from evidence", () => {
    const backed = afterCongestedBatch(initialCrawlRate(null), 0.2);

    expect(afterCleanBatch(backed).rate).toBeCloseTo(2.448);
  });

  it("never drops below the floor however often the site refuses", () => {
    let state = initialCrawlRate(null);
    for (let i = 0; i < 40; i += 1) state = afterCongestedBatch(state, 1);

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

  it("climbs out of the floor inside one crawl, not one thousand batches", () => {
    // Recovery has to be symmetric with the decrease, or a transient storm costs
    // the rest of the crawl: the additive version needed 560 clean batches —
    // 14,000 pages — to get back from the floor, which no crawl ever reaches.
    let state = {
      ...initialCrawlRate(null),
      rate: CRAWL_RATE_MIN,
      ceiling: CRAWL_RATE_MIN,
    };
    let batches = 0;
    while (state.rate < 3 && batches < 500) {
      state = afterCleanBatch(state);
      batches += 1;
    }

    expect(batches).toBeLessThan(100);
  });

  it("keeps a real limit down, because trips keep re-lowering it", () => {
    // A site that refuses above 3.5 req/s: the sawtooth has to stay near it
    // rather than relax its way back to the default ceiling.
    let state = initialCrawlRate(null);
    const rates: number[] = [];
    for (let i = 0; i < 80; i += 1) {
      state =
        state.rate > 3.5
          ? afterCongestedBatch(state, (state.rate - 3.5) / state.rate)
          : afterCleanBatch(state);
      rates.push(state.rate);
    }

    const settled = rates.slice(-40);
    const average = settled.reduce((a, b) => a + b, 0) / settled.length;
    // Within 20% of the site's real limit, which is the acceptance bar.
    expect(average).toBeGreaterThan(3.5 * 0.8);
    expect(Math.max(...settled)).toBeLessThanOrEqual(3.9);
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
