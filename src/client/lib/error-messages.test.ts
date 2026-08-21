import { describe, expect, it } from "vitest";
import { createIntl } from "react-intl";
import {
  getLocalizedErrorMessage,
  getStandardErrorMessage,
} from "@/client/lib/error-messages";
import { en } from "@/client/i18n/messages/en";
import { vi } from "@/client/i18n/messages/vi";

describe("getStandardErrorMessage", () => {
  it("maps known error codes to standard copy", () => {
    expect(getStandardErrorMessage(new Error("PAYMENT_REQUIRED"))).toBe(
      "An active hosted subscription is required before you can use EchoSEO.",
    );
  });

  it("explains a blocked large crawl instead of denying access", () => {
    // The launch gate used to throw FORBIDDEN, so a user who asked for more pages
    // than an unverified domain allows was told they had no access to the product.
    const message = getStandardErrorMessage(
      new Error("AUDIT_VERIFICATION_REQUIRED"),
    );

    expect(message).toContain("Search Console property");
    expect(message).toContain("100");
    expect(message).not.toContain("do not have access");
  });

  it("returns custom messages when the error is not a shared code", () => {
    expect(
      getStandardErrorMessage(
        new Error("DataForSEO task missing billing metadata. Response: {...}"),
      ),
    ).toBe("DataForSEO task missing billing metadata. Response: {...}");
  });

  it("localizes shared error codes without replacing custom messages", () => {
    const english = createIntl({ locale: "en", messages: en });
    const vietnamese = createIntl({ locale: "vi", messages: vi });

    expect(
      getLocalizedErrorMessage(
        english,
        new Error("UPSTREAM_UNAVAILABLE"),
        "fallback",
      ),
    ).toBe(en["common.error.code.upstreamUnavailable"]);
    expect(
      getLocalizedErrorMessage(
        vietnamese,
        new Error("UPSTREAM_UNAVAILABLE"),
        "fallback",
      ),
    ).toBe(vi["common.error.code.upstreamUnavailable"]);
    expect(
      getLocalizedErrorMessage(
        vietnamese,
        new Error("Provider returned a custom message"),
        "fallback",
      ),
    ).toBe("Provider returned a custom message");
  });
});
