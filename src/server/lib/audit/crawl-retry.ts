/**
 * Which responses the crawler asks for again instead of writing down.
 *
 * This is crawl policy, deliberately separate from `classifyPageStatus`. They
 * answer different questions and are allowed different answers: a 503 is retried
 * here *and* still reported as one of the site's errors, because a maintenance
 * page that never recovers is a real finding while the same page mid-deploy is
 * not something to grade a URL on. Only 429 gets its own reporting class, since
 * only 429 is exclusively a statement about our request rate.
 *
 * The reason a refusal must not be written down at all is that we never saw the
 * page: recording it stores the error page's title and word count as the URL's own
 * facts, and lets the error page's links into the crawl frontier.
 */

/**
 * `throttled` — the server explicitly told us to slow down, so one is enough to
 * act on. 503 belongs here: it is the canonical overload response and the one
 * usually paired with `Retry-After`.
 *
 * `unanswered` — we got nothing usable and cannot tell whose fault that is. One
 * of these is an ordinary dead URL; a batch full of them is us.
 */
type RefusalKind = "throttled" | "unanswered";

const THROTTLE_STATUSES = new Set([429, 503]);
/** 0 is the "fetch threw" sentinel `crawlPage` writes when no response arrived. */
const UNANSWERED_STATUSES = new Set([0, 502, 504]);

export function classifyRefusal(
  statusCode: number | null | undefined,
): RefusalKind | null {
  if (statusCode == null) return null;
  if (THROTTLE_STATUSES.has(statusCode)) return "throttled";
  if (UNANSWERED_STATUSES.has(statusCode)) return "unanswered";
  return null;
}

/**
 * Whether a batch's refusals say the crawl is going too fast.
 *
 * An explicit throttle always does. An unanswered request only does when it was
 * most of the batch: a site with a handful of dead links would otherwise drag the
 * whole crawl down to its floor, and a load-induced failure storm — 1,210 of 5,000
 * on one measured audit, with no 429 anywhere to explain it — takes almost every
 * request in flight with it.
 */
export function isCongestionSignal(counts: {
  throttled: number;
  unanswered: number;
  batchSize: number;
}): boolean {
  if (counts.throttled > 0) return true;
  return counts.unanswered * 2 > counts.batchSize;
}
