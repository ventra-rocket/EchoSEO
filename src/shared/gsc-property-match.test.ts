import { describe, expect, it } from "vitest";
import {
  propertyCoversOrigin,
  propertyProvesOwnership,
} from "@/shared/gsc-property-match";

describe("propertyCoversOrigin", () => {
  it("covers an sc-domain property's domain, subdomains and both protocols", () => {
    expect(
      propertyCoversOrigin("https://example.com", "sc-domain:example.com"),
    ).toBe(true);
    expect(
      propertyCoversOrigin("https://blog.example.com", "sc-domain:example.com"),
    ).toBe(true);
    expect(
      propertyCoversOrigin("http://example.com", "sc-domain:example.com"),
    ).toBe(true);
  });

  it("rejects a look-alike domain for an sc-domain property", () => {
    expect(
      propertyCoversOrigin("https://notexample.com", "sc-domain:example.com"),
    ).toBe(false);
    expect(
      propertyCoversOrigin(
        "https://example.com.evil.com",
        "sc-domain:example.com",
      ),
    ).toBe(false);
  });

  it("covers a URL-prefix property on the same protocol + host, rooted at /", () => {
    expect(
      propertyCoversOrigin("https://example.com", "https://example.com/"),
    ).toBe(true);
    // No explicit path is the same as a root path: `new URL` normalises an
    // empty path to `/`, and Search Console has no "pathless" property shape.
    expect(
      propertyCoversOrigin("https://example.com", "https://example.com"),
    ).toBe(true);
  });

  it("rejects a path-scoped property for the whole host — Search Console reports only on the property's own prefix", () => {
    // Corrected from the old (wrong) assumption that a URL-prefix property's
    // path is ignored: Search Console reports `https://example.com/shop/` on
    // URLs under `/shop/` alone, never on the rest of `example.com`. Treating
    // it as covering the bare origin would attribute one path's metrics to
    // the whole host — the fabricated join this gate exists to refuse.
    expect(
      propertyCoversOrigin("https://example.com", "https://example.com/shop/"),
    ).toBe(false);
    expect(
      propertyCoversOrigin("https://example.com", "https://example.com/shop"),
    ).toBe(false);
  });

  it("rejects another protocol, host, or subdomain for a URL-prefix property", () => {
    // A subdomain is a different property with different data — attributing the
    // parent's metrics to it would be the defect this strictness prevents.
    expect(
      propertyCoversOrigin("http://example.com", "https://example.com/"),
    ).toBe(false);
    expect(
      propertyCoversOrigin("https://other.com", "https://example.com/"),
    ).toBe(false);
    expect(
      propertyCoversOrigin("https://blog.example.com", "https://example.com/"),
    ).toBe(false);
  });
});

describe("propertyProvesOwnership", () => {
  it("proves ownership of a subdomain from a root URL-prefix property", () => {
    // The reported case: the owner of `https://ventrarocket.vn/` was capped at the
    // unverified crawl size on their own `kello.ventrarocket.vn`.
    expect(
      propertyProvesOwnership(
        "https://kello.ventrarocket.vn",
        "https://ventrarocket.vn/",
      ),
    ).toBe(true);
    expect(
      propertyProvesOwnership(
        "https://deep.blog.example.com",
        "https://example.com/",
      ),
    ).toBe(true);
  });

  it("ignores the protocol the property was registered under", () => {
    expect(
      propertyProvesOwnership("https://example.com", "http://example.com/"),
    ).toBe(true);
    expect(
      propertyProvesOwnership("http://example.com", "https://example.com/"),
    ).toBe(true);
  });

  it("keeps an sc-domain property's reach", () => {
    expect(
      propertyProvesOwnership(
        "https://blog.example.com",
        "sc-domain:example.com",
      ),
    ).toBe(true);
    expect(
      propertyProvesOwnership(
        "https://example.com.evil.com",
        "sc-domain:example.com",
      ),
    ).toBe(false);
  });

  it("rejects a look-alike host that merely ends with the property's text", () => {
    expect(
      propertyProvesOwnership(
        "https://ventrarocket.vn.evil.com",
        "https://ventrarocket.vn/",
      ),
    ).toBe(false);
    expect(
      propertyProvesOwnership("https://notexample.com", "https://example.com/"),
    ).toBe(false);
  });

  it("does not let a subdomain property prove its parent", () => {
    // Controlling `blog.example.com` says nothing about `example.com`; the proof
    // only ever travels down the host tree.
    expect(
      propertyProvesOwnership(
        "https://example.com",
        "https://blog.example.com/",
      ),
    ).toBe(false);
  });

  it("keeps a path-scoped property on its own host", () => {
    // A directory on a shared host proves control of that directory, never of the
    // customer hosts beside it.
    expect(
      propertyProvesOwnership(
        "https://sites.example.com",
        "https://sites.example.com/site/mine/",
      ),
    ).toBe(true);
    expect(
      propertyProvesOwnership(
        "https://other.sites.example.com",
        "https://sites.example.com/site/mine/",
      ),
    ).toBe(false);
  });

  it("rejects an unreadable origin or property", () => {
    expect(propertyProvesOwnership("not a url", "https://example.com/")).toBe(
      false,
    );
    expect(propertyProvesOwnership("https://example.com", "not a url")).toBe(
      false,
    );
    expect(propertyProvesOwnership("https://example.com", "sc-domain:")).toBe(
      false,
    );
  });
});
