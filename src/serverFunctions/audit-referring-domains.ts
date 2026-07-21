/**
 * Read, access and refresh for the audit's off-page referring-domain signals.
 *
 * `getAuditReferringDomains` and `getAuditReferringDomainsAccess` are reads
 * (project membership only). `refreshAuditReferringDomains` is a mutation that
 * spends a credit; its role, plan and provider gates live in the service, which
 * resolves them before any provider call. The auth mode is resolved once here so
 * the mutation's gates cannot diverge on a split config.
 */
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { getAuthMode } from "@/lib/auth-mode";
import { AuditReferringDomainsService } from "@/server/features/audit/services/AuditReferringDomainsService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { auditReferringDomainsRequestSchema } from "@/types/schemas/audit";

export const getAuditReferringDomains = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) =>
    auditReferringDomainsRequestSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    return AuditReferringDomainsService.getSignals({
      auditId: data.auditId,
      projectId: context.projectId,
    });
  });

export const getAuditReferringDomainsAccess = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) =>
    auditReferringDomainsRequestSchema.parse(data),
  )
  .handler(async ({ context }) => {
    return AuditReferringDomainsService.getAccess({
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    });
  });

export const refreshAuditReferringDomains = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) =>
    auditReferringDomainsRequestSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    return AuditReferringDomainsService.refreshSnapshot({
      auditId: data.auditId,
      projectId: context.projectId,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
      billingCustomer: context,
    });
  });
