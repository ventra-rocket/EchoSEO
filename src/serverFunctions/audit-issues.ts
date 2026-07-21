/**
 * Read path for the professional audit's All Issues surface.
 *
 * Separate from `audit.ts` because the issue queries are the only audit reads
 * that page and filter in SQL — everything else there hands the client a whole
 * result set.
 *
 * Both functions are reads, so they carry no role gate beyond project
 * membership: `canReadAudit` is true for every workspace role, and
 * `requireProjectContext` plus the service's own project check already bind an
 * audit to the caller's organization. Role gates in this feature exist to block
 * mutations, and this module has none.
 */
import { createServerFn } from "@tanstack/react-start";
import { AuditIssueService } from "@/server/features/audit/services/AuditIssueService";
import { AuditExplanationService } from "@/server/features/audit/services/AuditExplanationService";
import { AuditComparisonService } from "@/server/features/audit/services/AuditComparisonService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  explainAuditIssueSchema,
  getAuditIssueComparisonSchema,
  getAuditIssueSummarySchema,
  getComparableSnapshotsSchema,
  listAuditIssuesSchema,
} from "@/types/schemas/audit";

export const getAuditIssueSummary = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getAuditIssueSummarySchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditIssueService.getIssueSummary(
      data.auditId,
      context.projectId,
      data.locale,
    );
  });

/**
 * Optional AI commentary for one rule. Never throws for a missing key, an
 * empty balance, a rate limit or a model failure — it answers
 * `{ available: false }` and the caller renders the issue without a panel.
 */
export const explainAuditIssue = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => explainAuditIssueSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditExplanationService.explainIssue({
      auditId: data.auditId,
      projectId: context.projectId,
      ruleId: data.ruleId,
      locale: data.locale,
      billingCustomer: context,
    });
  });

export const listAuditIssues = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => listAuditIssuesSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditIssueService.listIssueOccurrences({
      auditId: data.auditId,
      projectId: context.projectId,
      issueGroup: data.issueGroup,
      severity: data.severity,
      ruleId: data.ruleId,
      urlContains: data.urlContains,
      limit: data.limit,
      offset: data.offset,
    });
  });

/** Sealed snapshots of this audit's target, for the comparison baseline picker. */
export const getComparableSnapshots = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getComparableSnapshotsSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditComparisonService.listComparableSnapshots({
      auditId: data.auditId,
      projectId: context.projectId,
    });
  });

/**
 * Crawl-only issue delta against a baseline snapshot of the same target. Refuses
 * to compare when either snapshot's issues were never materialized — an
 * unmaterialized baseline would otherwise read as a wholesale resolution.
 */
export const getAuditIssueComparison = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getAuditIssueComparisonSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditComparisonService.resolveComparison({
      auditId: data.auditId,
      projectId: context.projectId,
      baselineAuditId: data.baselineAuditId,
      locale: data.locale,
    });
  });
