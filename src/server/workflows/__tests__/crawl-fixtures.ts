/**
 * Shared fixtures for the site-audit crawl loop tests.
 *
 * The mocks themselves stay in each test file — `vi.mock` is per-file and the
 * crawl module has to be imported after they are registered — so `recordingStep`
 * takes the file's own `crawlPage` mock rather than reaching for a global one.
 */
import type { Mock } from "vitest";
import type { RobotsResult } from "@/server/lib/audit/discovery";
import type { StepPageResult } from "@/server/lib/audit/types";
import type { CrawlRateSeed } from "@/server/lib/audit/crawl-rate";

import type { runCrawlPhase } from "../siteAuditWorkflowCrawl";

type CrawlPhaseParams = Parameters<typeof runCrawlPhase>[1];

export function robotsDisallowing(...disallowed: string[]): RobotsResult {
  return {
    isAllowed: (url) => !disallowed.some((path) => url.includes(path)),
    sitemapUrls: [],
    crawlDelaySeconds: null,
  };
}

export function page(
  url: string,
  internalLinks: string[] = [],
): StepPageResult {
  return {
    id: url,
    url,
    statusCode: 200,
    redirectUrl: null,
    title: "",
    metaDescription: "",
    canonicalUrl: null,
    robotsMeta: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    h1Count: 1,
    h2Count: 0,
    h3Count: 0,
    h4Count: 0,
    h5Count: 0,
    h6Count: 0,
    headingOrder: [1],
    wordCount: 100,
    imagesTotal: 0,
    imagesMissingAlt: 0,
    images: [],
    internalLinks,
    externalLinkCount: 0,
    hasStructuredData: false,
    hreflangTags: [],
    hasMixedContent: false,
    isIndexable: true,
    isHtml: true,
    responseTimeMs: 10,
  };
}

export function throttledPage(url: string, retryAfterMs: number | null = null) {
  return {
    ...page(url),
    statusCode: 429,
    title: "",
    wordCount: 0,
    isHtml: false,
    isIndexable: false,
    retryAfterMs,
  };
}

export function crawlParams(overrides: Partial<CrawlPhaseParams> = {}) {
  return {
    auditId: "audit-1",
    workflowInstanceId: "wf-1",
    origin: "https://example.com",
    startUrl: "https://example.com/",
    maxPages: 50,
    robots: robotsDisallowing(),
    sitemapUrls: [] as string[],
    // Unseeded by default: these tests assert the discovery path, where the
    // crawl opens at `CRAWL_RATE_START`. Seeding is asserted separately.
    seed: null as CrawlRateSeed | null,
    // Request spacing is asserted through `recordingStep`; the tests that are
    // about the frontier should not wait through it.
    waitMs: async () => {},
    ...overrides,
  };
}

/** `n` same-origin sitemap URLs, so a batch can be filled without link discovery. */
export function sitemapUrls(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `https://example.com/p${i}`);
}

/**
 * A step runner that records what the loop asked for: the size of each crawl
 * batch, the request spacing inside it, and every sleep it took.
 *
 * The spacing is the observable form of the control law — the crawl controls its
 * offered rate, so the interval between two dispatches *is* the rate — and the
 * sleeps are the politeness after a refusal.
 */
export function recordingStep(crawlPageMock: Mock) {
  const batchSizes: number[] = [];
  const sleeps: Array<{ name: string; duration: string }> = [];
  /** Every dispatch offset the loop asked for, per crawl batch. */
  const waitsByBatch: number[][] = [];
  let batchWaits: number[] = [];
  return {
    batchSizes,
    sleeps,
    waitsByBatch,
    /** Milliseconds between two dispatches, per crawl batch. */
    get intervals(): number[] {
      return waitsByBatch.map((waits) =>
        waits.length > 0 ? Math.min(...waits) : 0,
      );
    },
    waitMs: async (ms: number) => {
      batchWaits.push(ms);
    },
    step: {
      do: async <T>(
        name: string,
        callback: () => Promise<T> | T,
      ): Promise<T> => {
        const isCrawlBatch = name.startsWith("crawl-batch-");
        if (isCrawlBatch) batchWaits = [];
        const before = crawlPageMock.mock.calls.length;
        const result = await callback();
        if (isCrawlBatch) {
          batchSizes.push(crawlPageMock.mock.calls.length - before);
          waitsByBatch.push(batchWaits);
        }
        return result;
      },
      // Wider than the caller's `WorkflowSleepDuration` on purpose: a parameter
      // has to accept everything the real signature may pass.
      sleep: async (name: string, duration: string | number) => {
        sleeps.push({ name, duration: String(duration) });
      },
    },
  };
}
