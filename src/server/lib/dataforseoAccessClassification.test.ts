import { describe, expect, it } from "vitest";
import { createDataforseoAccessClassifier } from "@/server/lib/dataforseoAccessClassification";

const classify = createDataforseoAccessClassifier({
  pathPrefix: "/backlinks/",
  notEnabledCode: "BACKLINKS_NOT_ENABLED",
  notEnabledMessage: "not enabled",
  billingIssueCode: "BACKLINKS_BILLING_ISSUE",
  billingIssueMessage: "billing issue",
});

describe("createDataforseoAccessClassifier", () => {
  it("returns null when the path is outside the configured prefix", () => {
    expect(classify(402, "payment required", "/v3/serp/google/live")).toBe(
      null,
    );
  });

  it("translates status 40204 into the configured error code when inside the path prefix", () => {
    const err = classify(40204, "", "/v3/backlinks/summary/live");
    expect(err?.code).toBe("BACKLINKS_NOT_ENABLED");
  });

  /**
   * DataForSEO answers HTTP 403 for conditions that have nothing to do with the
   * subscription. Claiming "not enabled" for those sends the operator to buy
   * something they already own, and hides the reason the provider did give.
   */
  it.each([
    [
      "an unverified account",
      "Please verify your account before using the API.",
    ],
    ["a suspended account", "Your account has been suspended."],
    ["an IP restriction", "Your IP is not whitelisted."],
  ])("leaves a bare HTTP 403 for %s to the caller", (_label, message) => {
    expect(classify(403, message, "/v3/backlinks/summary/live")).toBe(null);
  });

  /** A genuine subscription gap still classifies, on its text signal, even when
   * it arrives as HTTP 403 with no DataForSEO code to read. */
  it("still classifies a 403 whose body names the subscription", () => {
    const err = classify(
      403,
      "Subscription to this API is not active.",
      "/v3/backlinks/summary/live",
    );
    expect(err?.code).toBe("BACKLINKS_NOT_ENABLED");
  });

  /** Billing is checked before access, so an out-of-funds 403 keeps its own
   * code rather than being flattened into either of the others. */
  it("still routes an out-of-funds 403 to the billing code", () => {
    const err = classify(
      403,
      "Payment required.",
      "/v3/backlinks/summary/live",
    );
    expect(err?.code).toBe("BACKLINKS_BILLING_ISSUE");
  });

  it.each([40200, 40210, 402])(
    "translates billing status %s into the configured billing error code",
    (status) => {
      const err = classify(status, "", "/v3/backlinks/summary/live");
      expect(err?.code).toBe("BACKLINKS_BILLING_ISSUE");
    },
  );

  it.each([
    "subscription required",
    "plans and subscriptions",
    "access denied",
    "forbidden",
  ])("translates signal %s into the configured error code", (message) => {
    const err = classify(undefined, message, "/v3/backlinks/summary/live");
    expect(err?.code).toBe("BACKLINKS_NOT_ENABLED");
  });

  it.each([
    "insufficient funds",
    "payment required",
    "balance is too low",
    "problem billing",
    "account was not recharged",
  ])(
    "translates billing signal %s into the configured billing code",
    (message) => {
      const err = classify(undefined, message, "/v3/backlinks/summary/live");
      expect(err?.code).toBe("BACKLINKS_BILLING_ISSUE");
    },
  );

  it("returns null when neither status nor text matches", () => {
    expect(classify(500, "boom", "/v3/backlinks/summary/live")).toBe(null);
  });

  it("matches signals case-insensitively", () => {
    const err = classify(
      undefined,
      "SUBSCRIPTION required",
      "/v3/backlinks/summary/live",
    );
    expect(err?.code).toBe("BACKLINKS_NOT_ENABLED");
  });
});
