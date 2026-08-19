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
    crawlDelaySeconds: null,
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
    // Fetching stops the moment the report is full — the remaining valid
    // candidate (/c) is never requested even though the budget had room.
    expect(safeFetchMock).toHaveBeenCalledTimes(3);
  });

  // A run of links that all redirect onto one canonical page used to consume
  // the whole queue: candidates were truncated to the page cap up front, so
  // each duplicate burned a slot and later valid links were never tried.
  it("keeps trying candidates after a duplicate redirect, within the budget", async () => {
    safeFetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        response: { status: 200 },
        finalUrl:
          url.endsWith("/a") || url.endsWith("/b")
            ? "https://site.test/login"
            : url,
      }),
    );
    const result = await crawlSite(PRIMARY, 3);
    // /b's landing duplicated /a's, so /c — beyond the old truncated queue —
    // fills the report instead of the crawl coming home short.
    expect(result.pages.map((p) => p.url)).toEqual([
      PRIMARY,
      "https://site.test/login",
      "https://site.test/c",
    ]);
    expect(safeFetchMock).toHaveBeenCalledTimes(4);
  });

  it("stops at the request budget even when the page cap is not reached", async () => {
    parseLitePageMock.mockImplementation((_html: string, url: string) =>
      url === PRIMARY
        ? pageWithLinks(["/a", "/b", "/c", "/d", "/e"])
        : pageWithLinks([]),
    );
    // Every internal link redirects onto one page: each fetch is spent on a
    // duplicate, and the crawl must give up at the hard request ceiling
    // (2 × (cap − 1) internal fetches) instead of chasing candidates until
    // the report fills.
    safeFetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        response: { status: 200 },
        finalUrl: url === PRIMARY ? url : "https://site.test/login",
      }),
    );
    const result = await crawlSite(PRIMARY, 3);
    expect(result.pages.map((p) => p.url)).toEqual([
      PRIMARY,
      "https://site.test/login",
    ]);
    // Primary + 4 internal attempts; /e was never fetched.
    expect(safeFetchMock).toHaveBeenCalledTimes(5);
    expect(safeFetchMock).not.toHaveBeenCalledWith("https://site.test/e");
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

  // The queue dedupes links as written, but pages are stored under the URL
  // they land on — two different links redirecting to one destination (e.g.
  // /dashboard and /login both ending at the login screen) must not produce
  // the same page twice in the report.
  it("keeps one page when two queued links redirect to the same final URL", async () => {
    safeFetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        response: { status: 200 },
        finalUrl:
          url.endsWith("/a") || url.endsWith("/b")
            ? "https://site.test/login"
            : url,
      }),
    );
    const result = await crawlSite(PRIMARY);
    const urls = result.pages.map((p) => p.url);
    expect(urls).toEqual([
      PRIMARY,
      "https://site.test/login",
      "https://site.test/c",
    ]);
    // Both redirect sources are preserved on the kept page — "these links all
    // land here" is real SEO information the dedupe must not discard.
    const login = result.pages.find((p) => p.url === "https://site.test/login");
    expect(login?.redirectedFrom).toEqual([
      "https://site.test/a",
      "https://site.test/b",
    ]);
    // A page reached only at its own address carries no redirect sources.
    const plain = result.pages.find((p) => p.url === "https://site.test/c");
    expect(plain?.redirectedFrom).toBeUndefined();
  });

  it("does not duplicate the primary when a link redirects back to it", async () => {
    safeFetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        response: { status: 200 },
        finalUrl: url.endsWith("/a") ? PRIMARY : url,
      }),
    );
    const result = await crawlSite(PRIMARY);
    const urls = result.pages.map((p) => p.url);
    expect(urls).toEqual([
      PRIMARY,
      "https://site.test/b",
      "https://site.test/c",
    ]);
    expect(result.pages[0]?.redirectedFrom).toEqual(["https://site.test/a"]);
  });

  it("collapses final URLs that differ only in query order", async () => {
    safeFetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        response: { status: 200 },
        finalUrl: url.endsWith("/a")
          ? "https://site.test/login?b=2&a=1"
          : url.endsWith("/b")
            ? "https://site.test/login?a=1&b=2"
            : url,
      }),
    );
    const result = await crawlSite(PRIMARY);
    const urls = result.pages.map((p) => p.url);
    // One page, stored under the first raw landing; both sources recorded.
    expect(urls).toEqual([
      PRIMARY,
      "https://site.test/login?b=2&a=1",
      "https://site.test/c",
    ]);
    const login = result.pages.find((p) =>
      p.url.startsWith("https://site.test/login"),
    );
    expect(login?.redirectedFrom).toEqual([
      "https://site.test/a",
      "https://site.test/b",
    ]);
    // The raw landing is display identity only; the stable identity rides
    // alongside it in the canonical form the dedupe keyed by.
    expect(login?.normalizedUrl).toBe("https://site.test/login?a=1&b=2");
  });

  it("drops a same-origin redirect that lands on a robots-Disallow path", async () => {
    safeFetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        response: { status: 200 },
        // /a redirects onto a Disallow path the pre-fetch check never saw.
        finalUrl: url.endsWith("/a") ? "https://site.test/private/secret" : url,
      }),
    );
    const result = await crawlSite(PRIMARY);
    const urls = result.pages.map((p) => p.url);
    expect(urls).not.toContain("https://site.test/private/secret");
    expect(urls).toContain("https://site.test/b");
    expect(urls).toContain("https://site.test/c");
  });

  it("throws when the primary page cannot be fetched", async () => {
    safeFetchMock.mockRejectedValue(new Error("dns"));
    await expect(crawlSite(PRIMARY)).rejects.toThrow();
  });

  // An unresolvable host answers with Cloudflare's error page rather than
  // throwing, so a body alone does not mean we reached the site.
  it("throws when the primary page answers non-2xx", async () => {
    safeFetchMock.mockImplementation((url: string) =>
      Promise.resolve({ response: { status: 530 }, finalUrl: url }),
    );
    await expect(crawlSite(PRIMARY)).rejects.toThrow(
      "Could not fetch the target page",
    );
  });

  // An auth-gated site 302s the primary page to a login screen that answers
  // 2xx; auditing it would score the login page, not the site.
  it("throws when the primary page redirects to an auth interstitial", async () => {
    safeFetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        response: { status: 200 },
        finalUrl:
          url === PRIMARY
            ? "https://team.cloudflareaccess.com/cdn-cgi/access/login/site.test"
            : url,
      }),
    );
    await expect(crawlSite(PRIMARY)).rejects.toThrow(
      "Target redirected to an auth interstitial",
    );
  });

  // The mirror of the rule above: only the primary page feeds the headline
  // score, so a broken internal URL stays in the report as a finding.
  it("keeps a non-2xx internal page in the crawl as a finding", async () => {
    safeFetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        response: { status: url.endsWith("/b") ? 404 : 200 },
        finalUrl: url,
      }),
    );
    const result = await crawlSite(PRIMARY);
    const broken = result.pages.find((p) => p.url === "https://site.test/b");
    expect(broken?.statusCode).toBe(404);
  });
});
