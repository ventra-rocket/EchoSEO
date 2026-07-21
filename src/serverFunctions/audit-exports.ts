/**
 * Request and listing for audit issue exports. Requesting is a mutation (queues
 * a Workflow) gated on the investigate role inside the service; the listing read
 * carries only project membership. The download itself is a separate authorized
 * route (`/api/audit/exports/download?jobId=`) so it can stream the artifact
 * rather than serialize it here.
 */
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { getAuthMode } from "@/lib/auth-mode";
import { AuditExportService } from "@/server/features/audit/services/AuditExportService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  listAuditExportsSchema,
  requestAuditExportSchema,
} from "@/types/schemas/audit";

export const requestAuditExport = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => requestAuditExportSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditExportService.requestExport({
      auditId: data.auditId,
      projectId: context.projectId,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
      filters: {
        issueGroup: data.issueGroup,
        severity: data.severity,
        ruleId: data.ruleId,
        urlContains: data.urlContains,
      },
    });
  });

export const listAuditExports = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => listAuditExportsSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditExportService.listExports({
      auditId: data.auditId,
      projectId: context.projectId,
    });
  });
