import { describe, expect, it } from "vitest";
import {
  evaluateLaunchVerificationGate,
  guessTargetOrigin,
} from "@/client/features/audit/launch/verification";

const HOSTED_ACCESS = {
  verifiedSiteUrl: "https://ventrarocket.vn/",
  verificationPageThreshold: 100,
};

describe("guessTargetOrigin", () => {
  it("defaults a missing scheme to https, like the server does", () => {
    expect(guessTargetOrigin("thehourglass.com")).toBe(
      "https://thehourglass.com",
    );
    expect(guessTargetOrigin("  example.com/blog  ")).toBe(
      "https://example.com",
    );
    expect(guessTargetOrigin("http://example.com/blog")).toBe(
      "http://example.com",
    );
  });

  it("returns null for input that is not readable as a URL yet", () => {
    expect(guessTargetOrigin("")).toBeNull();
    expect(guessTargetOrigin("   ")).toBeNull();
    expect(guessTargetOrigin("javascript:alert(1)")).toBeNull();
  });
});

describe("evaluateLaunchVerificationGate", () => {
  it("blocks a large crawl of a domain the connected property does not cover", () => {
    // The reported bug: 5,000 pages of thehourglass.com on a project whose
    // property is ventrarocket.vn. The server refuses this, so the form must say
    // so first — and name the domain and the size that is allowed.
    expect(
      evaluateLaunchVerificationGate({
        urlInput: "thehourglass.com",
        maxPages: 5000,
        access: HOSTED_ACCESS,
      }),
    ).toEqual({
      domain: "thehourglass.com",
      threshold: 100,
      verifiedSiteUrl: "https://ventrarocket.vn/",
    });
  });

  it("allows a crawl at or below the unverified limit", () => {
    expect(
      evaluateLaunchVerificationGate({
        urlInput: "thehourglass.com",
        maxPages: 100,
        access: HOSTED_ACCESS,
      }),
    ).toBeNull();
  });

  it("allows any size on a domain the connected property covers", () => {
    expect(
      evaluateLaunchVerificationGate({
        urlInput: "https://ventrarocket.vn",
        maxPages: 5000,
        access: HOSTED_ACCESS,
      }),
    ).toBeNull();
    expect(
      evaluateLaunchVerificationGate({
        urlInput: "blog.example.com",
        maxPages: 5000,
        access: {
          verifiedSiteUrl: "sc-domain:example.com",
          verificationPageThreshold: 100,
        },
      }),
    ).toBeNull();
  });

  it("allows any size on a subdomain of the connected property's host", () => {
    // The reported friction: kello.ventrarocket.vn on a project whose property is
    // the URL-prefix https://ventrarocket.vn/. The server accepts it, so the form
    // must not disable the button in front of it.
    expect(
      evaluateLaunchVerificationGate({
        urlInput: "kello.ventrarocket.vn",
        maxPages: 5000,
        access: HOSTED_ACCESS,
      }),
    ).toBeNull();
  });

  it("still blocks a large crawl when no property is connected", () => {
    expect(
      evaluateLaunchVerificationGate({
        urlInput: "example.com",
        maxPages: 5000,
        access: { verifiedSiteUrl: null, verificationPageThreshold: 100 },
      }),
    ).toEqual({
      domain: "example.com",
      threshold: 100,
      verifiedSiteUrl: null,
    });
  });

  it("never blocks where the deployment has no threshold, or before it is known", () => {
    // Self-host / local: `getVerificationPageThreshold` returns null there.
    expect(
      evaluateLaunchVerificationGate({
        urlInput: "example.com",
        maxPages: 5000,
        access: { verifiedSiteUrl: null, verificationPageThreshold: null },
      }),
    ).toBeNull();
    expect(
      evaluateLaunchVerificationGate({
        urlInput: "example.com",
        maxPages: 5000,
        access: undefined,
      }),
    ).toBeNull();
  });

  it("defers to the server when the URL or page count is not readable", () => {
    expect(
      evaluateLaunchVerificationGate({
        urlInput: "",
        maxPages: 5000,
        access: HOSTED_ACCESS,
      }),
    ).toBeNull();
    expect(
      evaluateLaunchVerificationGate({
        urlInput: "thehourglass.com",
        maxPages: Number.NaN,
        access: HOSTED_ACCESS,
      }),
    ).toBeNull();
  });
});
