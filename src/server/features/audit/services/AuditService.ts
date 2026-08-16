import { env } from "cloudflare:workers";
import type { AuthMode } from "@/lib/auth-mode";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditTargetRepository } from "@/server/features/audit/repositories/AuditTargetRepository";
import {
  canInvestigate,
  canManageTarget,
  resolveWorkspaceRole,
} from "@/server/features/audit/authz/workspace-role";
import {
  evaluateTargetVerification,
  getVerificationPageThreshold,
  isLaunchBlockedByVerification,
} from "@/server/features/audit/authz/target-verification";
import { GscConnectionRepository } from "@/server/features/gsc/repositories/GscConnectionRepository";
import {
  MAX_AUDIT_PAGES,
  MAX_USER_AUDIT_USAGE,
  clampAuditMaxPages,
  getEstimatedAuditCapacity,
} from "@/server/features/audit/services/audit-capacity";
import { assertAuditLaunchWithinThrottle } from "@/server/features/audit/services/audit-launch-throttle";
import { AppError } from "@/server/lib/errors";
import { AuditProgressKV } from "@/server/lib/audit/progress-kv";
import { deleteDiscoveredUrls } from "@/server/lib/audit/discovered-urls-store";
import {
  parseAuditConfig,
  type AuditConfig,
  type LighthouseStrategy,
} from "@/server/lib/audit/types";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import { getOrigin } from "@/server/lib/audit/url-utils";
import { resolveDataforseoCredentials } from "@/server/lib/dataforseo/resolve-credentials";
import { resolveDataforseoCredentialAccess } from "@/server/lib/dataforseo/credential-access-policy";

async function startAudit(input: {
  actorUserId: string;
  authMode: AuthMode;
  billingCustomer: BillingCustomerContext;
  projectId: string;
  startUrl: string;
  maxPages?: number;
  lighthouseStrategy?: LighthouseStrategy;
  // Set when this launch is a re-crawl to verify fixes against an earlier crawl.
  baselineAuditId?: string;
}) {
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.billingCustomer.organizationId,
    authMode: input.authMode,
  });
  if (!canInvestigate(role)) {
    throw new AppError("FORBIDDEN", "You cannot run audits in this workspace");
  }

  const startUrl = await normalizeAndValidateStartUrl(input.startUrl);
  const origin = getOrigin(startUrl);

  // Read an existing target without creating state yet. A new target uses the
  // crawler's own 5,000-page ceiling, which is stricter than the schema default
  // (10,000); existing targets may lower it further.
  const existingTarget = await AuditTargetRepository.getByProjectAndOrigin(
    input.projectId,
    origin,
  );
  const maxPages = Math.min(
    clampAuditMaxPages(input.maxPages),
    existingTarget?.maxPagesLimit ?? MAX_AUDIT_PAGES,
  );
  // Audit Lighthouse runs through DataForSEO (dataforseo.lighthouse.live), not
  // free PSI. With no key available for this org, force it off rather than
  // firing a metered call that spends (BYO key) or returns null rows
  // (open-access, where the operator global key is intentionally unavailable).
  // The launch UI also disables the checkbox, but gate here too so a direct API
  // caller can't opt back in.
  let lighthouseStrategy = input.lighthouseStrategy ?? "auto";
  if (lighthouseStrategy !== "none") {
    const credentials = await resolveDataforseoCredentials(
      input.billingCustomer.organizationId,
    );
    if (
      (await resolveDataforseoCredentialAccess(credentials)) === "unavailable"
    ) {
      lighthouseStrategy = "none";
    }
  }

  // Large hosted crawls require a verified domain; verification is derived from
  // the connected GSC property. An IndexNow key can never satisfy this.
  const gscConnection = await GscConnectionRepository.getByProjectId(
    input.projectId,
  );
  const verification = evaluateTargetVerification({
    origin,
    gscSiteUrl: gscConnection?.siteUrl,
  });
  if (
    isLaunchBlockedByVerification({
      authMode: input.authMode,
      maxPages,
      verification,
    })
  ) {
    // A dedicated code, not FORBIDDEN: only the code survives `toClientError`, so
    // a shared code means the client can only say "no access" for what is really
    // "that crawl is too large for a domain you have not verified".
    throw new AppError(
      "AUDIT_VERIFICATION_REQUIRED",
      "Verify domain ownership in Search Console to run an audit of this size",
    );
  }

  // A verification re-crawl must name an earlier COMPLETED crawl of THIS target
  // in THIS project. Reject anything else rather than silently drop it, so the
  // outcome the user later reads can never be anchored to a foreign baseline.
  let baselineAuditId: string | null = null;
  if (input.baselineAuditId) {
    const baseline = await AuditRepository.getAuditForProject(
      input.baselineAuditId,
      input.projectId,
    );
    if (
      !baseline ||
      baseline.status !== "completed" ||
      getOrigin(baseline.startUrl) !== origin
    ) {
      throw new AppError(
        "NOT_FOUND",
        "Baseline must be a completed audit of this target.",
      );
    }
    baselineAuditId = baseline.id;
  }

  const reservation = getEstimatedAuditCapacity({
    maxPages,
    lighthouseStrategy,
  });

  const currentUsage = await AuditRepository.getAuditCapacityUsageForUser(
    input.actorUserId,
  );

  if (currentUsage + reservation.total > MAX_USER_AUDIT_USAGE) {
    throw new AppError("AUDIT_CAPACITY_REACHED");
  }

  // Count only launches that already passed role, target, verification,
  // baseline and capacity validation. The counter intentionally precedes the
  // row/workflow creation boundary so a blocked launch creates no state.
  await assertAuditLaunchWithinThrottle({
    authMode: input.authMode,
    organizationId: input.billingCustomer.organizationId,
  });

  // Create the project/domain target only after the hosted launch budget is
  // admitted. A blocked request therefore cannot fill D1 with arbitrary origin
  // rows; get-or-create still converges concurrent first launches safely.
  await AuditTargetRepository.getOrCreateTarget({
    projectId: input.projectId,
    organizationId: input.billingCustomer.organizationId,
    origin,
  });

  const auditId = crypto.randomUUID();
  const config: AuditConfig = { maxPages, lighthouseStrategy };

  await AuditRepository.createAudit({
    id: auditId,
    projectId: input.projectId,
    startedByUserId: input.actorUserId,
    startUrl,
    workflowInstanceId: auditId,
    config,
    pagesTotal: reservation.pagesTotal,
    lighthouseTotal: reservation.lighthouseTotal,
    baselineAuditId,
  });

  try {
    await env.SITE_AUDIT_WORKFLOW.create({
      id: auditId,
      params: {
        auditId,
        billingCustomer: {
          userId: input.billingCustomer.userId,
          userEmail: input.billingCustomer.userEmail,
          organizationId: input.billingCustomer.organizationId,
          projectId: input.billingCustomer.projectId,
        },
        projectId: input.projectId,
        startUrl,
        config,
      },
    });
  } catch (error) {
    try {
      const instance = await env.SITE_AUDIT_WORKFLOW.get(auditId);
      await instance.terminate();
    } catch {
      // The workflow may never have been created, or may already be gone.
    }

    await AuditRepository.deleteAuditForProject(auditId, input.projectId);
    throw error;
  }

  return { auditId };
}

/**
 * What the current caller may do with audits in this project, plus the domain
 * verification context the launch form needs to explain a blocked large crawl
 * before the user runs into it.
 */
async function getAccess(input: {
  projectId: string;
  actorUserId: string;
  organizationId: string;
  authMode: AuthMode;
}) {
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  const gscConnection = await GscConnectionRepository.getByProjectId(
    input.projectId,
  );

  return {
    canLaunch: canInvestigate(role),
    // Owner/admin gate for target-management actions (e.g. IndexNow submission).
    canManage: canManageTarget(role),
    verifiedSiteUrl: gscConnection?.siteUrl ?? null,
    // Non-null only where an unverified domain actually blocks a large crawl;
    // self-host stays permissive at any size.
    verificationPageThreshold: getVerificationPageThreshold(input.authMode),
  };
}

async function getStatus(auditId: string, projectId: string) {
  const audit = await AuditRepository.getAuditForProject(auditId, projectId);
  if (!audit) throw new AppError("NOT_FOUND");

  return {
    id: audit.id,
    startUrl: audit.startUrl,
    status: audit.status,
    pagesCrawled: audit.pagesCrawled,
    pagesTotal: audit.pagesTotal,
    lighthouseTotal: audit.lighthouseTotal,
    lighthouseCompleted: audit.lighthouseCompleted,
    lighthouseFailed: audit.lighthouseFailed,
    currentPhase: audit.currentPhase,
    startedAt: audit.startedAt,
    completedAt: audit.completedAt,
    // Null unless the run failed. The banner explains a failure from this rather
    // than from a guess about the site.
    errorMessage: audit.errorMessage,
  };
}

async function getResults(auditId: string, projectId: string) {
  const { audit, pages, lighthouse } =
    await AuditRepository.getAuditResultsForProject(auditId, projectId);

  if (!audit) throw new AppError("NOT_FOUND");

  const parsedConfig = parseAuditConfig(audit.config);
  if (!parsedConfig) {
    throw new AppError("INTERNAL_ERROR", "Invalid audit configuration");
  }

  return {
    audit: {
      id: audit.id,
      startUrl: audit.startUrl,
      status: audit.status,
      pagesCrawled: audit.pagesCrawled,
      pagesTotal: audit.pagesTotal,
      startedAt: audit.startedAt,
      completedAt: audit.completedAt,
      config: parsedConfig,
      // Present only on a re-crawl launched to verify fixes; drives the
      // verification banner and lets a re-crawl name its own baseline.
      baselineAuditId: audit.baselineAuditId,
    },
    pages,
    lighthouse,
  };
}

async function getHistory(projectId: string) {
  const auditList = await AuditRepository.getAuditsByProject(projectId);

  return auditList.map((audit) => {
    const parsedConfig = parseAuditConfig(audit.config);
    const ranLighthouse = parsedConfig?.lighthouseStrategy !== "none";

    return {
      id: audit.id,
      startUrl: audit.startUrl,
      status: audit.status,
      pagesCrawled: audit.pagesCrawled,
      pagesTotal: audit.pagesTotal,
      ranLighthouse,
      startedAt: audit.startedAt,
      completedAt: audit.completedAt,
    };
  });
}

function toHistoryEntry(
  audit: Awaited<ReturnType<typeof AuditRepository.getLatestAuditByProject>>,
) {
  if (!audit) return null;
  const parsedConfig = parseAuditConfig(audit.config);
  return {
    id: audit.id,
    startUrl: audit.startUrl,
    status: audit.status,
    pagesCrawled: audit.pagesCrawled,
    pagesTotal: audit.pagesTotal,
    ranLighthouse: parsedConfig?.lighthouseStrategy !== "none",
    startedAt: audit.startedAt,
    completedAt: audit.completedAt,
  };
}

async function getCommandCenterAudits(projectId: string) {
  const [latest, latestCompleted] = await Promise.all([
    AuditRepository.getLatestAuditByProject(projectId),
    AuditRepository.getLatestCompletedAuditByProject(projectId),
  ]);
  return {
    latest: toHistoryEntry(latest),
    latestCompleted: toHistoryEntry(latestCompleted),
  };
}

async function getCrawlProgress(auditId: string, projectId: string) {
  const audit = await AuditRepository.getAuditForProject(auditId, projectId);
  if (!audit) {
    throw new AppError("NOT_FOUND");
  }

  return AuditProgressKV.getProgress(auditId);
}

async function remove(input: {
  auditId: string;
  projectId: string;
  actorUserId: string;
  organizationId: string;
  authMode: AuthMode;
}) {
  const { auditId, projectId } = input;
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  if (!canInvestigate(role)) {
    throw new AppError(
      "FORBIDDEN",
      "You cannot delete audits in this workspace",
    );
  }

  const audit = await AuditRepository.getAuditForProject(auditId, projectId);
  if (!audit) {
    throw new AppError("NOT_FOUND");
  }

  if (audit.status === "running") {
    if (!audit.workflowInstanceId) {
      throw new AppError(
        "CONFLICT",
        "Cannot delete a running audit without workflow context.",
      );
    }

    try {
      const instance = await env.SITE_AUDIT_WORKFLOW.get(
        audit.workflowInstanceId,
      );
      await instance.terminate();
    } catch (error) {
      console.error(`Failed to terminate audit workflow ${audit.id}:`, error);
      throw new AppError("CONFLICT", "Unable to stop the running audit.");
    }
  }

  await AuditRepository.deleteAuditForProject(auditId, projectId);
  // No row references it, so nothing else will ever collect it. Best-effort:
  // a surviving object is waste, but keeping the audit row would be a lie.
  await deleteDiscoveredUrls([auditId]);
  await AuditProgressKV.clear(auditId);
}

export const AuditService = {
  startAudit,
  getAccess,
  getStatus,
  getCrawlProgress,
  getResults,
  getHistory,
  getCommandCenterAudits,
  remove,
} as const;
