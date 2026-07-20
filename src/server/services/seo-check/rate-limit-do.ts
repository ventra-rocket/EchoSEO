/**
 * Per-IP rate limiter for the anonymous Lite check.
 *
 * KV is eventually-consistent and under-counts during a concurrent burst, so
 * this uses a Durable Object (one instance per IP via `idFromName(ip)`) for
 * an accurate counter. See rate-limit.ts for the unit-tested decision logic.
 */
import { DurableObject } from "cloudflare:workers";
import {
  decideRateLimit,
  type RateLimitDecision,
  type RateLimitState,
} from "./rate-limit";

const STORAGE_KEY = "rate-limit-state";

/** One instance per IP. Storage self-clears via alarm once the window closes. */
export class IpRateLimiterDO extends DurableObject {
  async checkAndIncrement(
    limit: number,
    windowMs: number,
  ): Promise<RateLimitDecision> {
    // Invariant this counter's accuracy depends on: the only awaits between the
    // read and the write below are DO storage ops, so the DO's input gate keeps
    // a concurrent burst serialized (no interleaved read-modify-write). Do NOT
    // add an `await fetch()` or other I/O here — it would open the gate and let
    // two requests both read the same count and both admit.
    const now = Date.now();
    const state =
      (await this.ctx.storage.get<RateLimitState>(STORAGE_KEY)) ?? null;
    const { decision, nextState } = decideRateLimit(
      state,
      now,
      limit,
      windowMs,
    );

    await this.ctx.storage.put(STORAGE_KEY, nextState);
    await this.ctx.storage.setAlarm(nextState.windowStart + windowMs);

    return decision;
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000;

export async function checkIpRateLimit(
  namespace: DurableObjectNamespace<IpRateLimiterDO>,
  ip: string,
  { limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS } = {},
): Promise<RateLimitDecision> {
  const id = namespace.idFromName(ip);
  const stub = namespace.get(id);
  return stub.checkAndIncrement(limit, windowMs);
}
