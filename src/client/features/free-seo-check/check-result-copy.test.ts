import { describe, expect, it } from "vitest";
import {
  DEEP_DISABLED_MESSAGE,
  DEEP_QUOTA_BLOCKED_MESSAGE,
} from "@/server/services/seo-check/deep-failure-messages";
import { SUPPORTED_LOCALES } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";

/**
 * The `/r/{id}` failed state maps the specific server failure strings
 * (kill-switch, quota) to localized text by exact-string key. If a server
 * message is reworded without updating the copy map, the page silently falls
 * back to the generic line and loses its actionable guidance — so pin the keys
 * to their real source (the server constants), not to a duplicated literal.
 */
describe("report-page failed-message mapping", () => {
  it.each([DEEP_DISABLED_MESSAGE, DEEP_QUOTA_BLOCKED_MESSAGE])(
    "maps the server failure message in both locales: %s",
    (message) => {
      const en = CHECK_RESULT_COPY.en.reportPage.failedMessages;
      const vi = CHECK_RESULT_COPY.vi.reportPage.failedMessages;

      // EN maps each specific message to itself, so the page reads byte-identical.
      expect(en[message]).toBe(message);
      // VI provides a real, different translation.
      expect((vi[message] ?? "").trim().length).toBeGreaterThan(0);
      expect(vi[message]).not.toBe(message);
    },
  );
});

describe("the page-read panel has copy in every locale", () => {
  it("carries a non-empty string for each field, in both languages", () => {
    // The panel reports the values found on the visitor's own page. A missing
    // label there would leave a bare value with nothing saying what it is.
    for (const locale of SUPPORTED_LOCALES) {
      const copy = CHECK_RESULT_COPY[locale].pageRead;
      for (const value of [
        copy.heading,
        copy.title,
        copy.metaDescription,
        copy.h1,
        copy.words,
        copy.missing,
      ]) {
        expect(value.trim()).not.toBe("");
      }
      const measurement = CHECK_RESULT_COPY[locale].measurement;
      expect(measurement.chars(54)).toContain("54");
      expect(measurement.count(3)).toContain("3");
      expect(measurement.ratio(1, 2)).toContain("1");
    }
  });

  it("is translated rather than copied from English", () => {
    expect(CHECK_RESULT_COPY.vi.pageRead.heading).not.toBe(
      CHECK_RESULT_COPY.en.pageRead.heading,
    );
    expect(CHECK_RESULT_COPY.vi.measurement.chars(54)).not.toBe(
      CHECK_RESULT_COPY.en.measurement.chars(54),
    );
  });
});
