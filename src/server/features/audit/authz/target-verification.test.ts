import { describe, expect, it } from "vitest";
import {
  AUDIT_VERIFICATION_PAGE_THRESHOLD,
  evaluateTargetVerification,
  hasGoogleFacingAuthority,
  isLaunchBlockedByVerification,
  originMatchesGscSiteUrl,
  requiresVerifiedDomain,
} from "./target-verification";

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

describe("evaluateTargetVerification", () => {
  it("returns gsc_property on a match, unverified otherwise", () => {
    expect(
      evaluateTargetVerification({
        origin: "https://example.com",
        gscSiteUrl: "sc-domain:example.com",
      }),
    ).toBe("gsc_property");
    expect(
      evaluateTargetVerification({
        origin: "https://example.com",
        gscSiteUrl: null,
      }),
    ).toBe("unverified");
    expect(
      evaluateTargetVerification({
        origin: "https://example.com",
        gscSiteUrl: "sc-domain:other.com",
      }),
    ).toBe("unverified");
  });
});

describe("hasGoogleFacingAuthority", () => {
  it("grants authority only for a verified property", () => {
    expect(hasGoogleFacingAuthority("gsc_property")).toBe(true);
    expect(hasGoogleFacingAuthority("unverified")).toBe(false);
  });
});

describe("requiresVerifiedDomain", () => {
  it("only gates large hosted crawls", () => {
    expect(requiresVerifiedDomain({ authMode: "hosted", maxPages: 500 })).toBe(
      true,
    );
    expect(
      requiresVerifiedDomain({
        authMode: "hosted",
        maxPages: AUDIT_VERIFICATION_PAGE_THRESHOLD,
      }),
    ).toBe(false);
    // Self-host / delegated modes stay permissive at any size.
    expect(
      requiresVerifiedDomain({ authMode: "local_noauth", maxPages: 5000 }),
    ).toBe(false);
    expect(
      requiresVerifiedDomain({ authMode: "cloudflare_access", maxPages: 5000 }),
    ).toBe(false);
  });
});

describe("isLaunchBlockedByVerification", () => {
  it("blocks only a large hosted crawl on an unverified domain", () => {
    expect(
      isLaunchBlockedByVerification({
        authMode: "hosted",
        maxPages: 500,
        verification: "unverified",
      }),
    ).toBe(true);
    // Verified large hosted crawl proceeds.
    expect(
      isLaunchBlockedByVerification({
        authMode: "hosted",
        maxPages: 500,
        verification: "gsc_property",
      }),
    ).toBe(false);
    // Small hosted crawl proceeds unverified.
    expect(
      isLaunchBlockedByVerification({
        authMode: "hosted",
        maxPages: 50,
        verification: "unverified",
      }),
    ).toBe(false);
    // Self-host large crawl proceeds unverified.
    expect(
      isLaunchBlockedByVerification({
        authMode: "local_noauth",
        maxPages: 5000,
        verification: "unverified",
      }),
    ).toBe(false);
  });
});
