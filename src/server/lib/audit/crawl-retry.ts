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
import type { StepPageResult } from "@/server/lib/audit/types";

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

/**
 * A refused URL goes back on the queue instead of being recorded, because a
 * refusal is not a fact about the page. After this many attempts it is recorded
 * with the status it kept returning: the crawl has to terminate, and a URL that
 * failed every time is a much stronger claim than one that failed once.
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * How long to wait after the site refuses a batch, before the crawl resumes at
 * its reduced rate. Sized to the measured recovery window: in a probe of
 * `kello.ventrarocket.vn`, wave 3 was refused and wave 4 five seconds later was
 * clean. Escalation is per *consecutive* refused batch — a site still refusing
 * after a backoff needs longer than one that recovered.
 */
const THROTTLE_BACKOFF_BASE_SECONDS = 5;
const THROTTLE_BACKOFF_MAX_SECONDS = 60;

/**
 * Separate refusals from pages.
 *
 * `retry` is the URLs worth asking for again; `pages` keeps the rest, including
 * refusals that ran out of attempts — those stay as refused rows so the report
 * can say "we could not read this" instead of the crawl quietly shrinking.
 *
 * `retryAfterMs` is the longest wait any server in the batch asked for, or null
 * when none did (the usual case).
 */
export function partitionRefusedBatch(
  crawledBatch: StepPageResult[],
  retryAttempts: Map<string, number>,
): {
  pages: StepPageResult[];
  retry: string[];
  retryAfterMs: number | null;
  throttled: number;
  unanswered: number;
} {
  const pages: StepPageResult[] = [];
  const retry: string[] = [];
  let retryAfterMs: number | null = null;
  let throttled = 0;
  let unanswered = 0;

  for (const page of crawledBatch) {
    const refusal = classifyRefusal(page.statusCode);
    if (refusal === null) {
      pages.push(page);
      continue;
    }

    if (refusal === "throttled") throttled += 1;
    else unanswered += 1;

    if (page.retryAfterMs != null) {
      retryAfterMs = Math.max(retryAfterMs ?? 0, page.retryAfterMs);
    }

    const attempts = (retryAttempts.get(page.url) ?? 0) + 1;
    retryAttempts.set(page.url, attempts);
    if (attempts < MAX_RETRY_ATTEMPTS) {
      retry.push(page.url);
    } else {
      pages.push(page);
    }
  }

  return { pages, retry, retryAfterMs, throttled, unanswered };
}

/**
 * Exponential on how long the site has been refusing, because the common 429
 * carries no `Retry-After` at all. A header, when present, wins: the server
 * knows its own window better than our guess.
 */
export function throttleBackoffSeconds(
  consecutiveThrottledBatches: number,
  retryAfterMs: number | null,
): number {
  if (retryAfterMs != null) {
    return Math.max(1, Math.ceil(retryAfterMs / 1_000));
  }
  const seconds =
    THROTTLE_BACKOFF_BASE_SECONDS *
    2 ** Math.max(0, consecutiveThrottledBatches - 1);
  return Math.min(seconds, THROTTLE_BACKOFF_MAX_SECONDS);
}
