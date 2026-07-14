import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  safeFetchMock,
  readBoundedTextMock,
  parseLitePageMock,
  fetchRobotsTxtMock,
} = vi.hoisted(() => ({
  safeFetchMock: vi.fn(),
  readBoundedTextMock: vi.fn(),
  parseLitePageMock: vi.fn(),
  fetchRobotsTxtMock: vi.fn(),
}));

vi.mock("./safe-fetch", () => ({
  safeFetch: safeFetchMock,
  readBoundedText: readBoundedTextMock,
}));
vi.mock("./parse-html", () => ({ parseLitePage: parseLitePageMock }));
vi.mock("@/server/lib/audit/discovery", () => ({
  fetchRobotsTxt: fetchRobotsTxtMock,
}));

const { crawlSite } = await import("./crawl");

const PRIMARY = "https://site.test/";

function pageWithLinks(links: string[]) {
  return { internalLinks: links };
}

beforeEach(() => {
  vi.clearAllMocks();
  safeFetchMock.mockImplementation((url: string) =>
    Promise.resolve({ response: { status: 200 }, finalUrl: url }),
  );
  readBoundedTextMock.mockResolvedValue("<html></html>");
  // Only the primary page contributes links; crawled pages return none.
  parseLitePageMock.mockImplementation((_html: string, url: string) =>
    url === PRIMARY
      ? pageWithLinks([
          "/a",
          "/a", // duplicate
          "/b",
          "https://other.test/x", // external
          "/private/secret", // robots-disallowed
          "/c",
        ])
      : pageWithLinks([]),
  );
  fetchRobotsTxtMock.mockResolvedValue({
    isAllowed: (url: string) => !url.includes("/private"),
    sitemapUrls: [],
  });
});

describe("crawlSite", () => {
  it("crawls the primary plus same-origin, robots-allowed internal pages", async () => {
    const result = await crawlSite(PRIMARY);
    const urls = result.pages.map((p) => p.url);
    expect(urls).toEqual([
      PRIMARY,
      "https://site.test/a",
      "https://site.test/b",
      "https://site.test/c",
    ]);
    // external + duplicate + /private were filtered out
    expect(urls).not.toContain("https://other.test/x");
    expect(urls).not.toContain("https://site.test/private/secret");
  });

  it("respects the page cap (primary + cap-1 internal)", async () => {
    const result = await crawlSite(PRIMARY, 3);
    expect(result.pages).toHaveLength(3);
  });

  it("skips an internal page that fails to fetch without failing the crawl", async () => {
    safeFetchMock.mockImplementation((url: string) =>
      url.endsWith("/b")
        ? Promise.reject(new Error("blocked"))
        : Promise.resolve({ response: { status: 200 }, finalUrl: url }),
    );
    const result = await crawlSite(PRIMARY);
    const urls = result.pages.map((p) => p.url);
    expect(urls).toContain("https://site.test/a");
    expect(urls).not.toContain("https://site.test/b");
    expect(urls).toContain("https://site.test/c");
  });

  it("drops an internal link that redirects off-origin", async () => {
    safeFetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        response: { status: 200 },
        // /a hops off-origin via a redirect; the rest stay put.
        finalUrl: url.endsWith("/a") ? "https://evil.test/landing" : url,
      }),
    );
    const result = await crawlSite(PRIMARY);
    const urls = result.pages.map((p) => p.url);
    expect(urls).not.toContain("https://evil.test/landing");
    expect(urls).toContain("https://site.test/b");
    expect(urls).toContain("https://site.test/c");
  });

  it("throws when the primary page cannot be fetched", async () => {
    safeFetchMock.mockRejectedValue(new Error("dns"));
    await expect(crawlSite(PRIMARY)).rejects.toThrow();
  });
});
