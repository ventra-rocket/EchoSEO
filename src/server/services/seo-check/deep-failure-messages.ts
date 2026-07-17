/**
 * The two specific, user-facing failure messages the Deep pipeline stores on a
 * report row (its `error`) when it refuses up front — the kill-switch and the
 * daily quota. Both carry actionable guidance ("try again later/tomorrow").
 *
 * Kept in one dependency-free module (no `cloudflare:workers`) so the server
 * that sets them and the `/r/{id}` page's localized message map — which keys off
 * the exact string — share a single source, and so the client-side copy test can
 * import them to pin that mapping without dragging the Worker runtime into a
 * browser-environment test.
 */
export const DEEP_DISABLED_MESSAGE =
  "Free deep checks are paused right now. Please try again later.";

/** Neutral wording — never reveals which limit (global/domain/email) tripped. */
export const DEEP_QUOTA_BLOCKED_MESSAGE =
  "Today's free deep-check limit has been reached. Please try again tomorrow.";
