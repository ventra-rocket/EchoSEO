import { describe, expect, it } from "vitest";
import {
  LABS_LOCATION_OPTIONS,
  LOCATION_OPTIONS,
  SERP_LANGUAGE_OPTIONS,
  getKeywordDataProvider,
  getLanguageCode,
  isLabsLocationCode,
  isSupportedLanguageCode,
  isSupportedLocationCode,
  resolveKeywordDataLanguage,
} from "./keyword-locations";

describe("keyword locations", () => {
  it("routes Labs-supported countries to labs", () => {
    expect(getKeywordDataProvider(2840)).toBe("labs"); // US
    expect(getKeywordDataProvider(2826)).toBe("labs"); // UK
  });

  it("routes Google-Ads-only countries to google_ads", () => {
    expect(getKeywordDataProvider(2352)).toBe("google_ads"); // Iceland
    expect(isSupportedLocationCode(2352)).toBe(true);
    expect(isLabsLocationCode(2352)).toBe(false);
    expect(getLanguageCode(2352)).toBe("is");
  });

  it("falls back to labs for unknown codes (Labs rejects them upstream)", () => {
    expect(getKeywordDataProvider(999999)).toBe("labs");
    expect(isSupportedLocationCode(999999)).toBe(false);
  });

  it("excludes every Google-Ads-only country from the Labs picker", () => {
    const adsOnly = LOCATION_OPTIONS.filter((option) => option.googleAdsOnly);
    expect(adsOnly.length).toBeGreaterThan(0);
    const labsCodes = new Set(
      LABS_LOCATION_OPTIONS.map((option) => option.code),
    );
    for (const option of adsOnly) {
      expect(labsCodes.has(option.code)).toBe(false);
    }
    expect(LABS_LOCATION_OPTIONS.length + adsOnly.length).toBe(
      LOCATION_OPTIONS.length,
    );
  });

  it("keeps the picker sorted alphabetically with unique codes", () => {
    const labels = LOCATION_OPTIONS.map((option) => option.label);
    expect(labels).toEqual(labels.toSorted((a, b) => a.localeCompare(b)));
    const codes = LOCATION_OPTIONS.map((option) => option.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("isSupportedLanguageCode", () => {
  it("accepts every code the SERP picker offers", () => {
    for (const language of SERP_LANGUAGE_OPTIONS) {
      expect(isSupportedLanguageCode(language.code)).toBe(true);
    }
  });

  it("rejects a code DataForSEO would bill us to refuse", () => {
    expect(isSupportedLanguageCode("klingon")).toBe(false);
    expect(isSupportedLanguageCode("")).toBe(false);
    // The deprecated Hebrew alias is deliberately absent; Israel uses "he".
    expect(isSupportedLanguageCode("iw")).toBe(false);
  });

  it("covers every country default, so a picker can always show it", () => {
    for (const option of LOCATION_OPTIONS) {
      expect(isSupportedLanguageCode(option.languageCode)).toBe(true);
    }
  });
});

describe("resolveKeywordDataLanguage", () => {
  it("keeps a language the country's keyword data serves", () => {
    expect(resolveKeywordDataLanguage(2840, "es")).toBe("es"); // US
    expect(resolveKeywordDataLanguage(2704, "vi")).toBe("vi"); // Vietnam
  });

  it("falls back to the country default for a SERP-only pair", () => {
    // Rank tracking can follow English searches in Czechia; Labs would charge
    // for the request and then reject it.
    expect(resolveKeywordDataLanguage(2203, "en")).toBe("cs");
    // Google-Ads countries keep their single default too.
    expect(resolveKeywordDataLanguage(2352, "en")).toBe("is");
  });

  it("falls back to English for an unknown country", () => {
    expect(resolveKeywordDataLanguage(999999, "fr")).toBe("en");
  });
});
