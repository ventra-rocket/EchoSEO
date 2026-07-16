import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { Locale } from "@/client/i18n/config";
import { LANDING_COPY } from "./landing-copy";
import { landingStructuredDataScripts } from "./landing-structured-data";

const softwareApplicationSchema = z.object({
  "@type": z.literal("SoftwareApplication"),
  url: z.string(),
  description: z.string(),
  offers: z.object({ price: z.string() }),
});

const faqPageSchema = z.object({
  "@type": z.literal("FAQPage"),
  mainEntity: z.array(
    z.object({
      name: z.string(),
      acceptedAnswer: z.object({ text: z.string() }),
    }),
  ),
});

const LOCALES: Locale[] = ["en", "vi"];

describe.each(LOCALES)("landing structured data (%s)", (locale) => {
  it("emits a SoftwareApplication offered at no cost, described in this locale", () => {
    const ld = softwareApplicationSchema.parse(
      JSON.parse(landingStructuredDataScripts(locale)[0].children),
    );
    expect(ld.offers.price).toBe("0");
    // Absolute URL — a relative one is invalid in JSON-LD.
    expect(ld.url).toMatch(/^https?:\/\//);
    // The description is this locale's intro, so the markup speaks the page's language.
    expect(ld.description).toBe(LANDING_COPY[locale].intro);
  });

  it("builds the FAQPage from the same FAQs the page renders, with no drift", () => {
    const faqs = LANDING_COPY[locale].faqs;
    const ld = faqPageSchema.parse(
      JSON.parse(landingStructuredDataScripts(locale)[1].children),
    );
    // One Question per FAQ, in order, with the exact rendered text — this is what
    // stops the markup and the visible accordion from ever disagreeing.
    expect(ld.mainEntity).toHaveLength(faqs.length);
    ld.mainEntity.forEach((entity, index) => {
      expect(entity.name).toBe(faqs[index].question);
      expect(entity.acceptedAnswer.text).toBe(faqs[index].answer);
    });
  });

  it("produces valid JSON for every block (nothing can break the script tag)", () => {
    for (const script of landingStructuredDataScripts(locale)) {
      expect(script.type).toBe("application/ld+json");
      expect(() => {
        JSON.parse(script.children);
      }).not.toThrow();
      // `</script` (any case) closes the element early, and `<!--` opens the
      // script-data escape state; the copy must carry neither.
      expect(script.children).not.toMatch(/<\/script|<!--/i);
    }
  });
});
