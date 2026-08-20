/**
 * The live progress channel. It has to answer "is this working?" during the two
 * stretches where the D1 row alone cannot: discovery, when no page exists yet, and
 * a long crawl, where a still progress bar and a stalled crawl look identical.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { kvGetMock, kvPutMock, kvDeleteMock } = vi.hoisted(() => ({
  kvGetMock: vi.fn<(key: string, type: "text") => Promise<string | null>>(),
  kvPutMock:
    vi.fn<(key: string, value: string, options?: unknown) => Promise<void>>(),
  kvDeleteMock: vi.fn<(key: string) => Promise<void>>(),
}));
vi.mock("cloudflare:workers", () => ({
  env: { KV: { get: kvGetMock, put: kvPutMock, delete: kvDeleteMock } },
}));

// Dynamic import: the module binds `env` from `cloudflare:workers` at load time,
// so it must not be evaluated until the mock above is installed.
const { AuditProgressKV } = await import("./progress-kv");

/** The value the last `put` wrote, as the next `get` would return it. */
function lastWrite(): string {
  const calls = kvPutMock.mock.calls;
  return calls[calls.length - 1]?.[1] ?? "";
}

describe("AuditProgressKV", () => {
  beforeEach(() => {
    kvGetMock.mockReset();
    kvGetMock.mockResolvedValue(null);
    kvPutMock.mockReset();
    kvPutMock.mockResolvedValue(undefined);
    kvDeleteMock.mockReset();
    kvDeleteMock.mockResolvedValue(undefined);
  });

  it("reports discovery before any page has been crawled", async () => {
    await AuditProgressKV.setPhase("a1", {
      stage: "discovering",
      sitemapDocsFetched: 2,
      discoveredUrls: 41_505,
    });

    kvGetMock.mockResolvedValue(lastWrite());
    const progress = await AuditProgressKV.getProgress("a1");

    expect(progress.entries).toEqual([]);
    expect(progress.phase).toMatchObject({
      stage: "discovering",
      sitemapDocsFetched: 2,
      discoveredUrls: 41_505,
    });
  });

  it("prepends new pages, keeps failures, and refreshes the frontier", async () => {
    await AuditProgressKV.pushCrawledUrls(
      "a1",
      [{ url: "https://a.com/1", statusCode: 200, title: "One", crawledAt: 1 }],
      { visited: 1, queued: 40 },
    );
    kvGetMock.mockResolvedValue(lastWrite());

    // A 404 is progress, not noise: it is how a user judges whether the crawl is
    // going to produce anything useful.
    await AuditProgressKV.pushCrawledUrls(
      "a1",
      [{ url: "https://a.com/2", statusCode: 404, title: "", crawledAt: 2 }],
      { visited: 2, queued: 39 },
    );
    kvGetMock.mockResolvedValue(lastWrite());

    const progress = await AuditProgressKV.getProgress("a1");

    expect(progress.entries.map((entry) => entry.url)).toEqual([
      "https://a.com/2",
      "https://a.com/1",
    ]);
    expect(progress.entries[0]?.statusCode).toBe(404);
    expect(progress.phase).toMatchObject({
      stage: "crawling",
      visited: 2,
      queued: 39,
    });
  });

  it("caps the feed so a 5,000-page crawl cannot grow the value without bound", async () => {
    const entries = Array.from({ length: 400 }, (_, i) => ({
      url: `https://a.com/${i}`,
      statusCode: 200,
      title: "",
      crawledAt: i,
    }));

    await AuditProgressKV.pushCrawledUrls("a1", entries);
    kvGetMock.mockResolvedValue(lastWrite());

    expect((await AuditProgressKV.getProgress("a1")).entries).toHaveLength(300);
  });

  it("treats an unreadable value as absent instead of rendering garbage", async () => {
    kvGetMock.mockResolvedValue("not json");

    expect(await AuditProgressKV.getProgress("a1")).toEqual({
      phase: null,
      entries: [],
    });
  });

  it("writes nothing when a batch carries neither pages nor a frontier", async () => {
    await AuditProgressKV.pushCrawledUrls("a1", []);

    expect(kvPutMock).not.toHaveBeenCalled();
  });

  it("carries the live pacing so a running crawl shows its rate and refusals", async () => {
    // #88: with a partial refusal no longer hibernating, the live feed is where
    // "settled at half the tolerance" and "settled at the ceiling" stop looking
    // identical.
    await AuditProgressKV.pushCrawledUrls(
      "a1",
      [{ url: "https://a.com/1", statusCode: 200, title: "One", crawledAt: 1 }],
      {
        visited: 1,
        queued: 40,
        offeredRate: 2.5,
        refusedRequests: 84,
        congestedBatches: 3,
      },
    );
    kvGetMock.mockResolvedValue(lastWrite());

    const progress = await AuditProgressKV.getProgress("a1");
    expect(progress.phase).toMatchObject({
      offeredRate: 2.5,
      refusedRequests: 84,
      congestedBatches: 3,
    });
  });

  it("still parses a stored payload written before pacing existed", async () => {
    // The additive fields are optional: a crawl mid-flight when this deploys has
    // a phase without them, and it must not blank the whole feed.
    kvGetMock.mockResolvedValue(
      JSON.stringify({
        phase: { stage: "crawling", visited: 10, queued: 5, updatedAt: 1 },
        entries: [],
      }),
    );

    const progress = await AuditProgressKV.getProgress("a1");
    expect(progress.phase).toMatchObject({ stage: "crawling", visited: 10 });
    expect(progress.phase?.offeredRate).toBeUndefined();
  });
});
