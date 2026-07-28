import { describe, expect, it } from "vitest";
import { isAuthInterstitialUrl } from "./auth-interstitial";

describe("isAuthInterstitialUrl", () => {
  it.each([
    "https://ventrarocket.cloudflareaccess.com/cdn-cgi/access/login/echoseo.ventrarocket.vn",
    "https://team.cloudflareaccess.com/",
    "https://accounts.google.com/o/oauth2/v2/auth?client_id=x",
    "https://login.microsoftonline.com/common/oauth2/authorize",
    "https://dev-12345.okta.com/login/login.htm",
  ])("flags a known auth interstitial: %s", (url) => {
    expect(isAuthInterstitialUrl(url)).toBe(true);
  });

  it.each([
    "https://example.com/",
    // A real page served under /login is content, not an interstitial.
    "https://example.com/login",
    // The base must match on a domain boundary, not a substring.
    "https://cloudflareaccess.com.evil.test/",
    "https://notcloudflareaccess.com/",
    // Only accounts.google.com is gated, not google.com at large.
    "https://www.google.com/search?q=seo",
  ])("does not flag a normal page: %s", (url) => {
    expect(isAuthInterstitialUrl(url)).toBe(false);
  });

  it("returns false for an unparseable URL instead of throwing", () => {
    expect(isAuthInterstitialUrl("not a url")).toBe(false);
  });

  it("matches case-insensitively and ignores a trailing dot on the host", () => {
    expect(isAuthInterstitialUrl("https://TEAM.CloudflareAccess.com./")).toBe(
      true,
    );
  });
});
