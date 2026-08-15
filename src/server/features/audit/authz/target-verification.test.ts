import { describe, expect, it } from "vitest";
import {
  evaluateTargetVerification,
  getVerificationPageThreshold,
  hasGoogleFacingAuthority,
  isLaunchBlockedByVerification,
  requiresVerifiedDomain,
} from "./target-verification";
import { AUDIT_VERIFICATION_PAGE_THRESHOLD } from "@/shared/audit-limits";

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

  it("accepts a subdomain of a URL-prefix property's host", () => {
    // The gate asks who controls the site, not whose data covers the URL: the
    // owner of `https://example.com/` was being capped on `blog.example.com`.
    expect(
      evaluateTargetVerification({
        origin: "https://blog.example.com",
        gscSiteUrl: "https://example.com/",
      }),
    ).toBe("gsc_property");
    expect(
      evaluateTargetVerification({
        origin: "https://example.com.evil.com",
        gscSiteUrl: "https://example.com/",
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

describe("getVerificationPageThreshold", () => {
  it("reports a threshold exactly where the launch gate applies", () => {
    // The launch form explains this number before a crawl is rejected for it,
    // so it must stay derived from the rule rather than restated next to it.
    expect(getVerificationPageThreshold("hosted")).toBe(
      AUDIT_VERIFICATION_PAGE_THRESHOLD,
    );
    expect(getVerificationPageThreshold("local_noauth")).toBeNull();
    expect(getVerificationPageThreshold("cloudflare_access")).toBeNull();
  });

  it("agrees with the launch gate for every auth mode", () => {
    const modes = ["hosted", "local_noauth", "cloudflare_access"] as const;

    for (const authMode of modes) {
      const threshold = getVerificationPageThreshold(authMode);
      const gateBlocksLargeCrawl = isLaunchBlockedByVerification({
        authMode,
        maxPages: AUDIT_VERIFICATION_PAGE_THRESHOLD + 1,
        verification: "unverified",
      });

      expect(threshold !== null).toBe(gateBlocksLargeCrawl);
    }
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
