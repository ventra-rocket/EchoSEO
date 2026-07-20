import { createServerFn } from "@tanstack/react-start";
import { env, waitUntil } from "cloudflare:workers";
import { getAuthMode } from "@/lib/auth-mode";
import { AuditService } from "@/server/features/audit/services/AuditService";
import { customerHasManagedAccess } from "@/server/billing/subscription";
import { AppError } from "@/server/lib/errors";
import { captureServerEvent } from "@/server/lib/posthog";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  deleteAuditSchema,
  getAuditHistorySchema,
  getAuditResultsSchema,
  getAuditStatusSchema,
  getCrawlProgressSchema,
  startAuditSchema,
} from "@/types/schemas/audit";

export const startAudit = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => startAuditSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Resolve the auth mode once so the payment gate and the audit
    // role/verification gates cannot diverge on a split config.
    const authMode = getAuthMode(env.AUTH_MODE);

    // The crawler runs on our Workers compute and isn't credit-metered, so
    // gate it on plan access in hosted mode (grandfathered free plans pass).
    if (
      authMode === "hosted" &&
      !(await customerHasManagedAccess(context.organizationId))
    ) {
      throw new AppError("PAYMENT_REQUIRED", "Subscribe to run site audits");
    }

    const result = await AuditService.startAudit({
      actorUserId: context.userId,
      authMode,
      billingCustomer: context,
      projectId: context.projectId,
      startUrl: data.startUrl,
      maxPages: data.maxPages,
      lighthouseStrategy: data.lighthouseStrategy,
    });

    waitUntil(
      captureServerEvent({
        distinctId: context.userId,
        event: "site_audit:start",
        organizationId: context.organizationId,
        properties: {
          project_id: context.projectId,
          max_pages: data.maxPages ?? 50,
          run_lighthouse: data.lighthouseStrategy !== "none",
        },
      }),
    );

    return result;
  });

export const getAuditStatus = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getAuditStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditService.getStatus(data.auditId, context.projectId);
  });

export const getAuditResults = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getAuditResultsSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditService.getResults(data.auditId, context.projectId);
  });

export const getAuditHistory = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getAuditHistorySchema.parse(data))
  .handler(async ({ context }) => {
    return AuditService.getHistory(context.projectId);
  });

export const getCrawlProgress = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getCrawlProgressSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditService.getCrawlProgress(data.auditId, context.projectId);
  });

export const deleteAudit = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => deleteAuditSchema.parse(data))
  .handler(async ({ data, context }) => {
    await AuditService.remove({
      auditId: data.auditId,
      projectId: context.projectId,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    });
    return { success: true };
  });
