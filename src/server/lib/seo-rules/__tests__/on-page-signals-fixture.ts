import type { OnPageSignals } from "../types";

/** A fully "good" page — every on-page/technical rule should pass against it. */
export function makeGoodPage(
  overrides: Partial<OnPageSignals> = {},
): OnPageSignals {
  return {
    url: "https://good.test/",
    statusCode: 200,
    redirectUrl: null,
    responseTimeMs: 120,
    title: "A Complete Guide to On-Page SEO Best Practices",
    metaDescription:
      "Learn the essential on-page SEO techniques including titles, meta tags, headings, and structured data to improve rankings.",
    canonical: "https://good.test/",
    robotsMeta: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    h1s: ["Complete Guide to On-Page SEO"],
    headingOrder: [1, 2, 3],
    wordCount: 650,
    images: [
      { src: "https://good.test/img.png", alt: "A descriptive alt text" },
    ],
    internalLinks: [],
    externalLinks: [],
    hasStructuredData: true,
    hreflangTags: [],
    hasMixedContent: false,
    ...overrides,
  };
}
