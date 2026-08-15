import { describe, expect, it } from "vitest";
import { originMatchesGscSiteUrl } from "@/shared/gsc-property-match";

describe("originMatchesGscSiteUrl", () => {
  it("matches an sc-domain property on the domain and its subdomains", () => {
    expect(
      originMatchesGscSiteUrl("https://example.com", "sc-domain:example.com"),
    ).toBe(true);
    expect(
      originMatchesGscSiteUrl(
        "https://blog.example.com",
        "sc-domain:example.com",
      ),
    ).toBe(true);
    // sc-domain covers protocols too.
    expect(
      originMatchesGscSiteUrl("http://example.com", "sc-domain:example.com"),
    ).toBe(true);
  });

  it("rejects a look-alike domain for an sc-domain property", () => {
    expect(
      originMatchesGscSiteUrl(
        "https://notexample.com",
        "sc-domain:example.com",
      ),
    ).toBe(false);
    expect(
      originMatchesGscSiteUrl(
        "https://example.com.evil.com",
        "sc-domain:example.com",
      ),
    ).toBe(false);
  });

  it("matches a URL-prefix property on the same protocol + host", () => {
    expect(
      originMatchesGscSiteUrl("https://example.com", "https://example.com/"),
    ).toBe(true);
  });

  it("rejects a URL-prefix property on a different protocol or host", () => {
    expect(
      originMatchesGscSiteUrl("http://example.com", "https://example.com/"),
    ).toBe(false);
    expect(
      originMatchesGscSiteUrl("https://other.com", "https://example.com/"),
    ).toBe(false);
  });
});
