/**
 * `runLiteCheck` — the free, instant, on-page-only SEO check (Decision D).
 *
 * safeFetch (SSRF-gated) -> parse-html (cheerio) -> seo-rules engine
 * (Phase 2, Google-cited fixes) -> LiteReport. No Lighthouse/CWV here —
 * that's the async Deep tier via the Google PSI API (Phase 3).
 */
import { AppError } from "@/server/lib/errors";
import { safeFetch, readBoundedText } from "./safe-fetch";
import { parseLitePage, type ParsedPage } from "./parse-html";
import {
  evaluateLiteSignals,
  score as scoreIssues,
  type Issue,
  type RuleCategory,
} from "@/server/lib/seo-rules";
import {
  SIGNAL_CATEGORIES,
  type CategoryScore,
  type LiteReport,
  type Signal,
  type SignalCategory,
} from "./types";

/** LCP, INP, CLS, TTFB — reported by the Deep tier via the PSI API. */
const CORE_WEB_VITALS_METRIC_COUNT = 4;

export async function runLiteCheck(inputUrl: string): Promise<LiteReport> {
  const startedAt = Date.now();
  const { response, finalUrl } = await safeFetch(inputUrl);
  // Only a 2xx body is the page the visitor asked about. A non-2xx response
  // still carries HTML — a 404 page, an origin's 5xx, or (for a hostname that
  // does not resolve) Cloudflare's own error page — and scoring that markup
  // reports a plausible-looking score for a site we never actually read.
  if (!response.ok) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "Target page did not return 2xx",
      { statusCode: String(response.status) },
    );
  }
  const html = await readBoundedText(response);
  const responseTimeMs = Date.now() - startedAt;

  const page: ParsedPage = parseLitePage(
    html,
    finalUrl,
    response.status,
    responseTimeMs,
  );

  const issues = evaluateLiteSignals(page);
  const signals = issues.map(toSignal);
  const categoryScores: CategoryScore[] = scoreIssues(
    issues,
    SIGNAL_CATEGORIES,
  ).map((entry) => ({
    category: toSignalCategory(entry.category),
    score: entry.score,
  }));
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

function isSignalCategory(category: RuleCategory): category is SignalCategory {
  return (SIGNAL_CATEGORIES as readonly RuleCategory[]).includes(category);
}

/**
 * `RuleCategory` is broader than `SignalCategory` (it also covers
 * `core-web-vitals` for the Deep tier) — `evaluateLiteSignals` only ever
 * runs the on-page + technical rule sets, so this should never throw; it's
 * a checked narrowing rather than a blind cast.
 */
function toSignalCategory(category: RuleCategory): SignalCategory {
  if (!isSignalCategory(category)) {
    throw new Error(
      `Lite check produced an out-of-scope signal category: ${category}`,
    );
  }
  return category;
}

function toSignal(issue: Issue): Signal {
  return {
    id: issue.id,
    category: toSignalCategory(issue.category),
    status: issue.status,
    label: issue.label,
    severity: issue.severity,
    problem: issue.problem,
    fixSteps: issue.fixSteps,
    googleSourceUrl: issue.googleSourceUrl,
    guideQuote: issue.guideQuote,
    lastReviewedDate: issue.lastReviewedDate,
  };
}
