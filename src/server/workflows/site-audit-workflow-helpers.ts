import { analyzeHtml } from "@/server/lib/audit/page-analyzer";
import type { StepPageResult } from "@/server/lib/audit/types";
import { isSameOrigin, normalizeUrl } from "@/server/lib/audit/url-utils";
import { classifyPageStatus } from "@/shared/http-status";

/**
 * Fetch and parse one page.
 *
 * `includeAnalysis` returns the parsed `PageAnalysis` alongside the row-shaped
 * result. It is opt-in and off by default because the main crawl returns these
 * from a Workflow step in batches of 25, and a step's return payload is capped
 * at 1 MiB — carrying a second copy of every page's facts through that boundary
 * would shrink the largest crawl that can complete. The competitor comparison
 * asks for it because the rule engine scores a `PageAnalysis`, and scoring their
 * page through anything other than the function that scores ours would make the
 * comparison unfair in a way no reader could see.
 */
export async function crawlPage(
  url: string,
  crawlOrigin: string,
  options: { includeAnalysis?: boolean } = {},
): Promise<StepPageResult | null> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "EchoSEO-Audit/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });

    const responseTimeMs = Date.now() - startTime;
    const statusCode = response.status;
    const finalUrl = normalizeUrl(response.url) ?? response.url;
    if (!isSameOrigin(finalUrl, crawlOrigin)) return null;

    const redirectUrl =
      response.redirected && response.url !== url ? response.url : null;

    // A throttled response is not this page. Cloudflare's rate-limit block page
    // is served as `text/html`, so parsing it would record the block page's
    // title and word count as the page's own facts. Return the placeholder row
    // and tell the caller how long to wait.
    if (classifyPageStatus(statusCode) === "throttled") {
      return {
        ...emptyPageResult(finalUrl, statusCode, redirectUrl, responseTimeMs),
        retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after")),
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return emptyPageResult(finalUrl, statusCode, redirectUrl, responseTimeMs);
    }

    const html = await response.text();
    const analysis = analyzeHtml(
      html,
      finalUrl,
      statusCode,
      responseTimeMs,
      redirectUrl,
    );
    const isIndexable = !(
      analysis.robotsMeta?.toLowerCase().includes("noindex") ?? false
    );
    const h2Count = analysis.headingOrder.filter((h) => h === 2).length;
    const h3Count = analysis.headingOrder.filter((h) => h === 3).length;
    const h4Count = analysis.headingOrder.filter((h) => h === 4).length;
    const h5Count = analysis.headingOrder.filter((h) => h === 5).length;
    const h6Count = analysis.headingOrder.filter((h) => h === 6).length;

    return {
      ...(options.includeAnalysis ? { analysis } : {}),
      id: crypto.randomUUID(),
      url: finalUrl,
      statusCode,
      redirectUrl,
      title: analysis.title,
      metaDescription: analysis.metaDescription,
      canonicalUrl: analysis.canonical,
      robotsMeta: analysis.robotsMeta,
      ogTitle: analysis.ogTitle,
      ogDescription: analysis.ogDescription,
      ogImage: analysis.ogImage,
      h1Count: analysis.h1s.length,
      h2Count,
      h3Count,
      h4Count,
      h5Count,
      h6Count,
      headingOrder: analysis.headingOrder,
      wordCount: analysis.wordCount,
      imagesTotal: analysis.images.length,
      imagesMissingAlt: analysis.images.filter(
        (img) => !img.alt || img.alt === "",
      ).length,
      images: analysis.images,
      internalLinks: analysis.internalLinks,
      externalLinkCount: analysis.externalLinks.length,
      hasStructuredData: analysis.hasStructuredData,
      hreflangTags: analysis.hreflangTags,
      hasMixedContent: analysis.hasMixedContent,
      isIndexable,
      isHtml: true,
      responseTimeMs,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.warn(`Failed to crawl ${url}:`, error);
    return emptyPageResult(url, 0, null, responseTimeMs);
  }
}

/**
 * `Retry-After` is either a delay in seconds or an HTTP date. Anything else — or
 * a value so large it is really a refusal — reads as "no instruction", leaving
 * the caller on its own exponential backoff rather than sleeping for an hour on
 * a header we cannot vouch for.
 */
const MAX_RETRY_AFTER_MS = 60_000;

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const trimmed = header.trim();

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) {
    if (seconds <= 0) return null;
    return Math.min(seconds * 1_000, MAX_RETRY_AFTER_MS);
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) return null;
  const deltaMs = dateMs - Date.now();
  if (deltaMs <= 0) return null;
  return Math.min(deltaMs, MAX_RETRY_AFTER_MS);
}

function emptyPageResult(
  url: string,
  statusCode: number,
  redirectUrl: string | null,
  responseTimeMs: number,
): StepPageResult {
  return {
    id: crypto.randomUUID(),
    url,
    statusCode,
    redirectUrl,
    title: "",
    metaDescription: "",
    canonicalUrl: null,
    robotsMeta: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    h1Count: 0,
    h2Count: 0,
    h3Count: 0,
    h4Count: 0,
    h5Count: 0,
    h6Count: 0,
    headingOrder: [],
    wordCount: 0,
    imagesTotal: 0,
    imagesMissingAlt: 0,
    images: [],
    internalLinks: [],
    externalLinkCount: 0,
    hasStructuredData: false,
    hreflangTags: [],
    hasMixedContent: false,
    isIndexable: false,
    // No HTML document was parsed: either a non-HTML resource or a failed
    // fetch. Every field above is a placeholder, not an observation.
    isHtml: false,
    responseTimeMs,
  };
}
