/**
 * Schema.org structured data for the `/free-seo-check` landing, emitted as
 * JSON-LD in the route `head()`. The `FAQPage` is built from the same `FAQS`
 * array the page renders, so the markup a crawler reads and the accordion a
 * human reads can never disagree.
 *
 * `JSON.stringify` handles escaping for a `<script type="application/ld+json">`
 * context: it escapes quotes and backslashes, and the content is not HTML-parsed.
 * The only sequence that can break out of the script element is a literal
 * `</script>`; none of this copy contains one, and the builder is fed only static
 * constants, never scanned page content.
 */
import { FAQS, LANDING_INTRO } from "./landing-content";
import {
  FREE_SEO_CHECK_LANDING_PATH,
  publicUrl,
} from "@/shared/free-seo-check";

function softwareApplicationLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "EchoSEO Free SEO Checker",
    url: publicUrl(FREE_SEO_CHECK_LANDING_PATH),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    description: LANDING_INTRO,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  });
}

function faqPageLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  });
}

/** JSON-LD blocks for the landing `head()`, as TanStack `scripts` entries. */
export function landingStructuredDataScripts(): {
  type: "application/ld+json";
  children: string;
}[] {
  return [
    { type: "application/ld+json", children: softwareApplicationLd() },
    { type: "application/ld+json", children: faqPageLd() },
  ];
}
