/**
 * Normalizes the PSI result + bounded crawl into a `DeepReport`.
 *
 * Pure and deterministic (no network) — the Workflow does the fetching, this
 * only runs the Phase 2 rules engine over the collected signals and scores
 * them. The primary URL gets on-page + technical + Core Web Vitals; internal
 * pages get on-page + technical only (PSI runs on the primary URL alone).
 */
import { AppError } from "@/server/lib/errors";
import {
  evaluateCoreWebVitals,
  evaluateGeoSignals,
  evaluateLiteSignals,
  score,
  type GeoSignals,
  type Issue,
  type RuleCategory,
} from "@/server/lib/seo-rules";
import type { PsiResult } from "@/server/lib/psi/pagespeed";
import type { CrawlResult } from "./crawl";
import type { DeepReport, DeepSignal, GeoSection } from "./deep-types";

const ON_PAGE_CATEGORIES = ["meta", "structure", "server"] as const;

/** Scores the GEO signals separately (never folded into the on-page number) and
 * carries the two informational facts the section surfaces but does not score. */
function buildGeoSection(geo: GeoSignals): GeoSection {
  const issues = evaluateGeoSignals(geo);
  return {
    score: averageScore(score(issues, ["geo"])),
    signals: issues.map(toDeepSignal),
    aiBots: {
      googleExtended: geo.botAccess.googleExtended,
      gptbot: geo.botAccess.gptbot,
    },
    llmsTxt: geo.llmsTxtFound,
  };
}

function toDeepSignal(issue: Issue): DeepSignal {
  return { ...issue };
}

function averageScore(scores: Array<{ score: number }>): number {
  if (scores.length === 0) return 0;
  return Math.round(
    scores.reduce((sum, entry) => sum + entry.score, 0) / scores.length,
  );
}

interface DeepReportInput {
  requestedUrl: string;
  crawl: CrawlResult;
  psi: PsiResult;
  /** GEO signals, or null when extraction was skipped or failed — the report
   * ships either way (decision C). */
  geo?: GeoSignals | null;
}

export function buildDeepReport(input: DeepReportInput): DeepReport {
  const { requestedUrl, crawl, psi, geo = null } = input;
  const primary = crawl.pages[0];
  if (!primary) {
    throw new AppError("UPSTREAM_UNAVAILABLE", "No pages were crawled");
  }

  const pages = crawl.pages.map((crawled) => {
    const issues = evaluateLiteSignals(crawled.page);
    return {
      url: crawled.url,
      normalizedUrl: crawled.normalizedUrl,
      statusCode: crawled.statusCode,
      overallScore: averageScore(score(issues, ON_PAGE_CATEGORIES)),
      signals: issues.map(toDeepSignal),
    };
  });

  const primaryIssues: Issue[] = [
    ...evaluateLiteSignals(primary.page),
    ...(psi.coreWebVitals ? evaluateCoreWebVitals(psi.coreWebVitals) : []),
  ];

  // Only score the categories actually checked — an unchecked category scores 0.
  const categories: RuleCategory[] = psi.coreWebVitals
    ? [...ON_PAGE_CATEGORIES, "core-web-vitals"]
    : [...ON_PAGE_CATEGORIES];
  const categoryScores = score(primaryIssues, categories);

  return {
    requestedUrl,
    finalUrl: primary.url,
    statusCode: primary.statusCode,
    fetchedAt: new Date().toISOString(),
    overallScore: averageScore(categoryScores),
    categoryScores,
    coreWebVitals: psi.coreWebVitals,
    cwvSource: psi.cwvSource,
    psiScores: psi.scores,
    signals: primaryIssues.map(toDeepSignal),
    pages,
    pageSummary: {
      title: primary.page.title,
      metaDescription: primary.page.metaDescription,
      h1: primary.page.h1s[0] || null,
      wordCount: primary.page.wordCount,
    },
    crawl: { pagesCrawled: crawl.pages.length },
    geo: geo ? buildGeoSection(geo) : null,
  };
}
