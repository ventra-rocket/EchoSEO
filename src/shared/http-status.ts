/**
 * One classification of a crawled page's HTTP status, shared by the two places
 * that must agree about it.
 *
 * The audit results table lets a reader filter pages by status, and the crawl
 * summary counts how many were redirects and how many were broken. If those two
 * used separate range checks, the card would eventually disagree with the table
 * it links to — and the reader has no way to tell which one is lying.
 *
 * Lives in `shared/` because one consumer is a client filter and the other is the
 * crawl Workflow.
 */

export type PageStatusClass =
  | "ok"
  | "redirect"
  | "error"
  | "throttled"
  | "missing";

/**
 * `missing` is a real outcome, not an absence: `audit_pages.status_code` is null
 * when no response was ever obtained (a failed fetch, or a non-HTML resource the
 * crawler recorded as a placeholder). Counting those as errors would inflate
 * "broken" with pages nobody proved anything about.
 *
 * `throttled` is a statement about our own request rate, not about the page: a
 * 429 means the server refused to answer this time, so we never saw the page and
 * cannot report anything about it. Counting those as `error` made a crawl that
 * outran a site's rate limit report the site as broken — 1,894 of 5,000 pages on
 * one real audit.
 *
 * Only 429. A 401 or 403 is a durable "you may not see this" that a reader may
 * genuinely need to act on, and `cross-page-signals.ts` already excludes those
 * from broken *links* where that question is asked separately.
 */
export function classifyPageStatus(
  statusCode: number | null | undefined,
): PageStatusClass {
  if (statusCode == null) return "missing";
  if (statusCode >= 200 && statusCode < 300) return "ok";
  if (statusCode >= 300 && statusCode < 400) return "redirect";
  if (statusCode === 429) return "throttled";
  if (statusCode >= 400) return "error";
  // 1xx never reaches a crawler as a final status, and a 0 is what the fetch
  // failure path writes. Neither is a proven page.
  return "missing";
}
