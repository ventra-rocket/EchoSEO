/**
 * Competitor declaration for an audit target — the operator-supplied half of the
 * page-level comparison.
 *
 * The comparison this feeds is deliberately page-level: not "their domain scores
 * X", but "your /brand/rolex loses to their /rolex/discover on these rules".
 * Which competitors matter is a judgement call about a market, so it is entered
 * by a person; automatic discovery is blocked on a SERP data source rather than
 * on code, and lands later as rows with `source: "auto"`.
 *
 * A competitor origin passes through `normalizeAndValidateStartUrl` before it is
 * stored, which is not cosmetic: the crawler will fetch whatever is in this
 * column, so the same guard that protects the start-URL path from private
 * addresses and non-HTTP schemes has to protect this one.
 */
import type { AuthMode } from "@/lib/auth-mode";
import {
  canInvestigate,
  canManageTarget,
  resolveWorkspaceRole,
} from "@/server/features/audit/authz/workspace-role";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import {
  AuditTargetRepository,
  type AuditTarget,
} from "@/server/features/audit/repositories/AuditTargetRepository";
import {
  CompetitorRepository,
  type AuditCompetitor,
} from "@/server/features/audit/repositories/CompetitorRepository";
import { getOrigin } from "@/server/lib/audit/url-utils";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import { AppError } from "@/server/lib/errors";

/**
 * Three, matching the MediaOne proposal the brief came from (The Hour Glass
 * against Cortina, Sincere and Watches of Switzerland). The cap is not a licence
 * tier: each competitor multiplies the crawl of somebody else's site, and a
 * comparison against ten domains is a comparison nobody reads.
 */
export const MAX_COMPETITORS_PER_TARGET = 3;

type ActorContext = {
  projectId: string;
  organizationId: string;
  actorUserId: string;
  authMode: AuthMode;
  auditId: string;
};

/**
 * Resolve the audit's target, gated by role.
 *
 * Addressed by `auditId` like `ReportSubscriptionService`, `IndexNowService`,
 * `AuditSearchSignalsService`, `AuditIndexStatusService` and
 * `AuditReferringDomainsService`, all of which derive the target from
 * `getOrigin(audit.startUrl)`. Competitors are stored against the target and so
 * outlive any single crawl, but every operation beyond bare CRUD needs a crawl
 * anyway — the pairs are pairs of OUR crawled pages against theirs — so
 * addressing through the crawl the operator is looking at is both the
 * established route and the one the feature actually needs.
 *
 * The four-line derivation is repeated rather than shared for the same reason
 * those five repeat it: extracting it would be a wrapper around two calls, and
 * migrating five working services to it days before a demo buys nothing.
 */
async function resolveTarget(
  input: ActorContext,
  forManaging: boolean,
): Promise<AuditTarget> {
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  const permitted = forManaging ? canManageTarget(role) : canInvestigate(role);
  if (!permitted) throw new AppError("FORBIDDEN");

  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  const target = await AuditTargetRepository.getByProjectAndOrigin(
    input.projectId,
    getOrigin(audit.startUrl),
  );
  if (!target) throw new AppError("NOT_FOUND");
  return target;
}

async function list(input: ActorContext): Promise<AuditCompetitor[]> {
  const target = await resolveTarget(input, false);
  return CompetitorRepository.listByTarget(target.id);
}

async function add(
  input: ActorContext & { domain: string; label: string | null },
): Promise<AuditCompetitor> {
  const target = await resolveTarget(input, true);

  const origin = getOrigin(await normalizeAndValidateStartUrl(input.domain));
  if (origin === target.origin) {
    throw new AppError(
      "VALIDATION_ERROR",
      "That is this site's own domain, not a competitor",
    );
  }

  const existing = await CompetitorRepository.listByTarget(target.id);
  const alreadyAdded = existing.some(
    (competitor) => competitor.origin === origin,
  );
  // The cap applies to adding a NEW domain. Re-submitting one already stored is
  // idempotent, so it must not fail merely because the list is full.
  if (!alreadyAdded && existing.length >= MAX_COMPETITORS_PER_TARGET) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Up to ${MAX_COMPETITORS_PER_TARGET} competitors per site`,
    );
  }

  const label = input.label?.trim();
  return CompetitorRepository.add({
    projectId: input.projectId,
    targetId: target.id,
    origin,
    label: label ? label : null,
    source: "manual",
  });
}

async function remove(
  input: ActorContext & { competitorId: string },
): Promise<void> {
  const target = await resolveTarget(input, true);
  await CompetitorRepository.remove(target.id, input.competitorId);
}

export const CompetitorAuditService = {
  list,
  add,
  remove,
} as const;
