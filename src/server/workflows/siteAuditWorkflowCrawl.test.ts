import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  crawlParams as params,
  page,
  recordingStep as recorderFor,
  robotsDisallowing,
  sitemapUrls,
  throttledPage,
} from "./__tests__/crawl-fixtures";

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

const recordingStep = () => recorderFor(crawlPageMock);

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

  it("spaces the requests inside a batch instead of firing them at once", async () => {
    // The mismatch this fixes: the crawl controls a rate, the site meters one.
    // A batch fired at once offers an unbounded instantaneous rate whatever the
    // average works out to — which is how a crawl averaging 1.88 req/s against a
    // site that gives 3-4 still collected 36 refusals.
    crawlPageMock.mockImplementation(async (url: string) => page(url));
    const recorder = recordingStep();

    await runCrawlPhase(recorder.step, {
      ...params({ maxPages: 60 }),
      sitemapUrls: sitemapUrls(40),
      waitMs: recorder.waitMs,
    });

    // 3 req/s to start: each request waits its own offset from the start of the
    // batch, so one slow response cannot turn the crawl serial.
    expect(recorder.waitsByBatch[0]?.slice(0, 3)).toEqual([333, 666, 999]);
  });

  it("gives up a quarter of the rate on a refused batch, and climbs back a step at a time", async () => {
    // Halving plus an escalating sleep paid a minute of hibernation for a limit
    // measured to recover in five seconds, and left the crawl far below the rate
    // the site was willing to serve.
    let refusals = 0;
    crawlPageMock.mockImplementation(async (url: string) => {
      refusals += 1;
      return refusals <= 25 ? throttledPage(url) : page(url);
    });
    const recorder = recordingStep();

    await runCrawlPhase(recorder.step, {
      ...params({ maxPages: 200 }),
      sitemapUrls: sitemapUrls(80),
      waitMs: recorder.waitMs,
    });

    // 3 req/s refused → 2.25, then +0.25 per clean batch, held under the 2.7 the
    // refusal established as a ceiling. A halving would read 889 ms here.
    expect(recorder.intervals.slice(0, 4)).toEqual([333, 444, 400, 369]);
  });

  it("keeps the batch at 25 URLs, because the pacing moves instead", async () => {
    // A Workflow instance is capped at 1,024 steps and a 5,000-page crawl already
    // spends ~645. Pacing by shrinking the batch would run a large crawl out of
    // steps before it ran out of pages.
    crawlPageMock.mockImplementation(async (url: string) => throttledPage(url));
    const recorder = recordingStep();

    await runCrawlPhase(recorder.step, {
      ...params({ maxPages: 200 }),
      sitemapUrls: sitemapUrls(40),
      waitMs: recorder.waitMs,
    });

    expect(recorder.batchSizes.slice(0, 3)).toEqual([25, 25, 25]);
    expect(recorder.intervals.slice(0, 3)).toEqual([333, 444, 593]);
    // Escalates only while the refusals continue, since a 429 usually carries no
    // Retry-After to follow.
    expect(recorder.sleeps[0]).toEqual({
      name: "throttle-backoff-1",
      duration: "5 seconds",
    });
    expect(recorder.sleeps[1]?.duration).toBe("10 seconds");
    expect(recorder.sleeps[2]?.duration).toBe("20 seconds");
  });

  it("honours a published Crawl-delay instead of discovering the limit", async () => {
    // A site owner who knows their own limit should be able to tell us, rather
    // than have us find it by tripping over it.
    crawlPageMock.mockImplementation(async (url: string) => page(url));
    const recorder = recordingStep();

    await runCrawlPhase(recorder.step, {
      ...params({
        maxPages: 60,
        robots: { ...robotsDisallowing(), crawlDelaySeconds: 2 },
      }),
      sitemapUrls: sitemapUrls(40),
      waitMs: recorder.waitMs,
    });

    // One request every two seconds, and clean batches never climb past it.
    expect(recorder.intervals.slice(0, 2)).toEqual([2_000, 2_000]);
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
    const recorder = recordingStep();

    const result = await runCrawlPhase(recorder.step, {
      ...params({ maxPages: 200 }),
      sitemapUrls: sitemapUrls(80),
      waitMs: recorder.waitMs,
    });

    expect(recorder.sleeps).toEqual([]);
    // A lone dead URL never cost the crawl any rate: the second batch is paced
    // faster than the first, because the first read as clean.
    expect(recorder.intervals[1]).toBe(308);
    expect(result.pages.every((p) => p.statusCode === 200)).toBe(true);
  });

  it("slows down when dropped connections take most of the batch", async () => {
    // The measured case: 1,210 of 5,000 requests died with no status and no 429
    // anywhere to explain them. That is our own load, and it has to read as one.
    crawlPageMock.mockImplementation(async (url: string) => ({
      ...throttledPage(url),
      statusCode: 0,
    }));
    const recorder = recordingStep();

    await runCrawlPhase(recorder.step, {
      ...params({ maxPages: 200 }),
      sitemapUrls: sitemapUrls(40),
      waitMs: recorder.waitMs,
    });

    expect(recorder.intervals.slice(0, 2)).toEqual([333, 444]);
    expect(recorder.sleeps[0]?.name).toBe("throttle-backoff-1");
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
    const recorder = recordingStep();

    await runCrawlPhase(recorder.step, {
      ...params({ maxPages: 60 }),
      sitemapUrls: sitemapUrls(40),
      waitMs: recorder.waitMs,
    });

    expect(recorder.intervals[1]).toBe(444);
    expect(recorder.sleeps[0]?.duration).toBe("4 seconds");
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
