import { describe, expect, it } from "vitest";
import {
  buildSitemapsDeepLink,
  isWithinOrigin,
  mapInspection,
} from "./google-index-status";

describe("buildSitemapsDeepLink", () => {
  it("encodes a domain property into the Search Console sitemaps URL", () => {
    expect(buildSitemapsDeepLink("sc-domain:example.com")).toBe(
      "https://search.google.com/search-console/sitemaps?resource_id=sc-domain%3Aexample.com",
    );
  });

  it("encodes a URL-prefix property", () => {
    expect(buildSitemapsDeepLink("https://example.com/")).toBe(
      "https://search.google.com/search-console/sitemaps?resource_id=https%3A%2F%2Fexample.com%2F",
    );
  });
});

describe("mapInspection", () => {
  it("flattens the index-status fields and the deep link", () => {
    expect(
      mapInspection({
        indexStatusResult: {
          verdict: "PASS",
          coverageState: "Submitted and indexed",
          indexingState: "INDEXING_ALLOWED",
          robotsTxtState: "ALLOWED",
          lastCrawlTime: "2026-07-01T00:00:00Z",
          googleCanonical: "https://example.com/a",
        },
        inspectionResultLink:
          "https://search.google.com/search-console/inspect?x=1",
      }),
    ).toEqual({
      verdict: "PASS",
      coverageState: "Submitted and indexed",
      indexingState: "INDEXING_ALLOWED",
      robotsTxtState: "ALLOWED",
      lastCrawlTime: "2026-07-01T00:00:00Z",
      googleCanonical: "https://example.com/a",
      inspectionResultLink:
        "https://search.google.com/search-console/inspect?x=1",
    });
  });

  it("drops a non-http inspection link rather than rendering it", () => {
    const view = mapInspection({
      inspectionResultLink: "javascript:alert(1)",
    });
    expect(view.inspectionResultLink).toBeNull();
  });

  it("reads a null result as all-null, never inventing a verdict", () => {
    expect(mapInspection(null)).toEqual({
      verdict: null,
      coverageState: null,
      indexingState: null,
      robotsTxtState: null,
      lastCrawlTime: null,
      googleCanonical: null,
      inspectionResultLink: null,
    });
  });
});

describe("isWithinOrigin", () => {
  it("accepts a URL on the same origin", () => {
    expect(
      isWithinOrigin("https://example.com/a/b", "https://example.com"),
    ).toBe(true);
  });

  it("rejects a different host, scheme, or port", () => {
    expect(isWithinOrigin("https://evil.com/a", "https://example.com")).toBe(
      false,
    );
    expect(isWithinOrigin("http://example.com/a", "https://example.com")).toBe(
      false,
    );
    expect(
      isWithinOrigin("https://example.com:8443/a", "https://example.com"),
    ).toBe(false);
  });

  it("rejects a malformed URL rather than throwing", () => {
    expect(isWithinOrigin("not a url", "https://example.com")).toBe(false);
  });
});
