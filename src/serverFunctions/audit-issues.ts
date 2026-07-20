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
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  getAuditIssueSummarySchema,
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
