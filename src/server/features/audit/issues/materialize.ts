/**
 * Turns a sealed snapshot's stored facts into issue occurrences by running the
 * P02 rule catalog. Pure: no database, no clock, no network — the same snapshot
 * always materializes the same issues.
 */
import {
  evaluateCoreWebVitals,
  evaluateLiteSignals,
  type Issue,
} from "@/server/lib/seo-rules";
import { evaluate } from "@/server/lib/seo-rules/engine";
import {
  CROSS_PAGE_RULES,
  type CrossPageSignals,
} from "@/server/lib/audit/rules/cross-page";
import {
  buildCrossPageSignals,
  type LinkGraph,
} from "@/server/features/audit/issues/cross-page-signals";
import type { auditLighthouseResults } from "@/db/audit.schema";
import {
  getIssueGroup,
  type AuditIssueGroup,
} from "@/server/features/audit/issues/audit-issue-groups";
import {
  buildCoreWebVitalsEvidence,
  buildCrossPageEvidence,
  buildOnPageEvidence,
  type IssueEvidence,
} from "@/server/features/audit/issues/issue-evidence";
import {
  toOnPageSignals,
  type AuditPageRow,
} from "@/server/features/audit/issues/snapshot-signals";
import { classifyPageStatus } from "@/shared/http-status";

type AuditLighthouseRow = typeof auditLighthouseResults.$inferSelect;

export interface OccurrenceInput {
  pageId: string | null;
  ruleId: string;
  /** The rule revision that produced this verdict. */
  ruleVersion: string;
  issueGroup: AuditIssueGroup;
  severity: string;
  status: "warn" | "fail";
  url: string;
  evidence: IssueEvidence | null;
}

/**
 * Core Web Vitals are judged on the mobile run only. Both strategies are stored,
 * but one occurrence per (rule, url) must be deterministic, and mobile is what
 * Google indexes on. The strategy is recorded in the evidence.
 */
const CWV_STRATEGY = "mobile";

function isReportable(issue: Issue): issue is Issue & {
  status: "warn" | "fail";
} {
  return issue.status === "warn" || issue.status === "fail";
}

function toOccurrence(
  issue: Issue & { status: "warn" | "fail" },
  url: string,
  pageId: string | null,
  evidence: IssueEvidence | null,
): OccurrenceInput | null {
  const issueGroup = getIssueGroup(issue.id);
  // An unmapped rule is not part of the audit surface. Skipping is the honest
  // behaviour; a test asserts every rule we evaluate does have a group, so this
  // can never silently swallow a rule that was meant to be shown.
  if (!issueGroup) return null;

  return {
    pageId,
    ruleId: issue.id,
    ruleVersion: issue.lastReviewedDate,
    issueGroup,
    severity: issue.severity,
    status: issue.status,
    url,
    evidence,
  };
}

/**
 * Rules that judge the HTML document. A non-HTML resource (PDF, image) and a
 * failed fetch are both stored with empty placeholder fields, so running these
 * against such a row invents findings — a PDF listed in a sitemap would be
 * reported as missing its title, meta description, H1 and body content.
 */
const DOCUMENT_RULE_IDS = new Set([
  "meta-title",
  "meta-description",
  "meta-canonical",
  "structure-h1",
  "structure-heading-order",
  "structure-image-alt",
  "structure-word-count",
  "structure-structured-data",
  "server-indexable",
  "server-mixed-content",
]);

/**
 * No observation to judge. Two ways that happens: the crawl never got a response
 * (status 0), or the server refused this request to protect itself (429). Neither
 * says anything about the page, and `server-status` is not a document rule, so
 * without this gate every refused request produced a critical "does not respond
 * with a healthy status code" issue against a page we never read.
 */
function isUnobserved(page: AuditPageRow): boolean {
  const statusCode = page.statusCode ?? 0;
  return statusCode === 0 || classifyPageStatus(statusCode) === "throttled";
}

function appliesToPage(ruleId: string, page: AuditPageRow): boolean {
  if (!DOCUMENT_RULE_IDS.has(ruleId)) return true;
  // Document rules need an HTML body that was actually served.
  return page.isHtml && page.statusCode === 200;
}

function buildPageOccurrences(page: AuditPageRow): OccurrenceInput[] {
  // An unobserved URL is a finding in its own right, but the catalog has no rule
  // for it and the P02 release is frozen. Reporting it through the status rule
  // would grade it milder than a 404, so it is deferred to the cross-page rule
  // family rather than mis-graded here.
  if (isUnobserved(page)) return [];

  const signals = toOnPageSignals(page);

  return evaluateLiteSignals(signals)
    .filter(isReportable)
    .filter((issue) => appliesToPage(issue.id, page))
    .flatMap((issue) => {
      const occurrence = toOccurrence(
        issue,
        page.url,
        page.id,
        buildOnPageEvidence(issue.id, signals),
      );
      return occurrence ? [occurrence] : [];
    });
}

function buildLighthouseOccurrences(
  row: AuditLighthouseRow,
  url: string,
): OccurrenceInput[] {
  // A missing metric is not a passing metric. Treating null as 0 would score a
  // perfect LCP and hide the gap, so an incomplete run is simply not evaluated.
  if (
    row.lcpMs === null ||
    row.inpMs === null ||
    row.cls === null ||
    row.ttfbMs === null
  ) {
    return [];
  }

  const signals = {
    lcpMs: row.lcpMs,
    inpMs: row.inpMs,
    cls: row.cls,
    ttfbMs: row.ttfbMs,
  };

  return evaluateCoreWebVitals(signals)
    .filter(isReportable)
    .flatMap((issue) => {
      const occurrence = toOccurrence(
        issue,
        url,
        row.pageId,
        buildCoreWebVitalsEvidence(issue.id, signals, CWV_STRATEGY),
      );
      return occurrence ? [occurrence] : [];
    });
}

const STATUS_RANK: Record<"warn" | "fail", number> = { warn: 1, fail: 2 };

/**
 * Collapse to one occurrence per (rule, URL).
 *
 * Two crawled entries can share a final URL — the crawler dedupes the URLs it
 * queues but stores the URL it landed on, so `http://x` and `https://x`, or
 * `www` and apex, converge after redirects. Without collapsing, they would
 * violate the one-row-per-(audit, rule, url) guarantee and the whole write would
 * fail. The worse status wins so a duplicate can never downgrade a finding.
 */
function dedupeOccurrences(occurrences: OccurrenceInput[]): OccurrenceInput[] {
  const byKey = new Map<string, OccurrenceInput>();

  for (const occurrence of occurrences) {
    const key = `${occurrence.ruleId}\n${occurrence.url}`;
    const existing = byKey.get(key);
    if (
      !existing ||
      STATUS_RANK[occurrence.status] > STATUS_RANK[existing.status]
    ) {
      byKey.set(key, occurrence);
    }
  }

  return [...byKey.values()];
}

function buildCrossPageOccurrences(
  signals: CrossPageSignals,
  pageId: string | null,
): OccurrenceInput[] {
  return evaluate(CROSS_PAGE_RULES, signals)
    .filter(isReportable)
    .flatMap((issue) => {
      const occurrence = toOccurrence(
        issue,
        signals.url,
        pageId,
        buildCrossPageEvidence(issue.id, signals),
      );
      return occurrence ? [occurrence] : [];
    });
}

export function buildOccurrences(input: {
  pages: AuditPageRow[];
  lighthouse: AuditLighthouseRow[];
  /**
   * The pre-folded link graph, not the edge list. The caller streams edges into
   * it in chunks — a 5,000-page crawl of a nav-heavy site stores ~500,000 edges,
   * and holding them all to compute two page-sized tables was measured putting
   * ~120 MB in a 128 MB isolate on 14/08.
   */
  graph: LinkGraph;
  startUrl: string;
  crawlWasTruncated: boolean;
}): OccurrenceInput[] {
  const urlByPageId = new Map(input.pages.map((page) => [page.id, page.url]));

  const pageOccurrences = input.pages.flatMap(buildPageOccurrences);

  const crossPageOccurrences = buildCrossPageSignals({
    pages: input.pages,
    graph: input.graph,
    startUrl: input.startUrl,
    crawlWasTruncated: input.crawlWasTruncated,
  }).flatMap(({ page, signals }) =>
    buildCrossPageOccurrences(signals, page.id),
  );

  const lighthouseOccurrences = input.lighthouse.flatMap((row) => {
    if (row.strategy !== CWV_STRATEGY) return [];
    const url = urlByPageId.get(row.pageId);
    // A Lighthouse row whose page is gone has no URL to attribute the issue to.
    if (!url) return [];
    return buildLighthouseOccurrences(row, url);
  });

  return dedupeOccurrences([
    ...pageOccurrences,
    ...crossPageOccurrences,
    ...lighthouseOccurrences,
  ]);
}

/** Per-rule counts for the All Issues summary. */
export function buildRollups(occurrences: OccurrenceInput[]) {
  const byRuleId = new Map<
    string,
    {
      ruleId: string;
      issueGroup: AuditIssueGroup;
      severity: string;
      urls: Set<string>;
    }
  >();

  for (const occurrence of occurrences) {
    const existing = byRuleId.get(occurrence.ruleId);
    if (existing) {
      existing.urls.add(occurrence.url);
      continue;
    }
    byRuleId.set(occurrence.ruleId, {
      ruleId: occurrence.ruleId,
      issueGroup: occurrence.issueGroup,
      severity: occurrence.severity,
      urls: new Set([occurrence.url]),
    });
  }

  return [...byRuleId.values()].map((entry) => ({
    ruleId: entry.ruleId,
    issueGroup: entry.issueGroup,
    severity: entry.severity,
    urlCount: entry.urls.size,
  }));
}
