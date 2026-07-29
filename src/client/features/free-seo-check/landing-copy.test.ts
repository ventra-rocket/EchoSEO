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
      expect(copy.trustSignals).toHaveLength(en.trustSignals.length);
      expect(copy.samplePreview.rows).toHaveLength(
        en.samplePreview.rows.length,
      );
    }
  });

  it("keeps the sample rows' machine ids and statuses aligned with English", () => {
    // The ids are language-neutral rule ids and the statuses drive icon shape
    // and badge color — a locale that reordered or reworded them would show a
    // different sample report per language.
    const en = LANDING_COPY.en.samplePreview.rows;
    for (const locale of SUPPORTED_LOCALES) {
      const rows = LANDING_COPY[locale].samplePreview.rows;
      expect(rows.map((row) => row.id)).toEqual(en.map((row) => row.id));
      expect(rows.map((row) => row.status)).toEqual(
        en.map((row) => row.status),
      );
    }
  });

  it("has no empty strings in any localized field", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const copy = LANDING_COPY[locale];
      const scalars = [
        copy.metaTitle,
        copy.metaDescription,
        copy.heroEyebrow,
        copy.heroHeading,
        copy.heroSubtitleBefore,
        copy.heroSubtitleAccent,
        copy.heroSubtitleAfter,
        copy.languageSwitchLabel,
        copy.languageSwitchAria,
        copy.submitIdle,
        copy.submitVerifying,
        copy.footerProductLine,
        copy.footerHomeAria,
        copy.intro,
        copy.faqHeading,
        copy.samplePreview.label,
        copy.samplePreview.heading,
        copy.samplePreview.scoreCaption,
        copy.samplePreview.footnote,
        copy.samplePreview.statusLabels.pass,
        copy.samplePreview.statusLabels.warn,
        copy.samplePreview.statusLabels.fail,
      ];
      for (const value of scalars) {
        expect(value.trim(), locale).not.toBe("");
      }
      for (const signal of copy.trustSignals) {
        expect(signal.trim(), `${locale} trust signal`).not.toBe("");
      }
      for (const row of copy.samplePreview.rows) {
        expect(row.label.trim(), `${locale} sample label`).not.toBe("");
        expect(row.detail.trim(), `${locale} sample detail`).not.toBe("");
      }
      for (const faq of copy.faqs) {
        expect(faq.question.trim(), `${locale} question`).not.toBe("");
        expect(faq.answer.trim(), `${locale} answer`).not.toBe("");
      }
    }
  });
});
