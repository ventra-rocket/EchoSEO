/**
 * Pure fixed-window rate-limit decision logic.
 *
 * Kept free of any `cloudflare:workers` import so it's testable in plain
 * Node — the Durable Object wrapper in rate-limit-do.ts is Workers-runtime
 * plumbing around this.
 */

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
}

export interface RateLimitState {
  count: number;
  windowStart: number;
}

export function decideRateLimit(
  state: RateLimitState | null,
  now: number,
  limit: number,
  windowMs: number,
): { decision: RateLimitDecision; nextState: RateLimitState } {
  const windowExpired = !state || now - state.windowStart >= windowMs;
  const windowStart = windowExpired ? now : state.windowStart;
  const count = (windowExpired ? 0 : state.count) + 1;

  return {
    decision: {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: windowStart + windowMs,
    },
    nextState: { count, windowStart },
  };
}
