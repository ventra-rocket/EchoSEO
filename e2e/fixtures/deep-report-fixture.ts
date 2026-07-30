import { makeGoodPage } from "@/server/lib/seo-rules/__tests__/on-page-signals-fixture";
import type { PsiResult } from "@/server/lib/psi/pagespeed";
import type { GeoSignals } from "@/server/lib/seo-rules";
import { buildDeepReport } from "@/server/services/seo-check/deep";

/**
 * A Deep report, built through the real `buildDeepReport`.
 *
 * Same reasoning as the Lite fixture: a real Deep report needs a solved
 * Turnstile challenge, a confirmed email, and a Workflow run, so the shareable
 * report page has never been renderable under test. Going through the real
 * builder means the scores, categories, and measurements are whatever
 * production would produce for this crawl and these PSI numbers.
 *
 * The Core Web Vitals are chosen to sit on either side of Google's thresholds
 * so the report exercises every verdict and both duration formats: a
 * sub-second TTFB stays in milliseconds while LCP crosses into seconds.
 */
const PRIMARY = "https://example.com/pricing";

const PSI: PsiResult = {
  coreWebVitals: {
    // Over 2.5s, under 4s — a warning, and rendered in seconds.
    lcpMs: 3200,
    // Well inside the 200ms budget, and rendered in milliseconds.
    inpMs: 140,
    // Over the 0.1 threshold: the two decimals are the finding.
    cls: 0.18,
    ttfbMs: 640,
  },
  cwvSource: "field",
  scores: {
    performance: 62,
    seo: 92,
    accessibility: 88,
    bestPractices: 79,
  },
};

/**
 * A page that is crawlable and answerable but declares a snippet limit and
 * carries schema — so the AI-search section exercises both of its measured
 * rules: the robots directive it would otherwise never show, and the schema
 * types found on the page.
 */
const GEO: GeoSignals = {
  botAccess: { googlebot: true, googleExtended: false, gptbot: false },
  schemaTypes: ["Organization", "FAQPage"],
  hasSingleH1: true,
  hasHeadingHierarchy: true,
  robotsMeta: "index, follow, max-snippet:0",
  llmsTxtFound: false,
};

export const DEEP_REPORT_FIXTURE = buildDeepReport({
  requestedUrl: PRIMARY,
  crawl: {
    pages: [PRIMARY, `${PRIMARY}/enterprise`, `${PRIMARY}/faq`].map((url) => ({
      url,
      statusCode: 200,
      page: makeGoodPage({
        url,
        // Short on purpose, so the primary page has a finding to lead with.
        metaDescription: "Our pricing.",
      }),
    })),
  },
  psi: PSI,
  geo: GEO,
});
