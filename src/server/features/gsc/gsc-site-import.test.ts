import { describe, expect, it } from "vitest";
import { propertyCoversOrigin } from "@/shared/gsc-property-match";
import { planGscSiteTarget } from "./gsc-site-import";

/**
 * The mapping's one load-bearing property, asserted against the REAL coverage
 * predicate rather than a restatement of its rules: an imported target its own
 * property does not cover is a target whose Search Console reads all return
 * `property_mismatch`, and nothing surfaces that until someone opens a report.
 */
describe("planGscSiteTarget keeps the origin covered by its property", () => {
  it.each([
    "sc-domain:example.com",
    "sc-domain:EXAMPLE.com",
    "https://example.com/",
    "https://www.example.com/",
    "http://legacy.example.com/",
    "https://example.co.uk/",
  ])("%s verifies the origin it maps to", (siteUrl) => {
    const plan = planGscSiteTarget(siteUrl);
    expect(plan, siteUrl).not.toBeNull();
    if (!plan) return;
    expect(propertyCoversOrigin(plan.origin, plan.siteUrl), plan.origin).toBe(
      true,
    );
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
    });
  });

  it("keeps a URL-prefix property's scheme instead of upgrading it", () => {
    // The silent bug this exists to prevent: `propertyCoversOrigin` compares
    // protocol exactly for a URL-prefix property, so an http property rewritten
    // to https produces a target whose own search data is refused as a mismatch.
    const plan = planGscSiteTarget("http://example.com/");
    expect(plan?.origin).toBe("http://example.com");
    expect(
      propertyCoversOrigin("https://example.com", "http://example.com/"),
    ).toBe(false);
  });

  it("refuses a URL-prefix property scoped to a path, because Search Console never reports beyond it", () => {
    // `propertyCoversOrigin` credits a URL-prefix property for an origin only
    // when the property itself is rooted at `/`. Mapping this to the bare
    // origin anyway — the old behavior — created a project this app described
    // as covering the whole site while Search Console would only ever report
    // on `/shop/`. Refusing the plan is the fix; dropping the path was the bug.
    expect(planGscSiteTarget("https://example.com/shop/")).toBeNull();
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
