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

/** Primary page + up to (cap - 1) internal pages. */
const DEFAULT_MAX_PAGES = 10;

interface CrawledPage {
  url: string;
  statusCode: number;
  page: ParsedPage;
}

export interface CrawlResult {
  /** Primary (submitted) page first, then crawled internal pages. */
  pages: CrawledPage[];
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
    return { url: finalUrl, statusCode: response.status, page };
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
  if (!primary) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "Could not fetch the target page",
    );
  }

  const origin = getOrigin(primary.url);
  const robots = await fetchRobotsTxt(origin);
  const targets = selectInternalTargets(
    primary,
    origin,
    robots.isAllowed,
    Math.max(0, maxPages - 1),
  );

  const pages: CrawledPage[] = [primary];
  for (const url of targets) {
    const crawled = await fetchAndParse(url);
    // Drop a link that redirected off-origin — it isn't a page of this site
    // and its robots.txt was never consulted.
    if (crawled && isSameOrigin(crawled.url, origin)) {
      pages.push(crawled);
    }
  }
  return { pages };
}
