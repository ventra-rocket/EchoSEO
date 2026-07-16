import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/client/i18n/config";
import { LANDING_COPY } from "./landing-copy";

describe("landing copy", () => {
  it("provides copy for every supported locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LANDING_COPY[locale]).toBeDefined();
    }
  });

  it("keeps every locale at error-key parity with English", () => {
    // The submit handler falls back to `errorDefault` for unknown server codes,
    // but a locale silently missing a KNOWN code would degrade only that language
    // with no type error. Pin parity so a dropped key fails a test instead.
    const enKeys = Object.keys(LANDING_COPY.en.errors).toSorted();
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(LANDING_COPY[locale].errors).toSorted()).toEqual(
        enKeys,
      );
    }
  });

  it("keeps the editorial sections the same shape across locales", () => {
    const en = LANDING_COPY.en;
    for (const locale of SUPPORTED_LOCALES) {
      const copy = LANDING_COPY[locale];
      expect(copy.whatWeCheck).toHaveLength(en.whatWeCheck.length);
      expect(copy.howItWorks).toHaveLength(en.howItWorks.length);
      expect(copy.faqs).toHaveLength(en.faqs.length);
    }
  });

  it("has no empty strings in any localized field", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const copy = LANDING_COPY[locale];
      const scalars = [
        copy.metaTitle,
        copy.metaDescription,
        copy.heroHeading,
        copy.heroSubtitle,
        copy.submitIdle,
        copy.intro,
        copy.faqHeading,
      ];
      for (const value of scalars) {
        expect(value.trim(), locale).not.toBe("");
      }
      for (const faq of copy.faqs) {
        expect(faq.question.trim(), `${locale} question`).not.toBe("");
        expect(faq.answer.trim(), `${locale} answer`).not.toBe("");
      }
    }
  });
});
