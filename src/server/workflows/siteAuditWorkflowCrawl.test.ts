import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RobotsResult } from "@/server/lib/audit/discovery";
import type { StepPageResult } from "@/server/lib/audit/types";

const { crawlPageMock, updateAuditProgressMock, pushCrawledUrlsMock } =
  vi.hoisted(() => ({
    crawlPageMock: vi.fn(),
    updateAuditProgressMock: vi.fn(),
    pushCrawledUrlsMock: vi.fn(),
  }));

vi.mock("@/server/workflows/site-audit-workflow-helpers", () => ({
  crawlPage: crawlPageMock,
}));
vi.mock("@/server/features/audit/repositories/AuditRepository", () => ({
  AuditRepository: { updateAuditProgress: updateAuditProgressMock },
}));
vi.mock("@/server/lib/audit/progress-kv", () => ({
  AuditProgressKV: { pushCrawledUrls: pushCrawledUrlsMock },
}));

// Imported after the mocks are registered: a static import would bind the real
// repository, which reaches `cloudflare:workers` through `@/db`.
const { runCrawlPhase } = await import("./siteAuditWorkflowCrawl");

/**
 * A step runner that just calls the body. Enough for these tests: what is being
 * asserted is the crawl frontier's bookkeeping, and replay behaviour is a
 * property of the robots matcher (see `discovery.test.ts`), not of this loop.
 */
const step = {
  do: async <T>(_name: string, callback: () => Promise<T> | T): Promise<T> =>
    callback(),
  sleep: async () => {},
};

function robotsDisallowing(...disallowed: string[]): RobotsResult {
  return {
    isAllowed: (url) => !disallowed.some((path) => url.includes(path)),
    sitemapUrls: [],
  };
}

function page(url: string, internalLinks: string[] = []): StepPageResult {
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

function params(overrides: Partial<Parameters<typeof runCrawlPhase>[1]> = {}) {
  return {
    auditId: "audit-1",
    workflowInstanceId: "wf-1",
    origin: "https://example.com",
    startUrl: "https://example.com/",
    maxPages: 50,
    robots: robotsDisallowing(),
    sitemapUrls: [] as string[],
    ...overrides,
  };
}

beforeEach(() => {
  crawlPageMock.mockResolvedValue(null);
  updateAuditProgressMock.mockResolvedValue(undefined);
  pushCrawledUrlsMock.mockResolvedValue(undefined);
});

describe("runCrawlPhase counts robots-blocked URLs", () => {
  it("counts a blocked page once however many pages link to it", async () => {
    // The defect this exists for: the old `shouldQueueCrawlLink` collapsed
    // "blocked" into "not queued", so the number was unrecoverable. Counting
    // events instead of URLs would be just as wrong — one closed page linked from
    // the nav of forty pages is one closed page.
    crawlPageMock.mockImplementation(async (url: string) => {
      if (url === "https://example.com/") {
        return page(url, [
          "https://example.com/a",
          "https://example.com/admin",
        ]);
      }
      if (url === "https://example.com/a") {
        return page(url, [
          "https://example.com/admin",
          "https://example.com/admin",
        ]);
      }
      return page(url);
    });

    const result = await runCrawlPhase(
      step,
      params({ robots: robotsDisallowing("/admin") }),
    );

    expect(result.blockedUrls).toEqual(["https://example.com/admin"]);
    expect(result.pages.map((p) => p.url)).toEqual([
      "https://example.com/",
      "https://example.com/a",
    ]);
  });

  it("counts a sitemap URL the site then disallows", async () => {
    // A contradiction the site is publishing about itself: advertised in the
    // sitemap, closed in robots.txt. Worth surfacing rather than skipping.
    crawlPageMock.mockImplementation(async (url: string) => page(url));

    const result = await runCrawlPhase(
      step,
      params({
        robots: robotsDisallowing("/private"),
        sitemapUrls: [
          "https://example.com/public",
          "https://example.com/private/one",
          "https://example.com/private/two",
        ],
      }),
    );

    expect(result.blockedUrls.toSorted()).toEqual([
      "https://example.com/private/one",
      "https://example.com/private/two",
    ]);
  });

  it("counts a disallowed start URL, and crawls nothing", async () => {
    const result = await runCrawlPhase(
      step,
      params({
        startUrl: "https://example.com/app",
        robots: robotsDisallowing("/app"),
      }),
    );

    expect(result.blockedUrls).toEqual(["https://example.com/app"]);
    expect(result.pages).toEqual([]);
    expect(crawlPageMock).not.toHaveBeenCalled();
  });

  it("does not count off-origin or already-seen links as blocked", async () => {
    // "Blocked" has to mean "this site is closed to crawlers". An outbound link
    // and a page already in the frontier are the crawl's own bookkeeping.
    crawlPageMock.mockImplementation(async (url: string) => {
      if (url === "https://example.com/") {
        return page(url, [
          "https://elsewhere.example.net/x",
          "https://example.com/",
          "https://example.com/b",
        ]);
      }
      return page(url);
    });

    const result = await runCrawlPhase(step, params());

    expect(result.blockedUrls).toEqual([]);
    expect(result.pages.map((p) => p.url)).toEqual([
      "https://example.com/",
      "https://example.com/b",
    ]);
  });

  it("reports no blocked URLs when robots.txt allows everything", async () => {
    crawlPageMock.mockImplementation(async (url: string) =>
      url === "https://example.com/"
        ? page(url, ["https://example.com/a"])
        : page(url),
    );

    const result = await runCrawlPhase(step, params());

    expect(result.blockedUrls).toEqual([]);
    expect(result.pages).toHaveLength(2);
  });
});
