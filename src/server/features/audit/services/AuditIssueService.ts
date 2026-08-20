/**
 * Materializes and serves the professional audit's issue list.
 *
 * The rules themselves live in the P02 knowledge base — this service only
 * decides *when* they run and *where* the verdicts are stored.
 */
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditSnapshotRepository } from "@/server/features/audit/repositories/AuditSnapshotRepository";
import { AuditIssueRepository } from "@/server/features/audit/repositories/AuditIssueRepository";
import {
  buildOccurrences,
  buildRollups,
} from "@/server/features/audit/issues/materialize";
import {
  brokenPageUrls,
  buildLinkGraph,
} from "@/server/features/audit/issues/cross-page-signals";
import { getIssueFixText } from "@/server/features/audit/issues/issue-fix-text";
import type { IssueEvidence } from "@/server/features/audit/issues/issue-evidence";
import { AppError } from "@/server/lib/errors";
import { parseAuditConfig } from "@/server/lib/audit/types";
import type { Locale } from "@/server/lib/seo-rules";
import { safeHttpUrl } from "@/lib/safe-url";

const MAX_ISSUE_PAGE_SIZE = 100;

/**
 * Materialize issues for a completed audit.
 *
 * Reads only a **sealed** snapshot: a running or failed crawl has no baseline
 * and must never produce findings.
 */
async function materializeForAudit(input: {
  auditId: string;
  projectId: string;
}) {
  const snapshot = await AuditSnapshotRepository.getSnapshotForAudit(
    input.auditId,
  );
  if (!snapshot) {
    return { materialized: false, occurrenceCount: 0 };
  }

  const { audit, pages, lighthouse } =
    await AuditRepository.getAuditResultsForProject(
      input.auditId,
      input.projectId,
    );
  if (!audit) {
    return { materialized: false, occurrenceCount: 0 };
  }

  // Two bounded queries instead of the edge list. Measured on production 14/08:
  // reading all ~500,000 edges of a link-dense 5,000-page crawl put ~120 MB in a
  // 128 MB isolate and died in 4 seconds; paging them in 25,000-row chunks
  // survived the memory and still lost the step after 54 seconds of round trips.
  // The aggregates the rules actually read are bounded by page count.
  const brokenTargets = brokenPageUrls(pages);
  const [inboundCounts, brokenEdges] = await Promise.all([
    AuditRepository.listInboundCountsByTarget(input.auditId),
    AuditRepository.listEdgesToTargets(input.auditId, brokenTargets),
  ]);
  const graph = buildLinkGraph({ pages, inboundCounts, brokenEdges });

  // A crawl that stopped at its page cap has an incomplete link graph: pages
  // that would have linked to the ones it did fetch were never fetched
  // themselves. Rules that reason about the graph must know that.
  const maxPages = parseAuditConfig(audit.config)?.maxPages;
  const crawlWasTruncated =
    maxPages !== undefined && audit.pagesCrawled >= maxPages;

  const occurrences = buildOccurrences({
    pages,
    lighthouse,
    graph,
    startUrl: audit.startUrl,
    crawlWasTruncated,
  });
  const rollups = buildRollups(occurrences);

  // Mark the snapshot unanswered for the duration of the rewrite. A re-run
  // deletes the previous issues first, so a failure partway through would
  // otherwise leave the earlier run's timestamp standing over an empty table
  // and read as "materialized, no issues found".
  await AuditSnapshotRepository.clearSnapshotIssuesMaterialized(input.auditId);
  await AuditIssueRepository.replaceIssuesForAudit({
    auditId: input.auditId,
    projectId: input.projectId,
    occurrences,
    rollups,
  });
  await AuditSnapshotRepository.markSnapshotIssuesMaterialized(input.auditId);

  return { materialized: true, occurrenceCount: occurrences.length };
}

async function requireAudit(auditId: string, projectId: string) {
  const audit = await AuditRepository.getAuditForProject(auditId, projectId);
  if (!audit) throw new AppError("NOT_FOUND");
  return audit;
}

/**
 * Per-rule counts for the All Issues summary.
 *
 * `materializedAt` is part of the contract, not a detail: an empty `rollups` is
 * ambiguous on its own, and a reader that renders it as "no issues" would show
 * a clean bill of health for an audit whose materializer died. Null means the
 * question was never answered.
 */
async function getIssueSummary(
  auditId: string,
  projectId: string,
  locale: Locale = "en",
) {
  await requireAudit(auditId, projectId);

  const [snapshot, rollups] = await Promise.all([
    AuditSnapshotRepository.getSnapshotForAudit(auditId),
    AuditIssueRepository.getRollupsForAudit(auditId),
  ]);

  return {
    materializedAt: snapshot?.issuesMaterializedAt ?? null,
    rollups: rollups.map((rollup) => ({
      ruleId: rollup.ruleId,
      issueGroup: rollup.issueGroup,
      severity: rollup.severity,
      urlCount: rollup.urlCount,
      fix: getIssueFixText(rollup.ruleId, locale),
    })),
  };
}

/**
 * One page of affected URLs, filtered and counted in SQL.
 *
 * No locale parameter: these rows carry no rule text. The localized guidance
 * belongs to the rule, and the summary already resolved it once.
 */
async function listIssueOccurrences(input: {
  auditId: string;
  projectId: string;
  issueGroup?: string;
  severity?: string;
  ruleId?: string;
  urlContains?: string;
  limit?: number;
  offset?: number;
}) {
  await requireAudit(input.auditId, input.projectId);

  const limit = Math.min(Math.max(input.limit ?? 50, 1), MAX_ISSUE_PAGE_SIZE);
  const offset = Math.max(input.offset ?? 0, 0);
  const filter = {
    auditId: input.auditId,
    issueGroup: input.issueGroup,
    severity: input.severity,
    ruleId: input.ruleId,
    urlContains: input.urlContains,
  };

  const [occurrences, total] = await Promise.all([
    AuditIssueRepository.listOccurrences({ ...filter, limit, offset }),
    AuditIssueRepository.countOccurrences(filter),
  ]);

  return {
    occurrences: occurrences.map(toClientOccurrence),
    total,
    limit,
    offset,
  };
}

/**
 * Shape an occurrence for the browser: only the fields the URL table renders.
 *
 * Remediation text is deliberately NOT attached per occurrence. It is identical
 * for every row of a rule, so shipping it here would repeat the same paragraphs
 * fifty times a page; the summary carries it once per rule instead.
 *
 * Two things happen here rather than in the client. `evidenceJson` is parsed
 * once server-side so a malformed payload degrades to an empty list instead of
 * throwing mid-render. And `url` — a string this crawler read off a customer's
 * site — is run through the http(s) allow-list, so the client receives a
 * `safeUrl` that is either linkable or null and never has to make that call
 * itself. `url` is still returned for display: JSX escapes it as text, it just
 * must not become an href.
 */
function toClientOccurrence(occurrence: {
  id: string;
  status: string;
  url: string;
  evidenceJson: string | null;
}) {
  return {
    id: occurrence.id,
    status: occurrence.status,
    url: occurrence.url,
    safeUrl: safeHttpUrl(occurrence.url),
    evidence: parseEvidence(occurrence.evidenceJson),
  };
}

/** One evidence field, already reduced to text the client can render as-is. */
interface IssueEvidenceField {
  key: string;
  value: string;
}

/**
 * Flatten stored evidence into display-ready key/value text.
 *
 * Evidence is read back from a column that any past rule version could have
 * written, so it is re-checked rather than trusted: anything that is not a
 * plain object degrades to an empty list. Values are reduced to strings here
 * rather than shipped as an open-ended payload, so the client renders text and
 * only text — nested structure is the kind of thing a renderer starts making
 * decisions about, and this data came off a stranger's website.
 */
function parseEvidence(evidenceJson: string | null): IssueEvidenceField[] {
  if (!evidenceJson) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(evidenceJson);
  } catch {
    return [];
  }
  if (!isEvidenceObject(parsed)) return [];

  return Object.entries(parsed).flatMap(([key, value]) => {
    const text = formatEvidenceValue(value);
    return text === null ? [] : [{ key, value: text }];
  });
}

function isEvidenceObject(value: unknown): value is IssueEvidence {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatEvidenceValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.flatMap((entry) => {
      const text = formatEvidenceValue(entry);
      return text === null ? [] : [text];
    });
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return null;
}

export const AuditIssueService = {
  materializeForAudit,
  getIssueSummary,
  listIssueOccurrences,
} as const;
