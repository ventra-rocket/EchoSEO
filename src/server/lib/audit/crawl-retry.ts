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
 * How much of a batch the site refused, as a share of it — and 0 when its
 * refusals say nothing about our rate.
 *
 * A share rather than a yes/no, because the rate controller needs to know *how
 * much* too fast it was. One 429 in a batch of 25 is a site that occasionally
 * refuses at any rate (`kello.ventrarocket.vn` returned 36 of them across 5,000
 * pages while averaging half its own tolerance); a batch refused wholesale is us.
 * Treating those two the same is what makes a rate controller ratchet itself down
 * to nothing on a site that was never rate-limiting it.
 *
 * An explicit throttle always counts. An unanswered request only counts when it
 * was most of the batch: a site with a handful of dead links would otherwise drag
 * every crawl down, and a load-induced failure storm — 1,210 of 5,000 on one
 * measured audit, with no 429 anywhere to explain it — takes almost every request
 * in flight with it.
 */
export function congestionShare(counts: {
  throttled: number;
  unanswered: number;
  batchSize: number;
}): number {
  if (counts.batchSize <= 0) return 0;
  const stormed = counts.unanswered * 2 > counts.batchSize;
  const refused = stormed
    ? counts.throttled + counts.unanswered
    : counts.throttled;
  if (refused === 0) return 0;
  return Math.min(1, refused / counts.batchSize);
}
