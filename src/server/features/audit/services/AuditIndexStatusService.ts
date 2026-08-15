/**
 * Google index-status for an audit's pages, plus honest deep links into Search
 * Console. Read-only: URL Inspection is a read, and every Google WRITE (request
 * indexing, submit a sitemap) is a manual Search Console action reached via a
 * deep link — the connected grant is `webmasters.readonly`, so no write API is
 * possible here, and none is offered.
 *
 * Two isolation gates, the same the P10 Search tab uses: the caller's project must
 * own the audit, and the connected GSC property must cover the audit's origin — a
 * mismatched property is refused before any inspection, and only URLs within the
 * origin can be inspected, so one project can never read another domain's Google
 * data or spend its inspection quota on a foreign URL.
 */
import type { AuthMode } from "@/lib/auth-mode";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditIssueRepository } from "@/server/features/audit/repositories/AuditIssueRepository";
import {
  canInvestigate,
  resolveWorkspaceRole,
} from "@/server/features/audit/authz/workspace-role";
import { propertyCoversOrigin } from "@/shared/gsc-property-match";
import {
  GscNotConnectedError,
  GscService,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import {
  buildSitemapsDeepLink,
  isWithinOrigin,
  mapInspection,
  type InspectionView,
} from "@/server/features/audit/indexing/google-index-status";
import { getOrigin } from "@/server/lib/audit/url-utils";
import { AppError } from "@/server/lib/errors";

const MISSING_FROM_SITEMAP_RULE = "audit-missing-from-sitemap";

type IndexStatusContext =
  | { state: "not_connected" }
  | { state: "property_mismatch"; property: string }
  | {
      state: "ready";
      property: string;
      sitemapsDeepLink: string;
      startUrl: string;
      missingFromSitemapCount: number;
    };

type InspectResult =
  | { state: "not_connected" }
  | { state: "property_mismatch"; property: string }
  | { state: "invalid_url" }
  | { state: "inspect_failed" }
  | {
      state: "ready";
      property: string;
      url: string;
      inspection: InspectionView;
    };

/** Resolve the audit's origin (project-owned) and its connected, matching GSC
 *  property, or a discriminated reason it cannot be used. */
async function resolveMatchingProperty(input: {
  projectId: string;
  auditId: string;
}): Promise<
  | { ok: true; origin: string; startUrl: string; property: string }
  | {
      ok: false;
      result:
        | { state: "not_connected" }
        | { state: "property_mismatch"; property: string };
    }
> {
  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  const origin = getOrigin(audit.startUrl);
  const connection = await GscService.getConnection(input.projectId);
  if (!connection) return { ok: false, result: { state: "not_connected" } };

  if (!propertyCoversOrigin(origin, connection.siteUrl)) {
    return {
      ok: false,
      result: { state: "property_mismatch", property: connection.siteUrl },
    };
  }
  return {
    ok: true,
    origin,
    startUrl: audit.startUrl,
    property: connection.siteUrl,
  };
}

async function getContext(input: {
  projectId: string;
  auditId: string;
}): Promise<IndexStatusContext> {
  const resolved = await resolveMatchingProperty(input);
  if (!resolved.ok) return resolved.result;

  const missingFromSitemapCount = await AuditIssueRepository.countOccurrences({
    auditId: input.auditId,
    ruleId: MISSING_FROM_SITEMAP_RULE,
  });

  return {
    state: "ready",
    property: resolved.property,
    sitemapsDeepLink: buildSitemapsDeepLink(resolved.property),
    startUrl: resolved.startUrl,
    missingFromSitemapCount,
  };
}

async function inspectUrl(input: {
  projectId: string;
  auditId: string;
  url: string;
  actorUserId: string;
  organizationId: string;
  authMode: AuthMode;
}): Promise<InspectResult> {
  // Inspection is an active, quota-bearing API call, so it is an investigate-level
  // action (editor and up), not a plain read.
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  if (!canInvestigate(role)) {
    throw new AppError(
      "FORBIDDEN",
      "You cannot inspect URLs in this workspace",
    );
  }

  const resolved = await resolveMatchingProperty(input);
  if (!resolved.ok) return resolved.result;

  // Only inspect a URL within the audit's own origin — bounds quota to this
  // target and stops a matching property being used to inspect a foreign URL.
  if (!isWithinOrigin(input.url, resolved.origin)) {
    return { state: "invalid_url" };
  }

  try {
    const inspection = await GscService.inspectUrls({
      projectId: input.projectId,
      urls: [input.url],
    });
    // Re-check the property the query actually resolved, guarding a setSite race
    // between the gate above and the call (mirrors AuditSearchSignalsService).
    if (!propertyCoversOrigin(resolved.origin, inspection.siteUrl)) {
      return { state: "property_mismatch", property: inspection.siteUrl };
    }
    const row = inspection.results[0];
    // inspectUrls captures a per-URL GSC failure (rate limit, revoked property
    // permission, 404) as a null result with an error, rather than throwing.
    // Presenting that as an all-null "ready" answer would misread a failure as
    // "Google has no data for this URL", so surface it as a failure instead.
    if (!row || row.error || !row.result) {
      return { state: "inspect_failed" };
    }
    return {
      state: "ready",
      property: inspection.siteUrl,
      url: input.url,
      inspection: mapInspection(row.result),
    };
  } catch (error) {
    // Only a dead grant throws from inspectUrls (GscTokenError, surfaced as
    // GscNotConnectedError/expected-failure): prompt a reconnect rather than an
    // error page. Real faults (5xx) throw on.
    if (
      error instanceof GscNotConnectedError ||
      isExpectedGrantFailure(error)
    ) {
      return { state: "not_connected" };
    }
    throw error;
  }
}

export const AuditIndexStatusService = {
  getContext,
  inspectUrl,
} as const;
