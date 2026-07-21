/**
 * Read path for the audit's Search Console signals (traffic change + Top-10
 * drop). A read like the other audit surfaces: only the project-membership gate
 * applies, and the service itself enforces the OAuth grant and the property↔
 * target match before any GSC call.
 */
import { createServerFn } from "@tanstack/react-start";
import { AuditSearchSignalsService } from "@/server/features/audit/services/AuditSearchSignalsService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { getAuditSearchSignalsSchema } from "@/types/schemas/audit";

export const getAuditSearchSignals = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getAuditSearchSignalsSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditSearchSignalsService.getSignals({
      auditId: data.auditId,
      projectId: context.projectId,
    });
  });
