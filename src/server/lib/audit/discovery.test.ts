import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchRobotsTxtBody,
  parseRobotsTxt,
  type RobotsTxtBody,
} from "./discovery";

/**
 * The crawler's allow decisions have to survive a Workflow replay.
 *
 * `RobotsResult` carries a closure, so it can never be a step return; the body
 * can. These tests pin the two halves of that split: the fetch reduces every
 * failure to `text: null`, and the parse is a pure function of the body — which
 * is what makes a replayed crawl reach the same decisions as the original.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response | Error) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (response instanceof Error) throw response;
      return response;
    }),
  );
}

describe("fetchRobotsTxtBody", () => {
  it("returns the body verbatim, with the URL it must be parsed against", async () => {
    // `robots-parser` resolves relative rules against this URL, so the body
    // alone is not enough to reproduce the matcher.
    stubFetch(
      new Response("User-agent: *\nDisallow: /admin\n", { status: 200 }),
    );

    await expect(fetchRobotsTxtBody("https://example.com")).resolves.toEqual({
      robotsUrl: "https://example.com/robots.txt",
      text: "User-agent: *\nDisallow: /admin\n",
      status: 200,
    });
  });

  it("reduces a missing robots.txt to text: null", async () => {
    stubFetch(new Response("Not found", { status: 404 }));

    const body = await fetchRobotsTxtBody("https://example.com");

    expect(body.text).toBeNull();
    // Serializable, so a Workflow step can cache it — the whole point of the
    // split. A `RobotsResult` here would throw on the step return instead.
    expect(JSON.parse(JSON.stringify(body))).toEqual(body);
  });

  it("distinguishes an unavailable robots.txt from an unreachable one", async () => {
    // A crawl must not fail because robots.txt timed out. But the two cases are
    // not the same fact and RFC 9309 treats them oppositely — 4xx means there
    // are no rules, no response means rules may exist and cannot be read — so
    // the status travels with the body and each caller decides. Our own crawl
    // stays permissive; the competitor crawl refuses.
    stubFetch(new Error("connect ETIMEDOUT"));

    await expect(fetchRobotsTxtBody("https://example.com")).resolves.toEqual({
      robotsUrl: "https://example.com/robots.txt",
      text: null,
      status: null,
    });
  });

  it("reports the status of a served error", async () => {
    stubFetch(new Response("upstream down", { status: 503 }));

    await expect(fetchRobotsTxtBody("https://example.com")).resolves.toEqual({
      robotsUrl: "https://example.com/robots.txt",
      text: null,
      status: 503,
    });
  });
});

describe("parseRobotsTxt", () => {
  const body: RobotsTxtBody = {
    robotsUrl: "https://example.com/robots.txt",
    status: 200,
    text: [
      "User-agent: *",
      "Disallow: /admin",
      "Disallow: /cart",
      "Sitemap: https://example.com/sitemap.xml",
      "Sitemap: https://example.com/news-sitemap.xml",
    ].join("\n"),
  };

  it("applies the disallow rules and reports the sitemaps", () => {
    const robots = parseRobotsTxt(body);

    expect(robots.isAllowed("https://example.com/")).toBe(true);
    expect(robots.isAllowed("https://example.com/pricing")).toBe(true);
    expect(robots.isAllowed("https://example.com/admin")).toBe(false);
    expect(robots.isAllowed("https://example.com/cart/checkout")).toBe(false);
    expect(robots.sitemapUrls).toEqual([
      "https://example.com/sitemap.xml",
      "https://example.com/news-sitemap.xml",
    ]);
  });

  it("agrees with itself across calls, so a replay decides identically", () => {
    // The property the whole split exists for. If this ever diverges, a Workflow
    // retry can crawl a different set of pages than the run it is replaying —
    // and a "blocked by robots" counter built on it would be a lie.
    const urls = [
      "https://example.com/",
      "https://example.com/admin",
      "https://example.com/admin/users",
      "https://example.com/cart",
      "https://example.com/blog/post",
    ];

    const first = parseRobotsTxt(body);
    const second = parseRobotsTxt(body);

    expect(urls.map((url) => second.isAllowed(url))).toEqual(
      urls.map((url) => first.isAllowed(url)),
    );
  });

  it("allows everything when there is no robots.txt", () => {
    const robots = parseRobotsTxt({
      robotsUrl: "https://example.com/robots.txt",
      text: null,
      status: 404,
    });

    expect(robots.isAllowed("https://example.com/admin")).toBe(true);
    expect(robots.sitemapUrls).toEqual([]);
  });

  it("allows a URL no rule covers rather than defaulting to deny", () => {
    // `robots-parser` returns undefined for an unmatched path; reading that as
    // "blocked" would silently empty a crawl.
    const robots = parseRobotsTxt({
      robotsUrl: "https://example.com/robots.txt",
      text: "User-agent: Googlebot-News\nDisallow: /\n",
      status: 200,
    });

    expect(robots.isAllowed("https://example.com/anything")).toBe(true);
  });
});
