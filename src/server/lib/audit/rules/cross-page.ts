/**
 * Cross-page audit rules (Phase 9).
 *
 * These need the whole crawl — the link graph and sitemap membership — so they
 * cannot live in the per-page P02 catalog, which is frozen. They deliberately
 * reuse P02's `Rule`/`RuleMeta` shape and the same pure `evaluate()` engine, so
 * one occurrence pipeline, one localization seam and one citation contract cover
 * both families.
 *
 * Every `guideQuote` below is verbatim from the cited Google page, checked
 * against the live page on `lastReviewedDate`.
 *
 * Honesty constraints these rules are built around:
 * - A finding is scoped to what was crawled. "No inbound links" means none
 *   *within the crawled scope*, never proof that no link exists anywhere.
 * - Where the crawl cannot support a judgement, the rule stays silent rather
 *   than guessing. Silence is recoverable; a false accusation is not.
 */
import type { Rule } from "../../seo-rules/types";

export interface CrossPageSignals {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  /** The response was an HTML document, not a PDF/image or a failed fetch. */
  isHtml: boolean;
  isIndexable: boolean;
  inSitemap: boolean;
  /** This page is where the crawl started, so it is reachable by definition. */
  isCrawlEntryPoint: boolean;
  /** Distinct crawled pages that link to this one. */
  inboundInternalLinks: number;
  /** Links on this page whose target was crawled and returned a 4xx. */
  brokenLinkTargets: string[];
  /**
   * Whether "nothing links here" can be trusted for this crawl at all. False
   * when the crawl hit its page cap (the pages that would have linked here were
   * never fetched) or when the start URL itself was never matched.
   */
  orphanDetectionReliable: boolean;
  /** A sitemap was actually found, so absence from it means something. */
  sitemapAvailable: boolean;
}

/** A page that could carry document-level findings at all. */
function isJudgeableDocument(signals: CrossPageSignals): boolean {
  return signals.isHtml && signals.statusCode === 200;
}

export const CROSS_PAGE_RULES: Array<Rule<CrossPageSignals>> = [
  {
    id: "audit-unreachable-url",
    category: "server",
    severity: "critical",
    label: "URL responds to a crawl request",
    appliesWhen: (signals) => (signals.statusCode === 0 ? "fail" : "pass"),
    problem:
      "The crawler got no response at all for this URL — the request failed, timed out, or the host did not resolve. Google treats this the same way, and an unreachable URL cannot stay in the index.",
    fixSteps: [
      "Open the URL yourself and confirm whether the host resolves and the server responds.",
      "Check DNS records, firewall rules and rate limiting for anything blocking automated crawlers.",
      "If the URL is genuinely gone, return 404 or 410 instead of failing to respond, and remove links to it.",
    ],
    googleSourceUrl:
      "https://developers.google.com/crawling/docs/troubleshooting/dns-network-errors",
    guideQuote:
      "For Google Search, the lack of content means that Google can't index the crawled URLs, and already indexed URLs that are unreachable will be removed from Google's index within days.",
    lastReviewedDate: "2026-07-20",
  },
  {
    id: "audit-broken-internal-link",
    category: "server",
    severity: "high",
    label: "Internal links point at working pages",
    appliesWhen: (signals) =>
      signals.brokenLinkTargets.length > 0 ? "fail" : "pass",
    problem:
      "This page links to internal URLs that returned a 4xx status when crawled. Visitors hit dead ends, and Google will not use the content behind those links.",
    fixSteps: [
      "Update each broken link to the URL that currently serves the content.",
      "If the target moved permanently, redirect the old URL (301) and still fix the link so it points straight at the destination.",
      "If the target is genuinely gone, remove the link rather than leaving it pointing at an error page.",
    ],
    googleSourceUrl:
      "https://developers.google.com/search/docs/crawling-indexing/http-network-errors",
    guideQuote:
      "Google doesn't use the content from URLs that return 4xx status codes.",
    lastReviewedDate: "2026-07-20",
  },
  {
    id: "audit-orphan-page",
    category: "structure",
    severity: "high",
    label: "Page is linked from somewhere on the site",
    appliesWhen: (signals) => {
      // A truncated crawl cannot tell an orphan from a page whose linkers were
      // never fetched, and without the entry point the graph has no known root.
      if (!signals.orphanDetectionReliable) return "pass";
      if (!isJudgeableDocument(signals) || !signals.isIndexable) return "pass";
      if (signals.isCrawlEntryPoint) return "pass";
      return signals.inboundInternalLinks === 0 ? "fail" : "pass";
    },
    problem:
      "No other page in the crawled scope links to this one, so it was only found through the sitemap or the start URL. Google discovers and weighs pages partly through the links pointing at them.",
    fixSteps: [
      "Link to this page from a relevant parent, hub or navigation page.",
      "Use descriptive anchor text that says what the destination is about.",
      "If the page is not meant to be found, remove it from the sitemap or mark it noindex instead of leaving it unlinked.",
    ],
    googleSourceUrl:
      "https://developers.google.com/search/docs/crawling-indexing/links-crawlable",
    guideQuote:
      "Google uses links as a signal when determining the relevancy of pages and to find new pages to crawl.",
    lastReviewedDate: "2026-07-20",
  },
  {
    id: "audit-missing-from-sitemap",
    category: "structure",
    severity: "low",
    label: "Indexable page is listed in a sitemap",
    appliesWhen: (signals) => {
      // Google's own guidance is that a small, well-linked site may not need a
      // sitemap at all, so "missing from sitemap" is only meaningful once the
      // site has one.
      if (!signals.sitemapAvailable) return "pass";
      if (!isJudgeableDocument(signals) || !signals.isIndexable) return "pass";
      return signals.inSitemap ? "pass" : "warn";
    },
    problem:
      "This page is indexable and returns 200, but the sitemaps found for this site do not list it. A sitemap is how you tell Google which URLs you consider worth crawling.",
    fixSteps: [
      "Add the URL to your sitemap, or regenerate the sitemap if it is produced automatically.",
      "Keep the sitemap to canonical, indexable URLs only — do not add redirected or noindex pages.",
      "Reference the sitemap from robots.txt and submit it in Search Console.",
    ],
    googleSourceUrl:
      "https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview",
    guideQuote:
      "A sitemap is a file where you provide information about the pages, videos, and other files on your site, and the relationships between them.",
    lastReviewedDate: "2026-07-20",
  },
];
