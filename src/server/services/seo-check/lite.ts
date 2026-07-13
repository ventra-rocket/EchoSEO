/**
 * `runLiteCheck` — the free, instant, on-page-only SEO check (Decision D).
 *
 * safeFetch (SSRF-gated) -> parse-html (cheerio) -> deterministic on-page
 * signal evaluation -> LiteReport. No Lighthouse/CWV here — that's the async
 * Deep tier via the Google PSI API (Phase 3). Phase 2 later attaches
 * Google-cited fixes to these signals via the rules engine.
 */
import { safeFetch, readBoundedText } from "./safe-fetch";
import { parseLitePage, type ParsedPage } from "./parse-html";
import {
  SIGNAL_CATEGORIES,
  type CategoryScore,
  type LiteReport,
  type Signal,
  type SignalCategory,
  type SignalStatus,
} from "./types";

/** LCP, INP, CLS, TTFB — reported by the Deep tier via the PSI API. */
const CORE_WEB_VITALS_METRIC_COUNT = 4;

const SIGNAL_STATUS_WEIGHT: Record<SignalStatus, number> = {
  pass: 1,
  warn: 0.5,
  fail: 0,
};

export async function runLiteCheck(inputUrl: string): Promise<LiteReport> {
  const startedAt = Date.now();
  const { response, finalUrl } = await safeFetch(inputUrl);
  const html = await readBoundedText(response);
  const responseTimeMs = Date.now() - startedAt;

  const page = parseLitePage(html, finalUrl, response.status, responseTimeMs);

  const signals = evaluateSignals(page, finalUrl);
  const categoryScores = scoreCategories(signals);
  const overallScore = Math.round(
    categoryScores.reduce((sum, entry) => sum + entry.score, 0) /
      categoryScores.length,
  );

  return {
    requestedUrl: inputUrl,
    finalUrl,
    statusCode: response.status,
    fetchedAt: new Date().toISOString(),
    overallScore,
    categoryScores,
    signals,
    // Raw scanned text — JSX escapes on render. Never dangerouslySetInnerHTML
    // this; a future raw-HTML sink (e.g. the Phase 5 email body) must escape
    // via output-encode.ts itself at that sink, not double-escape data here.
    pageSummary: {
      title: page.title,
      metaDescription: page.metaDescription,
      h1: page.h1s[0] || null,
      wordCount: page.wordCount,
    },
    deepTeaser: { coreWebVitalsMetricCount: CORE_WEB_VITALS_METRIC_COUNT },
  };
}

function signal(
  id: string,
  category: SignalCategory,
  status: SignalStatus,
  label: string,
): Signal {
  return { id, category, status, label };
}

/** True if a heading level jumps by more than one from the highest seen so far. */
function hasHeadingLevelSkip(order: number[]): boolean {
  let maxSeen = 0;
  for (const level of order) {
    if (maxSeen > 0 && level > maxSeen + 1) return true;
    if (level > maxSeen) maxSeen = level;
  }
  return false;
}

function evaluateSignals(page: ParsedPage, finalUrl: string): Signal[] {
  const titleLen = page.title.length;
  const descriptionLen = page.metaDescription.length;
  const h1Count = page.h1s.length;
  const imagesWithSrc = page.images.filter((img) => img.src);
  // alt="" is a valid, intentional "decorative image" marker (WCAG) — only a
  // truly absent alt attribute (null) counts as missing.
  const imagesMissingAlt = imagesWithSrc.filter(
    (img) => img.alt === null,
  ).length;
  const robotsBlocksIndex = (page.robotsMeta ?? "")
    .toLowerCase()
    .includes("noindex");

  return [
    signal(
      "meta-title",
      "meta",
      titleLen === 0
        ? "fail"
        : titleLen < 10 || titleLen > 60
          ? "warn"
          : "pass",
      "Title tag present, 10-60 characters",
    ),
    signal(
      "meta-description",
      "meta",
      descriptionLen === 0
        ? "fail"
        : descriptionLen < 50 || descriptionLen > 160
          ? "warn"
          : "pass",
      "Meta description present, 50-160 characters",
    ),
    signal(
      "meta-canonical",
      "meta",
      page.canonical ? "pass" : "fail",
      "Canonical link tag present",
    ),
    signal(
      "structure-h1",
      "structure",
      h1Count === 1 ? "pass" : h1Count === 0 ? "fail" : "warn",
      "Exactly one H1 heading",
    ),
    signal(
      "structure-heading-order",
      "structure",
      hasHeadingLevelSkip(page.headingOrder) ? "warn" : "pass",
      "Heading levels do not skip (e.g. H2 straight to H4)",
    ),
    signal(
      "structure-image-alt",
      "structure",
      imagesWithSrc.length === 0 || imagesMissingAlt === 0
        ? "pass"
        : imagesMissingAlt === imagesWithSrc.length
          ? "fail"
          : "warn",
      "Images have descriptive alt text",
    ),
    signal(
      "structure-word-count",
      "structure",
      page.wordCount >= 600 ? "pass" : page.wordCount >= 300 ? "warn" : "fail",
      "Enough indexable content (300+ words)",
    ),
    signal(
      "structure-structured-data",
      "structure",
      page.hasStructuredData ? "pass" : "warn",
      "Structured data (JSON-LD) present",
    ),
    signal(
      "server-https",
      "server",
      finalUrl.startsWith("https:") ? "pass" : "fail",
      "Served over HTTPS",
    ),
    signal(
      "server-status",
      "server",
      page.statusCode === 200
        ? "pass"
        : page.statusCode < 400
          ? "warn"
          : "fail",
      "Responds with a healthy status code",
    ),
    signal(
      "server-indexable",
      "server",
      robotsBlocksIndex ? "fail" : "pass",
      "Not blocked from indexing via robots meta",
    ),
    signal(
      "server-mixed-content",
      "server",
      page.hasMixedContent ? "fail" : "pass",
      "No mixed HTTP content on an HTTPS page",
    ),
  ];
}

function scoreCategories(signals: Signal[]): CategoryScore[] {
  return SIGNAL_CATEGORIES.map((category) => {
    const inCategory = signals.filter((entry) => entry.category === category);
    const score = inCategory.length
      ? Math.round(
          (inCategory.reduce(
            (sum, entry) => sum + SIGNAL_STATUS_WEIGHT[entry.status],
            0,
          ) /
            inCategory.length) *
            100,
        )
      : 0;
    return { category, score };
  });
}
