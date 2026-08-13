import { describe, expect, it } from "vitest";
import { originMatchesGscSiteUrl } from "@/server/features/audit/authz/target-verification";
import { planGscSiteTarget } from "./gsc-site-import";

/**
 * The mapping's one load-bearing property, asserted against the REAL verification
 * matcher rather than a restatement of its rules: an imported target whose origin
 * the property cannot prove is a target whose large hosted crawls get refused,
 * and nothing surfaces that until someone launches one.
 */
describe("planGscSiteTarget keeps the origin provable by its property", () => {
  it.each([
    "sc-domain:example.com",
    "sc-domain:EXAMPLE.com",
    "https://example.com/",
    "https://www.example.com/",
    "http://legacy.example.com/",
    "https://example.com/shop/",
    "https://example.co.uk/",
  ])("%s verifies the origin it maps to", (siteUrl) => {
    const plan = planGscSiteTarget(siteUrl);
    expect(plan, siteUrl).not.toBeNull();
    if (!plan) return;
    expect(
      originMatchesGscSiteUrl(plan.origin, plan.siteUrl),
      plan.origin,
    ).toBe(true);
  });
});

describe("planGscSiteTarget", () => {
  it("maps a domain property to its https origin and bare host", () => {
    // A domain property covers every subdomain and both schemes, so there is no
    // URL in it to reuse — one has to be chosen, and https is what a site is
    // expected to serve.
    expect(planGscSiteTarget("sc-domain:example.com")).toEqual({
      siteUrl: "sc-domain:example.com",
      kind: "domain",
      origin: "https://example.com",
      host: "example.com",
      droppedPath: null,
    });
  });

  it("lower-cases a domain property's host", () => {
    const plan = planGscSiteTarget("sc-domain:EXAMPLE.COM");
    expect(plan?.host).toBe("example.com");
    expect(plan?.origin).toBe("https://example.com");
  });

  it("keeps a URL-prefix property's own subdomain rather than the bare domain", () => {
    // `www` is a different property from the apex in Search Console, and a
    // different site to crawl. Collapsing them would audit a host the user never
    // asked about.
    expect(planGscSiteTarget("https://www.example.com/")).toEqual({
      siteUrl: "https://www.example.com/",
      kind: "url_prefix",
      origin: "https://www.example.com",
      host: "www.example.com",
      droppedPath: null,
    });
  });

  it("keeps a URL-prefix property's scheme instead of upgrading it", () => {
    // The silent bug this exists to prevent: `originMatchesGscSiteUrl` compares
    // protocol exactly for a URL-prefix property, so an http property rewritten
    // to https produces a target the verification gate refuses.
    const plan = planGscSiteTarget("http://example.com/");
    expect(plan?.origin).toBe("http://example.com");
    expect(
      originMatchesGscSiteUrl("https://example.com", "http://example.com/"),
    ).toBe(false);
  });

  it("reports the path a scoped property loses to the crawl origin", () => {
    // The crawl runs on the origin — the matcher ignores path — so the reader is
    // told, rather than finding pages outside `/shop/` in the report.
    const plan = planGscSiteTarget("https://example.com/shop/");
    expect(plan?.origin).toBe("https://example.com");
    expect(plan?.droppedPath).toBe("/shop/");
  });

  it("distinguishes the two property kinds", () => {
    expect(planGscSiteTarget("sc-domain:example.com")?.kind).toBe("domain");
    expect(planGscSiteTarget("https://example.com/")?.kind).toBe("url_prefix");
  });

  it.each([
    ["", "an empty string"],
    ["   ", "whitespace"],
    ["sc-domain:", "a domain property with no domain"],
    ["sc-domain:https://example.com", "a domain property carrying a scheme"],
    ["sc-domain:example.com/shop", "a domain property carrying a path"],
    ["sc-domain:exam ple.com", "a domain property with a space"],
    ["example.com", "a bare host with no property shape"],
    ["ftp://example.com/", "a scheme Search Console never issues"],
    ["not a url", "unparseable text"],
  ])("returns null for %s (%s)", (siteUrl) => {
    expect(planGscSiteTarget(siteUrl)).toBeNull();
  });

  it("returns null rather than throwing, so one bad row costs only its row", () => {
    const properties = ["sc-domain:example.com", "not a url", "https://b.com/"];
    expect(properties.map(planGscSiteTarget).filter(Boolean)).toHaveLength(2);
  });
});
