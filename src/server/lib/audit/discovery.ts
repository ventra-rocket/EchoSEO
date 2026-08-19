/**
 * robots.txt and sitemap.xml discovery for the site audit crawler.
 */
import robotsParser from "robots-parser";
import { XMLParser } from "fast-xml-parser";
import { isSameOrigin, normalizeUrl } from "./url-utils";

const SITEMAP_FETCH_TIMEOUT_MS = 15_000;
const MAX_SITEMAP_DEPTH = 3;
const MAX_SITEMAP_DOCS = 300;
const SITEMAP_CONCURRENCY = 5;
const SITEMAP_RETRIES = 1;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  isArray: (name) => name === "sitemap" || name === "url",
});

/**
 * The name the crawler introduces itself as, everywhere it makes a request. It
 * is also the name `Crawl-delay` and `Disallow` rules are matched against, so a
 * second literal somewhere else would silently read a different robots.txt than
 * the one being obeyed.
 */
export const AUDIT_USER_AGENT = "EchoSEO-Audit/1.0";

export interface RobotsResult {
  isAllowed: (url: string) => boolean;
  sitemapUrls: string[];
  /**
   * Seconds the site asked crawlers to wait between requests, or null when it
   * asked for nothing. A request, not a fact about the pages — the crawl's rate
   * control obeys it instead of discovering the same limit by tripping over it.
   */
  crawlDelaySeconds: number | null;
}

/**
 * The serializable half of a robots.txt read.
 *
 * `RobotsResult` carries a closure, so it can never be the return value of a
 * Workflow step. This can: a step caches the body, and `parseRobotsTxt` rebuilds
 * the same matcher from it on every replay. Without that split the crawler has
 * to fetch robots.txt outside any step, and a retry can pick up a different file
 * and flip allow/deny decisions half way through a crawl.
 */
export interface RobotsTxtBody {
  /** The robots.txt URL the rules are parsed against. */
  robotsUrl: string;
  /** Body as served, or null when there is no usable robots.txt. */
  text: string | null;
  /**
   * HTTP status observed, or null when the request never produced one (network
   * error, timeout, DNS failure).
   *
   * `text: null` alone cannot tell those apart, and RFC 9309 treats them
   * oppositely: an unavailable robots.txt (4xx) means everything is allowed,
   * while an *unreachable* one (5xx or no response) means a crawler should
   * assume complete disallow. Our own site is crawled on the operator's
   * instruction so the permissive reading is right there; a third party's site
   * is not, and the competitor crawl reads this field to refuse rather than
   * guess.
   */
  status: number | null;
}

/**
 * Fetch robots.txt and return its body verbatim. The only side-effecting half,
 * and the only half a Workflow step needs to wrap.
 *
 * An unreachable or non-OK robots.txt yields `text: null`, which
 * `parseRobotsTxt` reads as "everything allowed" — the same behaviour this had
 * before the split, now cacheable.
 */
export async function fetchRobotsTxtBody(
  origin: string,
): Promise<RobotsTxtBody> {
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const response = await fetch(robotsUrl, {
      headers: { "User-Agent": AUDIT_USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { robotsUrl, text: null, status: response.status };
    }
    return { robotsUrl, text: await response.text(), status: response.status };
  } catch (error) {
    console.warn("Failed to fetch robots.txt:", error);
    return { robotsUrl, text: null, status: null };
  }
}

/**
 * Build the allow matcher from an already-fetched body. Pure, so two calls on
 * one body agree — which is what makes a replayed crawl reach the same allow
 * decisions as the original.
 */
export function parseRobotsTxt(body: RobotsTxtBody): RobotsResult {
  if (body.text === null) {
    // No robots.txt = everything allowed, at whatever rate the crawl discovers.
    return { isAllowed: () => true, sitemapUrls: [], crawlDelaySeconds: null };
  }

  const robots = robotsParser(body.robotsUrl, body.text);
  return {
    isAllowed: (url: string) => robots.isAllowed(url) ?? true,
    sitemapUrls: robots.getSitemaps(),
    // Matched on our own user-agent, so a site that slows down `EchoSEO-Audit`
    // specifically is obeyed rather than only its `*` group.
    crawlDelaySeconds: robots.getCrawlDelay(AUDIT_USER_AGENT) ?? null,
  };
}

/**
 * Fetch and parse robots.txt in one call, for callers already inside a step (or
 * outside a Workflow entirely) that just need the matcher.
 */
export async function fetchRobotsTxt(origin: string): Promise<RobotsResult> {
  return parseRobotsTxt(await fetchRobotsTxtBody(origin));
}

/**
 * Fetch and parse a sitemap (supports sitemap index recursion).
 * Returns a flat list of page URLs found.
 */
function isProbablySitemapXml(
  contentType: string | null,
  body: string,
): boolean {
  if (contentType?.toLowerCase().includes("xml")) {
    return true;
  }

  const trimmed = body.trimStart().toLowerCase();
  return (
    trimmed.startsWith("<?xml") ||
    trimmed.startsWith("<urlset") ||
    trimmed.startsWith("<sitemapindex")
  );
}

function getSitemapLocations(input: unknown): string[] {
  if (!input) return [];
  const entries = Array.isArray(input) ? input : [input];
  return entries
    .map((entry) => {
      if (isRecord(entry)) {
        const loc = entry["loc"];
        return typeof loc === "string" ? loc : null;
      }
      return null;
    })
    .filter((loc): loc is string => typeof loc === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function getParsedSitemapSections(parsed: unknown): {
  sitemap: unknown;
  url: unknown;
} {
  if (!parsed || typeof parsed !== "object") {
    return { sitemap: undefined, url: undefined };
  }

  const root = parsed as {
    sitemapindex?: { sitemap?: unknown };
    urlset?: { url?: unknown };
  };

  return {
    sitemap: root.sitemapindex?.sitemap,
    url: root.urlset?.url,
  };
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return "name" in error && error.name === "TimeoutError";
}

async function fetchSitemapDocumentWithRetry(sitemapUrl: string): Promise<{
  nestedSitemaps: string[];
  pageUrls: string[];
  timedOut: boolean;
}> {
  const normalizedSitemapUrl = normalizeUrl(sitemapUrl);
  if (!normalizedSitemapUrl) {
    return { nestedSitemaps: [], pageUrls: [], timedOut: false };
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= SITEMAP_RETRIES; attempt++) {
    try {
      const response = await fetch(normalizedSitemapUrl, {
        headers: { "User-Agent": AUDIT_USER_AGENT },
        signal: AbortSignal.timeout(SITEMAP_FETCH_TIMEOUT_MS),
      });

      const finalUrl = normalizeUrl(response.url, normalizedSitemapUrl);
      if (!finalUrl || !isSameOrigin(finalUrl, normalizedSitemapUrl)) {
        return { nestedSitemaps: [], pageUrls: [], timedOut: false };
      }

      if (!response.ok) {
        return { nestedSitemaps: [], pageUrls: [], timedOut: false };
      }

      const body = await response.text();
      if (!isProbablySitemapXml(response.headers.get("content-type"), body)) {
        return { nestedSitemaps: [], pageUrls: [], timedOut: false };
      }

      const parsed = xmlParser.parse(body) as unknown;
      const sections = getParsedSitemapSections(parsed);
      const nestedSitemaps = getSitemapLocations(sections.sitemap)
        .map((loc) => normalizeUrl(loc, finalUrl))
        .filter((loc): loc is string => loc !== null);
      const pageUrls = getSitemapLocations(sections.url)
        .map((loc) => normalizeUrl(loc, finalUrl))
        .filter((loc): loc is string => loc !== null);

      return { nestedSitemaps, pageUrls, timedOut: false };
    } catch (error) {
      lastError = error;
      if (!isTimeoutError(error) || attempt === SITEMAP_RETRIES) {
        break;
      }
    }
  }

  return {
    nestedSitemaps: [],
    pageUrls: [],
    timedOut: isTimeoutError(lastError),
  };
}

/**
 * Discover all page URLs from robots.txt + sitemaps for an origin.
 *
 * `urls` is sitemap EVIDENCE, not a crawl budget: every crawled page is judged
 * against it (`buildSitemapMembership`), so it is collected well past `maxPages`
 * and must not be truncated to the crawl size. It is far too large to cross a
 * Workflow step boundary — see `discovered-urls-store.ts`.
 *
 * `stats` is reported rather than logged so the UI can say what discovery did
 * during the seconds it takes on a large site.
 */
export async function discoverUrls(
  origin: string,
  maxPages = 50,
): Promise<{
  urls: string[];
  robots: RobotsResult;
  stats: {
    docsFetched: number;
    docsFailed: number;
    docsTimedOut: number;
  };
}> {
  const robots = await fetchRobotsTxt(origin);

  // Collect sitemap URLs: from robots.txt + default location
  const sitemapSources = new Set(robots.sitemapUrls);
  sitemapSources.add(`${origin}/sitemap.xml`);

  const maxDiscoveredUrls = Math.min(Math.max(maxPages * 20, 500), 50_000);
  const allUrls = new Set<string>();

  const queue: Array<{ url: string; depth: number }> = Array.from(
    sitemapSources,
  )
    .map((url) => normalizeUrl(url, origin))
    .filter((url): url is string => url !== null)
    .filter((url) => isSameOrigin(url, origin))
    .map((url) => ({ url, depth: MAX_SITEMAP_DEPTH }));
  const seenSitemapDocs = new Set<string>();
  let fetchedDocs = 0;
  let failedDocs = 0;
  let timedOutDocs = 0;

  while (queue.length > 0 && allUrls.size < maxDiscoveredUrls) {
    if (fetchedDocs >= MAX_SITEMAP_DOCS) {
      break;
    }
    const batch = queue.splice(0, SITEMAP_CONCURRENCY);
    await Promise.all(
      batch.map(async ({ url, depth }) => {
        const normalizedUrl = normalizeUrl(url);
        if (
          !normalizedUrl ||
          !isSameOrigin(normalizedUrl, origin) ||
          depth <= 0 ||
          seenSitemapDocs.has(normalizedUrl)
        ) {
          return;
        }

        seenSitemapDocs.add(normalizedUrl);
        fetchedDocs += 1;

        const result = await fetchSitemapDocumentWithRetry(normalizedUrl);
        if (
          result.pageUrls.length === 0 &&
          result.nestedSitemaps.length === 0
        ) {
          failedDocs += 1;
          if (result.timedOut) {
            timedOutDocs += 1;
          }
          return;
        }

        for (const pageUrl of result.pageUrls) {
          if (!isSameOrigin(pageUrl, origin)) continue;
          if (allUrls.size >= maxDiscoveredUrls) break;
          allUrls.add(pageUrl);
        }

        if (depth <= 1) return;

        for (const nestedUrl of result.nestedSitemaps) {
          if (!isSameOrigin(nestedUrl, origin)) continue;
          if (!seenSitemapDocs.has(nestedUrl)) {
            queue.push({ url: nestedUrl, depth: depth - 1 });
          }
        }
      }),
    );
  }

  if (failedDocs > 0) {
    console.warn(
      `Sitemap discovery completed with partial failures for ${origin}: fetched=${fetchedDocs}, failed=${failedDocs}, timedOut=${timedOutDocs}, discoveredUrls=${allUrls.size}`,
    );
  }

  return {
    urls: Array.from(allUrls),
    robots,
    stats: {
      docsFetched: fetchedDocs,
      docsFailed: failedDocs,
      docsTimedOut: timedOutDocs,
    },
  };
}
