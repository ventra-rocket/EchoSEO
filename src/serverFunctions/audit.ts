import { createServerFn } from "@tanstack/react-start";
import { env, waitUntil } from "cloudflare:workers";
import { getAuthMode } from "@/lib/auth-mode";
import { AuditService } from "@/server/features/audit/services/AuditService";
import { AuditVerificationService } from "@/server/features/audit/services/AuditVerificationService";
import { IndexNowService } from "@/server/features/audit/services/IndexNowService";
import { AuditIndexStatusService } from "@/server/features/audit/services/AuditIndexStatusService";
import { SiteCardService } from "@/server/features/audit/services/SiteCardService";
import { CompetitorAuditService } from "@/server/features/audit/services/CompetitorAuditService";
import { orgMayUseManagedFeatures } from "@/server/billing/subscription";
import { AppError } from "@/server/lib/errors";
import { captureServerEvent } from "@/server/lib/posthog";
import {
  requireAuthenticatedContext,
  requireProjectContext,
} from "@/serverFunctions/middleware";
import {
  addAuditCompetitorSchema,
  deleteAuditSchema,
  getAuditAccessSchema,
  getAuditHistorySchema,
  getAuditResultsSchema,
  getAuditIndexStatusSchema,
  getAuditStatusSchema,
  getAuditVerificationOutcomeSchema,
  getCrawlProgressSchema,
  indexNowRequestSchema,
  inspectAuditUrlSchema,
  listAuditCompetitorsSchema,
  removeAuditCompetitorSchema,
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
    // gate it on managed access in hosted mode. Allowlisted orgs (founder +
    // invited) pass while billing is deferred; everyone else gets a clean
    // PAYMENT_REQUIRED rather than a 500 when Autumn is unconfigured.
    if (
      authMode === "hosted" &&
      !(await orgMayUseManagedFeatures(context.organizationId))
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
      baselineAuditId: data.baselineAuditId,
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

/**
 * One card per audit target in the workspace, for the Projects page.
 *
 * Account-level rather than project-scoped: the page lists every site, and a
 * per-project round trip would make it cost more the more sites a customer has.
 */
export const getSiteCards = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) =>
    SiteCardService.listForOrganization(context.organizationId),
  );

export const getAuditAccess = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getAuditAccessSchema.parse(data))
  .handler(async ({ context }) => {
    return AuditService.getAccess({
      projectId: context.projectId,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    });
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

export const getAuditVerificationOutcome = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) =>
    getAuditVerificationOutcomeSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    return AuditVerificationService.resolveVerificationOutcome({
      auditId: data.auditId,
      projectId: context.projectId,
    });
  });

export const getIndexNowStatus = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => indexNowRequestSchema.parse(data))
  .handler(async ({ data, context }) => {
    return IndexNowService.getStatus({
      projectId: context.projectId,
      auditId: data.auditId,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    });
  });

export const setupIndexNow = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => indexNowRequestSchema.parse(data))
  .handler(async ({ data, context }) => {
    return IndexNowService.setupKey({
      projectId: context.projectId,
      auditId: data.auditId,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    });
  });

export const verifyIndexNowKey = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => indexNowRequestSchema.parse(data))
  .handler(async ({ data, context }) => {
    return IndexNowService.verifyKey({
      projectId: context.projectId,
      auditId: data.auditId,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    });
  });

export const submitIndexNow = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => indexNowRequestSchema.parse(data))
  .handler(async ({ data, context }) => {
    return IndexNowService.submit({
      projectId: context.projectId,
      auditId: data.auditId,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    });
  });

export const getAuditIndexStatus = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getAuditIndexStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditIndexStatusService.getContext({
      projectId: context.projectId,
      auditId: data.auditId,
    });
  });

export const inspectAuditUrl = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => inspectAuditUrlSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditIndexStatusService.inspectUrl({
      projectId: context.projectId,
      auditId: data.auditId,
      url: data.url,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    });
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

export const listAuditCompetitors = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => listAuditCompetitorsSchema.parse(data))
  .handler(async ({ data, context }) =>
    CompetitorAuditService.list({
      projectId: context.projectId,
      auditId: data.auditId,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    }),
  );

export const addAuditCompetitor = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => addAuditCompetitorSchema.parse(data))
  .handler(async ({ data, context }) =>
    CompetitorAuditService.add({
      projectId: context.projectId,
      auditId: data.auditId,
      domain: data.domain,
      label: data.label ?? null,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    }),
  );

export const removeAuditCompetitor = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => removeAuditCompetitorSchema.parse(data))
  .handler(async ({ data, context }) => {
    await CompetitorAuditService.remove({
      projectId: context.projectId,
      auditId: data.auditId,
      competitorId: data.competitorId,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    });
    return { success: true };
  });
