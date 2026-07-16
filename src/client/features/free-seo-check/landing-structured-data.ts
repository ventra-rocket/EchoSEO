/**
 * Schema.org structured data for the checker landing, emitted as JSON-LD in the
 * route `head()`. The `FAQPage` is built from the same `LANDING_COPY[locale].faqs`
 * array the page renders, so the markup a crawler reads and the accordion a human
 * reads can never disagree — per locale.
 *
 * `JSON.stringify` handles escaping for a `<script type="application/ld+json">`
 * context: it escapes quotes and backslashes, and the content is not HTML-parsed.
 * The only sequence that can break out of the script element is a literal
 * `</script>`; none of this copy contains one, and the builder is fed only static
 * constants, never scanned page content.
 */
import type { Locale } from "@/client/i18n/config";
import { LANDING_COPY } from "./landing-copy";
import {
  FREE_SEO_CHECK_LANDING_PATH,
  publicUrl,
} from "@/shared/free-seo-check";

function softwareApplicationLd(locale: Locale): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "EchoSEO Free SEO Checker",
    // One canonical entity URL (the English landing) regardless of the page's
    // language — this identifies the application, not the localized page.
    url: publicUrl(FREE_SEO_CHECK_LANDING_PATH),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    description: LANDING_COPY[locale].intro,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  });
}

function faqPageLd(locale: Locale): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LANDING_COPY[locale].faqs.map((faq) => ({
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
export function landingStructuredDataScripts(locale: Locale): {
  type: "application/ld+json";
  children: string;
}[] {
  return [
    { type: "application/ld+json", children: softwareApplicationLd(locale) },
    { type: "application/ld+json", children: faqPageLd(locale) },
  ];
}
