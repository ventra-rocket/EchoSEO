import { describe, expect, it } from "vitest";
import { createIntl } from "react-intl";
import { SUPPORTED_LOCALES } from "@/client/i18n/config";
import { MESSAGES } from "./index";

describe("message catalogs", () => {
  it("provides a catalog for every supported locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(MESSAGES[locale]).toBeDefined();
    }
  });

  it("keeps every locale at key parity with English", () => {
    const enKeys = Object.keys(MESSAGES.en).toSorted();
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(MESSAGES[locale]).toSorted()).toEqual(enKeys);
    }
  });

  it("has no empty message values", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const [id, value] of Object.entries(MESSAGES[locale])) {
        expect(value.trim(), `${locale}:${id}`).not.toBe("");
      }
    }
  });

  it("resolves the same id to the locale's copy via react-intl", () => {
    const en = createIntl({ locale: "en", messages: MESSAGES.en });
    const vi = createIntl({ locale: "vi", messages: MESSAGES.vi });
    expect(en.formatMessage({ id: "nav.rankTracking" })).toBe("Rank Tracking");
    expect(vi.formatMessage({ id: "nav.rankTracking" })).toBe(
      "Theo dõi thứ hạng",
    );
  });
});
