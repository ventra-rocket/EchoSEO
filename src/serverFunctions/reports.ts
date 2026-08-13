import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { getAuthMode } from "@/lib/auth-mode";
import { ReportSubscriptionService } from "@/server/features/reports/ReportSubscriptionService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  getReportSubscriptionSchema,
  saveReportSubscriptionSchema,
  setReportSubscriptionEnabledSchema,
} from "@/types/schemas/reports";

export const getReportSubscription = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getReportSubscriptionSchema.parse(data))
  .handler(async ({ data, context }) =>
    ReportSubscriptionService.get({
      actorUserId: context.userId,
      authMode: getAuthMode(env.AUTH_MODE),
      organizationId: context.organizationId,
      projectId: context.projectId,
      auditId: data.auditId,
    }),
  );

/**
 * Save the recipient and arm the weekly cadence.
 *
 * The caller becomes the subscription's owner: the scheduled crawl later runs
 * under their workspace role, because a synthetic system user would resolve to
 * `viewer` in hosted mode and every scheduled run would be refused.
 */
export const saveReportSubscription = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => saveReportSubscriptionSchema.parse(data))
  .handler(async ({ data, context }) =>
    ReportSubscriptionService.save({
      actorUserId: context.userId,
      authMode: getAuthMode(env.AUTH_MODE),
      organizationId: context.organizationId,
      projectId: context.projectId,
      auditId: data.auditId,
      ownerEmail: context.userEmail,
      recipientEmail: data.recipientEmail,
      locale: data.locale,
      maxPages: data.maxPages,
    }),
  );

export const setReportSubscriptionEnabled = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) =>
    setReportSubscriptionEnabledSchema.parse(data),
  )
  .handler(async ({ data, context }) =>
    ReportSubscriptionService.setEnabled({
      actorUserId: context.userId,
      authMode: getAuthMode(env.AUTH_MODE),
      organizationId: context.organizationId,
      projectId: context.projectId,
      auditId: data.auditId,
      enabled: data.enabled,
    }),
  );
