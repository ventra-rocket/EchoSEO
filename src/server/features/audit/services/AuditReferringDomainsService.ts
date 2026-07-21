/**
 * Off-page referring-domain signals for an audit's target, sourced only from the
 * paid DataForSEO backlinks provider.
 *
 * The read path (`getSignals`) never touches the provider: it returns the last
 * stored aggregate snapshot, or a distinct "no snapshot" state — never a
 * fabricated zero. Only `refreshSnapshot` spends a credit, and it is a mutation:
 * it is role-gated (canInvestigate), plan-gated in hosted mode, and refused when
 * the backlinks capability is not enabled, before any provider call. Every stored
 * figure carries its provenance (provider, queried target, coverage, when) so a
 * crawler's facts and a paid provider's facts can never be confused.
 */
import type { AuthMode } from "@/lib/auth-mode";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { customerHasManagedAccess } from "@/server/billing/subscription";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditTargetRepository } from "@/server/features/audit/repositories/AuditTargetRepository";
import { AuditReferringDomainRepository } from "@/server/features/audit/repositories/AuditReferringDomainRepository";
import {
  canInvestigate,
  resolveWorkspaceRole,
} from "@/server/features/audit/authz/workspace-role";
import { resolveBacklinksProviderAccess } from "@/server/features/backlinks/services/backlinks-provider-access";
import { normalizeBacklinksTarget } from "@/server/lib/dataforseo";
import { createSeoDataProvider } from "@/server/lib/seo-data";
import { getOrigin } from "@/server/lib/audit/url-utils";
import { AppError } from "@/server/lib/errors";

const PROVIDER = "dataforseo";
// The summary query includes subdomains (see backlinks buildCommonPayload), so
// the count is domain-wide. Disclosed on every reading rather than implied.
const COVERAGE = "domain+subdomains";

export type ReferringDomainTrend = {
  /** latest total minus the previous stored total. */
  delta: number;
  previousReferringDomains: number;
  /** The previous snapshot's query time. */
  from: string;
  /** The latest snapshot's query time. */
  to: string;
};

export type AuditReferringDomainSignals =
  | { state: "no_snapshot" }
  | {
      state: "ready";
      provider: string;
      target: string;
      coverage: string;
      queriedAt: string;
      referringDomains: number;
      /** New/lost over the provider's own tracking period; null if omitted. */
      newReferringDomains: number | null;
      lostReferringDomains: number | null;
      /** Our snapshot-over-snapshot change; null until a second reading exists. */
      trend: ReferringDomainTrend | null;
    };

type AuditReferringDomainAccess = {
  /** Whether the caller's role may spend a credit to refresh. */
  canTrigger: boolean;
  /** Whether the backlinks provider is available to this deployment. */
  providerEnabled: boolean;
  /** A reason when the provider is unavailable, else null. */
  message: string | null;
};

/** The latest stored reading for this audit's target. Never calls the provider. */
async function getSignals(input: {
  projectId: string;
  auditId: string;
}): Promise<AuditReferringDomainSignals> {
  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  const origin = getOrigin(audit.startUrl);
  const target = await AuditTargetRepository.getByProjectAndOrigin(
    input.projectId,
    origin,
  );
  if (!target) return { state: "no_snapshot" };

  const snapshots = await AuditReferringDomainRepository.listSnapshotsForTarget(
    target.id,
    2,
  );
  if (snapshots.length === 0) return { state: "no_snapshot" };

  const [latest, previous] = snapshots;
  // Only diff against a previous reading of the same provenance. A change in
  // provider, queried target or coverage would make the delta a methodology
  // artefact rather than a real movement, so drop the trend instead of showing
  // a misleading number the SourceLine could not honestly explain.
  const comparablePrevious =
    previous &&
    previous.provider === latest.provider &&
    previous.target === latest.target &&
    previous.coverage === latest.coverage
      ? previous
      : null;

  return {
    state: "ready",
    provider: latest.provider,
    target: latest.target,
    coverage: latest.coverage,
    queriedAt: latest.queriedAt,
    referringDomains: latest.referringDomains,
    newReferringDomains: latest.newReferringDomains,
    lostReferringDomains: latest.lostReferringDomains,
    trend: comparablePrevious
      ? {
          delta: latest.referringDomains - comparablePrevious.referringDomains,
          previousReferringDomains: comparablePrevious.referringDomains,
          from: comparablePrevious.queriedAt,
          to: latest.queriedAt,
        }
      : null,
  };
}

/** Whether this caller may trigger a refresh, and whether the provider is on. */
async function getAccess(input: {
  actorUserId: string;
  organizationId: string;
  authMode: AuthMode;
}): Promise<AuditReferringDomainAccess> {
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  const providerAccess = await resolveBacklinksProviderAccess(input.authMode);

  return {
    canTrigger: canInvestigate(role),
    providerEnabled: providerAccess.enabled,
    message: providerAccess.message,
  };
}

/**
 * Spend one credit to read the provider's current referring-domain summary and
 * store it as an aggregate snapshot. A mutation: every gate runs before the
 * provider is called, so an unauthorized or unentitled caller never triggers a
 * charge. Returns the fresh signals so the caller updates without a second read.
 */
async function refreshSnapshot(input: {
  projectId: string;
  auditId: string;
  actorUserId: string;
  organizationId: string;
  authMode: AuthMode;
  billingCustomer: BillingCustomerContext;
}): Promise<AuditReferringDomainSignals> {
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  if (!canInvestigate(role)) {
    throw new AppError(
      "FORBIDDEN",
      "You cannot refresh off-page data in this workspace",
    );
  }

  // Hosted deployments run on our managed, metered provider key; gate the spend
  // on plan access, mirroring the crawl launch gate.
  if (
    input.authMode === "hosted" &&
    !(await customerHasManagedAccess(input.organizationId))
  ) {
    throw new AppError(
      "PAYMENT_REQUIRED",
      "Subscribe to refresh off-page data",
    );
  }

  const providerAccess = await resolveBacklinksProviderAccess(input.authMode);
  if (!providerAccess.enabled) {
    throw new AppError(
      "BACKLINKS_NOT_ENABLED",
      providerAccess.message ?? undefined,
    );
  }

  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  const origin = getOrigin(audit.startUrl);
  const target = await AuditTargetRepository.getOrCreateTarget({
    projectId: input.projectId,
    organizationId: input.organizationId,
    origin,
  });

  const normalizedTarget = normalizeBacklinksTarget(origin, {
    scope: "domain",
  });
  const provider = createSeoDataProvider(input.billingCustomer);
  const summary = await provider.backlinks.summary({
    target: normalizedTarget.apiTarget,
    creditFeature: "backlinks",
  });

  // A genuine zero from the provider is real data and is stored as such; a
  // missing count means the provider gave us nothing, so we refuse rather than
  // invent a zero the reader would trust.
  if (summary.referring_domains == null) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "DataForSEO returned no referring-domain count",
    );
  }

  await AuditReferringDomainRepository.insertSnapshot({
    projectId: input.projectId,
    targetId: target.id,
    provider: PROVIDER,
    target: normalizedTarget.apiTarget,
    coverage: COVERAGE,
    referringDomains: summary.referring_domains,
    // DataForSEO ships both the corrected and misspelled keys; accept either.
    newReferringDomains:
      summary.new_referring_domains ?? summary.new_reffering_domains ?? null,
    lostReferringDomains:
      summary.lost_referring_domains ?? summary.lost_reffering_domains ?? null,
    queriedAt: new Date().toISOString(),
    triggeredByUserId: input.actorUserId,
  });

  return getSignals({ projectId: input.projectId, auditId: input.auditId });
}

export const AuditReferringDomainsService = {
  getSignals,
  getAccess,
  refreshSnapshot,
} as const;
