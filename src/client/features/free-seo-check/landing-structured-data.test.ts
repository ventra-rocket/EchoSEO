import { describe, expect, it } from "vitest";
import { z } from "zod";
import { FAQS } from "./landing-content";
import { landingStructuredDataScripts } from "./landing-structured-data";

const softwareApplicationSchema = z.object({
  "@type": z.literal("SoftwareApplication"),
  url: z.string(),
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

describe("landing structured data", () => {
  it("emits a SoftwareApplication offered at no cost", () => {
    const ld = softwareApplicationSchema.parse(
      JSON.parse(landingStructuredDataScripts()[0].children),
    );
    expect(ld.offers.price).toBe("0");
    // Absolute URL — a relative one is invalid in JSON-LD.
    expect(ld.url).toMatch(/^https?:\/\//);
  });

  it("builds the FAQPage from the same FAQS the page renders, with no drift", () => {
    const ld = faqPageSchema.parse(
      JSON.parse(landingStructuredDataScripts()[1].children),
    );
    // One Question per FAQ, in order, with the exact rendered text — this is what
    // stops the markup and the visible accordion from ever disagreeing.
    expect(ld.mainEntity).toHaveLength(FAQS.length);
    ld.mainEntity.forEach((entity, index) => {
      expect(entity.name).toBe(FAQS[index].question);
      expect(entity.acceptedAnswer.text).toBe(FAQS[index].answer);
    });
  });

  it("produces valid JSON for every block (nothing can break the script tag)", () => {
    for (const script of landingStructuredDataScripts()) {
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
