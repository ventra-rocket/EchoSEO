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

// --- appended: Deep-report strategy tabs (keep this block last) ---

describe("strategy-tab copy exists in every locale", () => {
  it("carries non-empty labels and notes", () => {
    // The tabs, the legacy "not captured" note, and the desktop honesty line
    // all render on the public /r/{id} page; an empty string there would leave
    // an unlabeled control or a silent gap where an explanation belongs.
    for (const locale of SUPPORTED_LOCALES) {
      const copy = CHECK_RESULT_COPY[locale].strategyTabs;
      for (const value of [
        copy.ariaLabel,
        copy.mobileTab,
        copy.desktopTab,
        copy.desktopComparativeNote,
        copy.desktopNotCaptured,
        copy.noStrategyData,
      ]) {
        expect(value.trim()).not.toBe("");
      }
    }
  });

  it("is translated rather than copied from English", () => {
    expect(CHECK_RESULT_COPY.vi.strategyTabs.mobileTab).not.toBe(
      CHECK_RESULT_COPY.en.strategyTabs.mobileTab,
    );
    expect(CHECK_RESULT_COPY.vi.strategyTabs.desktopNotCaptured).not.toBe(
      CHECK_RESULT_COPY.en.strategyTabs.desktopNotCaptured,
    );
  });
});

// --- appended: visual filmstrip (keep this block last) ---

describe("filmstrip copy exists in every locale", () => {
  it("carries an accessible strip label, per-frame alt, and a timing caption", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const copy = CHECK_RESULT_COPY[locale].filmstrip;
      expect(copy.ariaLabel.trim()).not.toBe("");
      const timing = copy.timing(375);
      // 375ms must surface the value in seconds, whatever the locale's
      // decimal separator — a caption without the number says nothing.
      expect(timing).toMatch(/0[.,]4/);
      expect(copy.frameAlt(timing)).toContain(timing);
    }
  });

  it("formats the Vietnamese decimal with a comma", () => {
    expect(CHECK_RESULT_COPY.vi.filmstrip.timing(1250)).toContain("1,3");
    expect(CHECK_RESULT_COPY.en.filmstrip.timing(1250)).toContain("1.3");
  });
});
