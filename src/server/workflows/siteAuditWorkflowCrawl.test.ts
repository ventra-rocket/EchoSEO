import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RobotsResult } from "@/server/lib/audit/discovery";
import type { StepPageResult } from "@/server/lib/audit/types";

const { crawlPageMock, updateAuditProgressMock, pushCrawledUrlsMock } =
  vi.hoisted(() => ({
    crawlPageMock: vi.fn(),
    updateAuditProgressMock: vi.fn(),
    // Typed so assertions on the live feed read the real entry shape instead of
    // asserting their way out of `any`.
    pushCrawledUrlsMock:
      vi.fn<
        (
          auditId: string,
          entries: Array<{ url: string; statusCode: number; title: string }>,
          frontier: { visited: number; queued: number },
        ) => Promise<void>
      >(),
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

function throttledPage(url: string, retryAfterMs: number | null = null) {
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

/**
 * A step runner that records what the loop asked for: the size of each crawl
 * batch and every sleep it took. Batch size is the observable form of the
 * adaptive rate, and the sleeps are the politeness itself.
 */
function recordingStep() {
  const batchSizes: number[] = [];
  const sleeps: Array<{ name: string; duration: string }> = [];
  return {
    batchSizes,
    sleeps,
    step: {
      do: async <T>(
        name: string,
        callback: () => Promise<T> | T,
      ): Promise<T> => {
        const before = crawlPageMock.mock.calls.length;
        const result = await callback();
        if (name.startsWith("crawl-batch-")) {
          batchSizes.push(crawlPageMock.mock.calls.length - before);
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

/** `n` same-origin sitemap URLs, so a batch can be filled without link discovery. */
function sitemapUrls(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `https://example.com/p${i}`);
}

describe("runCrawlPhase treats a 429 as our problem, not the page's", () => {
  it("retries a throttled URL instead of recording it as a page", async () => {
    // The reported bug: 1,894 of 5,000 pages recorded as 429 and reported as the
    // site's broken pages. A refusal is not an observation, so the URL goes back
    // on the queue and only the real answer is kept.
    const attempts = new Map<string, number>();
    crawlPageMock.mockImplementation(async (url: string) => {
      const seen = (attempts.get(url) ?? 0) + 1;
      attempts.set(url, seen);
      if (url.endsWith("/a") && seen === 1) return throttledPage(url);
      return page(url);
    });
    const { step: recorder } = recordingStep();

    const result = await runCrawlPhase(recorder, {
      ...params(),
      sitemapUrls: ["https://example.com/a"],
    });

    expect(attempts.get("https://example.com/a")).toBe(2);
    expect(result.pages.map((p) => p.statusCode)).toEqual([200, 200]);
  });

  it("slows down and hibernates after a throttled batch", async () => {
    crawlPageMock.mockImplementation(async (url: string) => throttledPage(url));
    const { step: recorder, batchSizes, sleeps } = recordingStep();

    await runCrawlPhase(recorder, {
      ...params({ maxPages: 200 }),
      sitemapUrls: sitemapUrls(40),
    });

    // 25 at a time until the site refuses, then halved for the retry.
    expect(batchSizes[0]).toBe(25);
    expect(batchSizes[1]).toBe(12);
    expect(batchSizes[2]).toBe(6);
    // Exponential while the refusals continue, since a 429 usually carries no
    // Retry-After to follow.
    expect(sleeps[0]).toEqual({
      name: "throttle-backoff-1",
      duration: "5 seconds",
    });
    expect(sleeps[1]?.duration).toBe("10 seconds");
    expect(sleeps[2]?.duration).toBe("20 seconds");
  });

  it("climbs back one request at a time, not by doubling", async () => {
    // Doubling was measured overshooting: it sprinted back into the site's limit,
    // lost a whole refused window each time, and a real 5,000-page crawl averaged
    // an effective concurrency of 4.5 out of 25. Additive increase settles just
    // under the limit instead.
    const seen = new Set<string>();
    crawlPageMock.mockImplementation(async (url: string) => {
      if (!seen.has(url)) {
        seen.add(url);
        return throttledPage(url);
      }
      return page(url);
    });
    const { step: recorder, batchSizes } = recordingStep();

    await runCrawlPhase(recorder, {
      ...params({ maxPages: 200 }),
      sitemapUrls: sitemapUrls(80),
    });

    // 25 refused → halved to 12, then +1 per clean batch. Doubling would read
    // 12, 24 here.
    expect(batchSizes.slice(0, 4)).toEqual([25, 12, 13, 14]);
  });

  it("hibernates on measured page cost, not every fifth batch", async () => {
    // 6.0 ms/page of parse against a 30 s per-invocation budget: the old cadence
    // slept every 125 pages, which cost 6.7 minutes of a 47-minute crawl to
    // protect a budget that was never close.
    crawlPageMock.mockImplementation(async (url: string) => page(url));
    const { step: recorder, sleeps } = recordingStep();

    await runCrawlPhase(recorder, {
      ...params({ maxPages: 600 }),
      sitemapUrls: sitemapUrls(600),
    });

    const breaks = sleeps.filter((s) => s.name.startsWith("cpu-budget-break-"));
    expect(breaks).toHaveLength(1);
  });

  it("does not hibernate at all on a crawl below the measured budget", async () => {
    crawlPageMock.mockImplementation(async (url: string) => page(url));
    const { step: recorder, sleeps } = recordingStep();

    await runCrawlPhase(recorder, {
      ...params({ maxPages: 400 }),
      sitemapUrls: sitemapUrls(400),
    });

    expect(sleeps).toEqual([]);
  });

  it("retries a dropped connection without slowing the whole crawl down", async () => {
    // A dead URL among 25 live ones is one dead URL, not congestion. It is still
    // retried — a finding that says "no response on any attempt" has to be true.
    const seen = new Set<string>();
    crawlPageMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/p0") && !seen.has(url)) {
        seen.add(url);
        return { ...throttledPage(url), statusCode: 0 };
      }
      return page(url);
    });
    const { step: recorder, sleeps, batchSizes } = recordingStep();

    const result = await runCrawlPhase(recorder, {
      ...params({ maxPages: 200 }),
      sitemapUrls: sitemapUrls(80),
    });

    expect(sleeps).toEqual([]);
    // Still at the configured rate: a lone dead URL never halved it. Enough URLs
    // are queued that the batch size reflects the rate, not an emptying queue.
    expect(batchSizes[1]).toBe(25);
    expect(result.pages.every((p) => p.statusCode === 200)).toBe(true);
  });

  it("slows down when dropped connections take most of the batch", async () => {
    // The measured case: 1,210 of 5,000 requests died with no status and no 429
    // anywhere to explain them. That is our own load, and it has to read as one.
    crawlPageMock.mockImplementation(async (url: string) => ({
      ...throttledPage(url),
      statusCode: 0,
    }));
    const { step: recorder, batchSizes, sleeps } = recordingStep();

    await runCrawlPhase(recorder, {
      ...params({ maxPages: 200 }),
      sitemapUrls: sitemapUrls(40),
    });

    expect(batchSizes[0]).toBe(25);
    expect(batchSizes[1]).toBe(12);
    expect(sleeps[0]?.name).toBe("throttle-backoff-1");
  });

  it("records the status a URL kept returning once it stops retrying", async () => {
    crawlPageMock.mockImplementation(async (url: string) =>
      url === "https://example.com/"
        ? page(url)
        : { ...throttledPage(url), statusCode: 0 },
    );
    const { step: recorder } = recordingStep();

    const result = await runCrawlPhase(recorder, {
      ...params(),
      sitemapUrls: ["https://example.com/a"],
    });

    // Still reported as unreachable — but now only after three failures, which is
    // what makes `audit-unreachable-url` a claim rather than a guess.
    const unreachable = result.pages.filter((p) => p.statusCode === 0);
    expect(unreachable).toHaveLength(1);
    expect(
      crawlPageMock.mock.calls.filter(
        (call) => call[0] === "https://example.com/a",
      ),
    ).toHaveLength(3);
  });

  it("treats a 503 as the server asking for a slower crawl", async () => {
    // 503 is the canonical overload response and the one usually paired with
    // Retry-After, so one is enough to act on — unlike a bare dropped connection.
    crawlPageMock.mockImplementation(async (url: string) =>
      url.endsWith("/p0")
        ? { ...throttledPage(url, 4_000), statusCode: 503 }
        : page(url),
    );
    const { step: recorder, sleeps, batchSizes } = recordingStep();

    await runCrawlPhase(recorder, {
      ...params({ maxPages: 60 }),
      sitemapUrls: sitemapUrls(40),
    });

    expect(batchSizes[1]).toBe(12);
    expect(sleeps[0]?.duration).toBe("4 seconds");
  });

  it("waits exactly as long as a Retry-After header asked", async () => {
    crawlPageMock.mockImplementation(async (url: string) =>
      url === "https://example.com/" ? page(url) : throttledPage(url, 7_000),
    );
    const { step: recorder, sleeps } = recordingStep();

    await runCrawlPhase(recorder, {
      ...params(),
      sitemapUrls: ["https://example.com/a"],
    });

    expect(sleeps[0]?.duration).toBe("7 seconds");
  });

  it("records a page as throttled once it stops retrying, and terminates", async () => {
    // The crawl has to end. A URL that is refused every time is reported as
    // throttled rather than retried forever or dropped without trace.
    crawlPageMock.mockImplementation(async (url: string) =>
      url === "https://example.com/" ? page(url) : throttledPage(url),
    );
    const { step: recorder } = recordingStep();

    const result = await runCrawlPhase(recorder, {
      ...params(),
      sitemapUrls: ["https://example.com/a"],
    });

    const throttled = result.pages.filter((p) => p.statusCode === 429);
    expect(throttled).toHaveLength(1);
    expect(throttled[0]?.url).toBe("https://example.com/a");
    expect(
      crawlPageMock.mock.calls.filter(
        (call) => call[0] === "https://example.com/a",
      ),
    ).toHaveLength(3);
  });

  it("shows the refusals in the live feed rather than hiding the retry", async () => {
    // The live page feed is how this defect was found; a silent retry would have
    // made the crawl look merely slow.
    let first = true;
    crawlPageMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/a") && first) {
        first = false;
        return throttledPage(url);
      }
      return page(url);
    });
    const { step: recorder } = recordingStep();

    await runCrawlPhase(recorder, {
      ...params(),
      sitemapUrls: ["https://example.com/a"],
    });

    const pushed = pushCrawledUrlsMock.mock.calls.flatMap((call) => call[1]);
    expect(pushed.filter((entry) => entry.statusCode === 429)).toHaveLength(1);
  });
});
