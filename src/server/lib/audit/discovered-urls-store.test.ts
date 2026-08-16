/**
 * The sitemap URL set is the payload that used to kill audits by crossing a
 * Workflow step boundary. Two contracts matter here:
 *
 *  - a set survives the round trip intact, because every crawled page is judged
 *    against it and a lost tail becomes false "missing from sitemap" warnings;
 *  - absence reads as `null` ("no sitemap evidence"), never as an empty set,
 *    because the empty set is the shape that manufactures those warnings.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { r2PutMock, r2GetMock, r2DeleteMock } = vi.hoisted(() => ({
  r2PutMock: vi.fn<(key: string, body: string) => Promise<void>>(),
  r2GetMock:
    vi.fn<(key: string) => Promise<{ text: () => Promise<string> } | null>>(),
  r2DeleteMock: vi.fn<(keys: string[]) => Promise<void>>(),
}));
vi.mock("cloudflare:workers", () => ({
  env: { R2: { put: r2PutMock, get: r2GetMock, delete: r2DeleteMock } },
}));

// Dynamic import: the module binds `env` from `cloudflare:workers` at load time,
// so it must not be evaluated until the mock above is installed.
const {
  putDiscoveredUrls,
  getDiscoveredUrls,
  deleteDiscoveredUrls,
  discoveredUrlsKey,
} = await import("./discovered-urls-store");

function storedObject(body: string) {
  return { text: async () => body };
}

describe("discovered URL storage", () => {
  beforeEach(() => {
    r2PutMock.mockReset();
    r2PutMock.mockResolvedValue(undefined);
    r2GetMock.mockReset();
    r2DeleteMock.mockReset();
    r2DeleteMock.mockResolvedValue(undefined);
  });

  it("round-trips the whole set under the audit's own key", async () => {
    const urls = Array.from(
      { length: 5_000 },
      (_, i) => `https://a.com/p/${i}`,
    );

    const written = await putDiscoveredUrls("audit1", urls);
    expect(written).toEqual({
      key: discoveredUrlsKey("audit1"),
      count: 5_000,
    });

    const body = r2PutMock.mock.calls[0]?.[1] ?? "";
    r2GetMock.mockResolvedValue(storedObject(body));

    expect(await getDiscoveredUrls("audit1")).toEqual(urls);
  });

  it("reports a missing object as no evidence rather than an empty sitemap", async () => {
    r2GetMock.mockResolvedValue(null);

    expect(await getDiscoveredUrls("audit1")).toBeNull();
  });

  it("reports an unreadable object as no evidence", async () => {
    // A shape from a future (or corrupted) writer must not read as "listed
    // nowhere", which would warn on every page the crawl visited.
    r2GetMock.mockResolvedValue(storedObject('{"version":99,"urls":[]}'));
    expect(await getDiscoveredUrls("audit1")).toBeNull();

    r2GetMock.mockResolvedValue(storedObject("not json"));
    expect(await getDiscoveredUrls("audit1")).toBeNull();
  });

  it("deletes by audit id, chunks under R2's cap, and never throws", async () => {
    const auditIds = Array.from({ length: 1_001 }, (_, i) => `a${i}`);
    r2DeleteMock.mockRejectedValueOnce(new Error("r2 down"));

    const failed = await deleteDiscoveredUrls(auditIds);

    expect(r2DeleteMock).toHaveBeenCalledTimes(2);
    expect(failed).toHaveLength(1_000);
    expect(failed).toContain(discoveredUrlsKey("a0"));
  });
});
