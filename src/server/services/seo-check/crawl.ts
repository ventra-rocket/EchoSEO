/**
 * Bounded internal-page crawler for the Free Deep SEO Check.
 *
 * Fetches the submitted page plus a small sample of same-origin internal pages,
 * each through `safeFetch` (SSRF-validated every hop) and parsed with the Lite
 * `parseLitePage`. We are the crawler here, so it stays polite and bounded:
 * hard page cap, same-origin only (checked before AND after redirects),
 * robots.txt Disallow respected. An unreachable, blocked, or off-origin
 * page is skipped, never fatal — only the primary page must load.
 */
import { AppError } from "@/server/lib/errors";
import { fetchRobotsTxt } from "@/server/lib/audit/discovery";
import {
  getOrigin,
  isSameOrigin,
  normalizeUrl,
} from "@/server/lib/audit/url-utils";
import { safeFetch, readBoundedText } from "./safe-fetch";
import { parseLitePage, type ParsedPage } from "./parse-html";
import { isAuthInterstitialUrl } from "./auth-interstitial";

/** Primary page + up to (cap - 1) internal pages. */
const DEFAULT_MAX_PAGES = 10;

interface CrawledPage {
  /** Final URL after redirects — the URL the fetched content belongs to. */
  url: string;
  /**
   * `url` in the same normalized form the crawler dedupes by (fragment
   * stripped, query order canonical). Two crawls of one site can store
   * different raw variants of the same page depending on which link happened
   * to be fetched first, so any consumer that keys pages by URL should key by
   * this, and keep `url` for display.
   */
  normalizedUrl: string;
  statusCode: number;
  page: ParsedPage;
  /**
   * Same-origin links (as written on the primary page) whose fetch redirected
   * onto this final URL. Absent when the page was only reached at its own
   * address.
   */
  redirectedFrom?: string[];
}

export interface CrawlResult {
  /** Primary (submitted) page first, then crawled internal pages. */
  pages: CrawledPage[];
}

/** A body we can attribute to the target site itself, not to an error page. */
function isOk(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

async function fetchAndParse(url: string): Promise<CrawledPage | null> {
  try {
    const startedAt = Date.now();
    const { response, finalUrl } = await safeFetch(url);
    const html = await readBoundedText(response);
    const page = parseLitePage(
      html,
      finalUrl,
      response.status,
      Date.now() - startedAt,
    );
    return {
      url: finalUrl,
      normalizedUrl: normalizeUrl(finalUrl) ?? finalUrl,
      statusCode: response.status,
      page,
    };
  } catch {
    // SSRF-blocked, unreachable, or too large — skip this page.
    return null;
  }
}

function selectInternalTargets(
  primary: CrawledPage,
  origin: string,
  isAllowed: (url: string) => boolean,
  limit: number,
): string[] {
  const seen = new Set<string>([primary.url]);
  const targets: string[] = [];
  for (const href of primary.page.internalLinks) {
    if (targets.length >= limit) break;
    const resolved = normalizeUrl(href, primary.url);
    if (!resolved || seen.has(resolved)) continue;
    if (!isSameOrigin(resolved, origin)) continue;
    if (!isAllowed(resolved)) continue;
    seen.add(resolved);
    targets.push(resolved);
  }
  return targets;
}

export async function crawlSite(
  startUrl: string,
  maxPages: number = DEFAULT_MAX_PAGES,
): Promise<CrawlResult> {
  const primary = await fetchAndParse(startUrl);
  // The submitted page must have answered 2xx — a 404/5xx body, or the error
  // page Cloudflare returns for a hostname that does not resolve, is not the
  // site the visitor asked us to audit, and scoring it would report a
  // confident-looking result for a page we never read. Internal pages below
  // are deliberately NOT held to this: a broken internal URL is a real finding
  // worth listing, and only the primary page feeds the headline score.
  if (!primary || !isOk(primary.statusCode)) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "Could not fetch the target page",
    );
  }
  // The submitted page redirected to an auth/SSO login screen — which answers
  // 2xx — so we crawled a login page, not the site. Reject rather than audit and
  // score a screen the visitor can't see. Only the primary is guarded: an
  // internal link to a login page is a legitimate finding, not a reason to
  // abandon the audit.
  if (isAuthInterstitialUrl(primary.url)) {
    throw new AppError(
      "TARGET_BEHIND_AUTH",
      "Target redirected to an auth interstitial",
    );
  }

  const origin = getOrigin(primary.url);
  const robots = await fetchRobotsTxt(origin);
  // Two separate bounds: the page cap says how many pages the report may
  // hold, and the request budget hard-bounds fetches for cost/SSRF no matter
  // what those fetches return. The budget carries headroom over the page cap
  // so a run of links that all redirect onto one canonical page (each drop
  // burns a fetch) cannot starve coverage while later candidates were never
  // tried — but it is still a hard ceiling, never "fetch until full".
  const requestBudget = 2 * Math.max(0, maxPages - 1);
  const targets = selectInternalTargets(
    primary,
    origin,
    robots.isAllowed,
    requestBudget,
  );

  const pages: CrawledPage[] = [primary];
  // Key final URLs by the same normalized form the queue uses for links, so
  // two landings that differ only in query order, fragment, or a trailing
  // slash count as one page. The stored `url` stays the first raw landing;
  // `normalizedUrl` carries the stable identity.
  const byFinalUrl = new Map<string, CrawledPage>([
    [primary.normalizedUrl, primary],
  ]);
  for (const url of targets) {
    if (pages.length >= maxPages) break;
    const crawled = await fetchAndParse(url);
    // Re-validate the *final* URL after redirects: drop a link that hopped
    // off-origin (not a page of this site) or that redirected onto a
    // robots-Disallow path (the pre-fetch check only saw the requested URL).
    if (
      !crawled ||
      !isSameOrigin(crawled.url, origin) ||
      !robots.isAllowed(crawled.url)
    ) {
      continue;
    }
    // The queue deduped links as written, but pages are stored under the URL
    // they land on — two different links redirecting to one destination would
    // both arrive here. Keep the first landing and record the extra source on
    // it rather than listing the same page twice. The duplicate consumed one
    // fetch from the request budget, and the loop moves on to the next
    // candidate — coverage recovers as long as the budget holds.
    const existing = byFinalUrl.get(crawled.normalizedUrl);
    if (existing) {
      if (url !== crawled.url) {
        existing.redirectedFrom = [...(existing.redirectedFrom ?? []), url];
      }
      continue;
    }
    if (url !== crawled.url) {
      crawled.redirectedFrom = [url];
    }
    byFinalUrl.set(crawled.normalizedUrl, crawled);
    pages.push(crawled);
  }
  return { pages };
}
