import type { ParsedPage } from "@/server/services/seo-check/parse-html";
import { buildLiteReport } from "@/server/services/seo-check/lite";

/**
 * A deliberately imperfect page, scored through the real engine.
 *
 * The result state is the surface the checker is judged on and the one nobody
 * could see under test: running a real check needs a solved Turnstile
 * challenge, which no automated browser can produce. This fixture removes the
 * network and the challenge but keeps everything else — it goes through
 * `buildLiteReport`, the same function a real check uses, so the signals,
 * scores, and category breakdown are whatever production would genuinely
 * produce for this page. Nothing here is hand-authored to look plausible.
 *
 * The flaws are chosen to cover every verdict the UI can render: a passing
 * check, a warning, and a failure, across all three categories.
 */
const FIXTURE_PAGE: ParsedPage = {
  url: "https://example.com/pricing",
  statusCode: 200,
  redirectUrl: null,
  responseTimeMs: 412,

  // Well-formed: exercises the passing verdict.
  title: "Pricing — Acme Industrial Fasteners",
  // Short on purpose: trips the meta-description length rule as a warning.
  metaDescription: "Our pricing.",
  canonical: "https://example.com/pricing",
  robotsMeta: "index,follow",
  ogTitle: "Pricing — Acme Industrial Fasteners",
  ogDescription: "Our pricing.",
  ogImage: "https://example.com/og.png",

  // Three H1s: trips the single-H1 rule as a failure.
  h1s: ["Pricing", "Volume discounts", "Get a quote"],
  // Jumps h2 → h4: trips the heading-order rule.
  headingOrder: [1, 2, 4, 2, 1],

  wordCount: 268,

  // One image without alt text.
  images: [
    { src: "/img/bolt-m8.jpg", alt: "M8 hex bolt" },
    { src: "/img/price-table.png", alt: null },
  ],

  internalLinks: ["/", "/products", "/contact"],
  externalLinks: ["https://iso.org"],

  hasStructuredData: false,
  schemaTypes: [],
  hreflangTags: [],
  hasMixedContent: false,
};

/** Fixed so a screenshot of this page is byte-stable across runs. */
const FIXTURE_FETCHED_AT = "2026-07-29T00:00:00.000Z";

export const LITE_REPORT_FIXTURE = buildLiteReport(
  FIXTURE_PAGE,
  "example.com/pricing",
  FIXTURE_FETCHED_AT,
);
