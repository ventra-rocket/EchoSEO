import { describe, expect, it } from "vitest";
import { buildSitemapMembership } from "./sitemap-membership";

describe("buildSitemapMembership", () => {
  it("matches an exact sitemap entry", () => {
    const isInSitemap = buildSitemapMembership(["https://a.com/about"]);

    expect(isInSitemap("https://a.com/about")).toBe(true);
    expect(isInSitemap("https://a.com/contact")).toBe(false);
  });

  it("matches when the sitemap lists www but the site canonicalizes to apex", () => {
    const isInSitemap = buildSitemapMembership([
      "https://www.a.com/",
      "https://www.a.com/about",
    ]);

    expect(isInSitemap("https://a.com/")).toBe(true);
    expect(isInSitemap("https://a.com/about")).toBe(true);
  });

  it("matches across an http -> https upgrade", () => {
    const isInSitemap = buildSitemapMembership(["http://a.com/about"]);

    expect(isInSitemap("https://a.com/about")).toBe(true);
  });

  it("ignores a trailing slash difference", () => {
    const isInSitemap = buildSitemapMembership(["https://a.com/about/"]);

    expect(isInSitemap("https://a.com/about")).toBe(true);
  });

  it("treats query order as irrelevant but query content as significant", () => {
    const isInSitemap = buildSitemapMembership(["https://a.com/p?b=2&a=1"]);

    expect(isInSitemap("https://a.com/p?a=1&b=2")).toBe(true);
    expect(isInSitemap("https://a.com/p?a=1")).toBe(false);
  });

  it("does not match a different host or path", () => {
    const isInSitemap = buildSitemapMembership(["https://a.com/about"]);

    expect(isInSitemap("https://b.com/about")).toBe(false);
    expect(isInSitemap("https://shop.a.com/about")).toBe(false);
    expect(isInSitemap("https://a.com/about-us")).toBe(false);
  });

  it("ignores unparseable or non-http entries on both sides", () => {
    const isInSitemap = buildSitemapMembership([
      "not a url",
      "ftp://a.com/x",
      "https://a.com/ok",
    ]);

    expect(isInSitemap("https://a.com/ok")).toBe(true);
    expect(isInSitemap("not a url")).toBe(false);
  });
});
