import { describe, expect, it } from "vitest";
import { decideRateLimit } from "./rate-limit";

const LIMIT = 3;
const WINDOW_MS = 1_000;

describe("decideRateLimit", () => {
  it("allows the first request in an empty window", () => {
    const { decision, nextState } = decideRateLimit(null, 0, LIMIT, WINDOW_MS);

    expect(decision).toEqual({ allowed: true, remaining: 2, resetAt: 1_000 });
    expect(nextState).toEqual({ count: 1, windowStart: 0 });
  });

  it("allows requests up to the limit within the same window", () => {
    let state = null;
    let decision;
    for (let i = 0; i < LIMIT; i++) {
      ({ decision, nextState: state } = decideRateLimit(
        state,
        100,
        LIMIT,
        WINDOW_MS,
      ));
      expect(decision.allowed).toBe(true);
    }
    expect(decision).toEqual({ allowed: true, remaining: 0, resetAt: 1_100 });
  });

  it("blocks a request that exceeds the limit within the window", () => {
    const atLimit = { count: LIMIT, windowStart: 0 };

    const { decision } = decideRateLimit(atLimit, 500, LIMIT, WINDOW_MS);

    expect(decision.allowed).toBe(false);
    expect(decision.remaining).toBe(0);
  });

  it("resets the counter once the window has expired", () => {
    const expired = { count: LIMIT, windowStart: 0 };

    const { decision, nextState } = decideRateLimit(
      expired,
      WINDOW_MS + 1,
      LIMIT,
      WINDOW_MS,
    );

    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(LIMIT - 1);
    expect(nextState).toEqual({ count: 1, windowStart: WINDOW_MS + 1 });
  });

  it("treats a window boundary exactly at windowMs as expired", () => {
    const state = { count: LIMIT, windowStart: 0 };

    const { decision } = decideRateLimit(state, WINDOW_MS, LIMIT, WINDOW_MS);

    expect(decision.allowed).toBe(true);
  });
});
