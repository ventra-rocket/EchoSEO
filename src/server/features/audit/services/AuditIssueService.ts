/**
 * Materializes and serves the professional audit's issue list.
 *
 * The rules themselves live in the P02 knowledge base — this service only
 * decides *when* they run and *where* the verdicts are stored.
 */
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditIssueRepository } from "@/server/features/audit/repositories/AuditIssueRepository";
import {
  buildOccurrences,
  buildRollups,
} from "@/server/features/audit/issues/materialize";
import { AppError } from "@/server/lib/errors";

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
  const snapshot = await AuditRepository.getSnapshotForAudit(input.auditId);
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

  const occurrences = buildOccurrences({ pages, lighthouse });
  const rollups = buildRollups(occurrences);

  await AuditIssueRepository.replaceIssuesForAudit({
    auditId: input.auditId,
    projectId: input.projectId,
    occurrences,
    rollups,
  });
  await AuditRepository.markSnapshotIssuesMaterialized(input.auditId);

  return { materialized: true, occurrenceCount: occurrences.length };
}

async function requireAudit(auditId: string, projectId: string) {
  const audit = await AuditRepository.getAuditForProject(auditId, projectId);
  if (!audit) throw new AppError("NOT_FOUND");
  return audit;
}

/** Per-rule counts for the All Issues summary. */
async function getIssueSummary(auditId: string, projectId: string) {
  await requireAudit(auditId, projectId);
  return AuditIssueRepository.getRollupsForAudit(auditId);
}

/** One page of affected URLs, filtered and counted in SQL. */
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

  return { occurrences, total, limit, offset };
}

export const AuditIssueService = {
  materializeForAudit,
  getIssueSummary,
  listIssueOccurrences,
} as const;
