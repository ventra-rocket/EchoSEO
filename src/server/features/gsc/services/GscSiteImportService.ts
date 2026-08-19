/**
 * Bulk import of verified Search Console properties.
 *
 * **One imported property becomes one project.** That is not a preference, it is
 * what the rest of the app already assumes: every per-site Google surface
 * resolves `gsc_connections` by `projectId` — `GscService.getPerformance`,
 * `AuditSearchSignalsService`, `AuditIndexStatusService`, and the ownership gate
 * in `AuditService.startAudit`. A project holds exactly one property. Importing
 * five properties as five audit targets inside one project would therefore give
 * five targets of which exactly one could show Search Console numbers or pass the
 * hosted verification gate above 100 pages, and the other four would look
 * imported while being unable to do the thing they were imported for.
 *
 * Nothing here persists a verification claim. Ownership stays derived at launch
 * time from the project's connected property (`audit.schema.ts:157-161`), so a
 * property the user loses in Search Console stops verifying by itself.
 *
 * Every row is independent: one unusable property costs the user that row and
 * nothing else.
 */
import type { AuthMode } from "@/lib/auth-mode";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import {
  canInvestigate,
  resolveWorkspaceRole,
} from "@/server/features/audit/authz/workspace-role";
import { AuditService } from "@/server/features/audit/services/AuditService";
import { AuditTargetRepository } from "@/server/features/audit/repositories/AuditTargetRepository";
import {
  planGscSiteTarget,
  type GscPropertyKind,
} from "@/server/features/gsc/gsc-site-import";
import { GscConnectionRepository } from "@/server/features/gsc/repositories/GscConnectionRepository";
import { GscService } from "@/server/features/gsc/services/GscService";
import { ProjectRepository } from "@/server/features/projects/repositories/ProjectRepository";
import { asAppError, AppError } from "@/server/lib/errors";

const UNVERIFIED_PERMISSION = "siteUnverifiedUser";

/**
 * Ceiling on one import call. The launch throttle already allows only 10 audits
 * per hour per organization, and a request that walks 300 properties would spend
 * its whole subrequest budget before returning anything the user could read.
 */
export const MAX_IMPORT_SITES = 25;

/** Why a listed property cannot be selected, or null when it can. */
type GscImportBlock = "unverified" | "unsupported" | "already_imported";

export type GscImportCandidate = {
  siteUrl: string;
  kind: GscPropertyKind | null;
  /** Origin host, which becomes the project's name — null when unmappable. */
  host: string | null;
  origin: string | null;
  /** Path a scoped property loses to the crawl origin. */
  droppedPath: string | null;
  block: GscImportBlock | null;
  /** The project already connected to this property, when there is one. */
  existingProjectId: string | null;
  existingProjectName: string | null;
};

type GscImportCandidateList = {
  candidates: GscImportCandidate[];
  /** The stored grant cannot currently reach Search Console: offer a relink. */
  requiresReconnect: boolean;
};

type GscImportOutcome = "created" | "skipped_duplicate" | "failed";

/**
 * What happened to the optional first crawl. `unavailable` covers a refusal the
 * import itself is not at fault for — capacity, an unsubscribed org, a target
 * behind auth — and carries the reason.
 */
type GscImportAuditOutcome =
  | "started"
  | "throttled"
  | "unavailable"
  | "not_requested";

export type GscImportRow = {
  siteUrl: string;
  host: string | null;
  outcome: GscImportOutcome;
  projectId: string | null;
  /** Cause of a failure, or the project a duplicate already lives in. */
  detail: string | null;
  audit: GscImportAuditOutcome;
  auditId: string | null;
};

type GscImportResult = {
  rows: GscImportRow[];
  requiresReconnect: boolean;
};

type ManageInput = {
  actorUserId: string;
  authMode: AuthMode;
  organizationId: string;
};

/**
 * The import creates workspace state and can spend crawl capacity, so it sits
 * behind the same gate as launching an audit rather than a looser one.
 */
async function assertMayImport(input: ManageInput): Promise<void> {
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  if (!canInvestigate(role)) {
    throw new AppError(
      "FORBIDDEN",
      "You cannot import Search Console properties in this workspace",
    );
  }
}

/**
 * Every property on the caller's grant, annotated with whether it can be
 * imported and where it already lives.
 *
 * Unselectable rows are returned rather than filtered out: a user looking for a
 * property that is missing needs to see it listed with a reason, not to wonder
 * whether we failed to read their account.
 */
async function listCandidates(
  input: ManageInput,
): Promise<GscImportCandidateList> {
  await assertMayImport(input);

  const [siteList, connections] = await Promise.all([
    GscService.listSitesForUserWithGrantStatus(input.actorUserId),
    GscConnectionRepository.listByOrganization(input.organizationId),
  ]);

  const importedBy = new Map(
    connections.map((connection) => [connection.siteUrl, connection.projectId]),
  );
  const projectNames = new Map<string, string>();
  await Promise.all(
    [...new Set(importedBy.values())].map(async (projectId) => {
      const project = await ProjectRepository.getProjectById(projectId);
      if (project) projectNames.set(projectId, project.name);
    }),
  );

  const candidates = siteList.sites.map((site): GscImportCandidate => {
    const plan = planGscSiteTarget(site.siteUrl);
    const existingProjectId = importedBy.get(site.siteUrl) ?? null;
    const block: GscImportBlock | null =
      site.permissionLevel === UNVERIFIED_PERMISSION
        ? "unverified"
        : !plan
          ? "unsupported"
          : existingProjectId
            ? "already_imported"
            : null;

    return {
      siteUrl: site.siteUrl,
      kind: plan?.kind ?? null,
      host: plan?.host ?? null,
      origin: plan?.origin ?? null,
      droppedPath: plan?.droppedPath ?? null,
      block,
      existingProjectId,
      existingProjectName: existingProjectId
        ? (projectNames.get(existingProjectId) ?? null)
        : null,
    };
  });

  return { candidates, requiresReconnect: siteList.failure !== null };
}

/**
 * Import the named properties, one project each.
 *
 * `siteUrls` is never trusted: each one is checked against the properties the
 * caller's own grant reports, so a crafted request cannot bind this workspace to
 * a property the caller does not hold.
 */
async function importSites(
  input: ManageInput & {
    userEmail: string;
    billingCustomer: BillingCustomerContext;
    siteUrls: string[];
    /** Launch a first crawl per created project, sequentially. */
    startAudits: boolean;
    /** False when the org may not spend on crawls; rows report it per site. */
    auditsAllowed: boolean;
  },
): Promise<GscImportResult> {
  await assertMayImport(input);

  const requested = [
    ...new Set(input.siteUrls.map((url) => url.trim())),
  ].filter(Boolean);
  if (requested.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Pick at least one property");
  }
  if (requested.length > MAX_IMPORT_SITES) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Import at most ${MAX_IMPORT_SITES} properties at a time`,
    );
  }

  // Reuses the picker's seam so an unreachable grant becomes a reconnect prompt
  // rather than every row failing: nothing was attempted, so nothing should be
  // reported as attempted.
  const siteList = await GscService.listSitesForUserWithGrantStatus(
    input.actorUserId,
  );
  if (siteList.failure) {
    return { rows: [], requiresReconnect: true };
  }

  const grantedByUrl = new Map(
    siteList.sites.map((site) => [site.siteUrl, site]),
  );
  const connections = await GscConnectionRepository.listByOrganization(
    input.organizationId,
  );
  const importedBy = new Map(
    connections.map((connection) => [connection.siteUrl, connection.projectId]),
  );

  const rows: GscImportRow[] = [];
  for (const siteUrl of requested) {
    rows.push(
      await importOneSite({
        ...input,
        siteUrl,
        granted: grantedByUrl,
        importedBy,
      }),
    );
  }

  return { rows, requiresReconnect: false };
}

async function importOneSite(input: {
  actorUserId: string;
  authMode: AuthMode;
  organizationId: string;
  userEmail: string;
  billingCustomer: BillingCustomerContext;
  siteUrl: string;
  startAudits: boolean;
  auditsAllowed: boolean;
  granted: Map<string, { siteUrl: string; permissionLevel: string }>;
  importedBy: Map<string, string>;
}): Promise<GscImportRow> {
  const { siteUrl } = input;
  const base: GscImportRow = {
    siteUrl,
    host: null,
    outcome: "failed",
    projectId: null,
    detail: null,
    audit: "not_requested",
    auditId: null,
  };

  const granted = input.granted.get(siteUrl);
  if (!granted) {
    return {
      ...base,
      detail: "Not available on your connected Google account",
    };
  }
  if (granted.permissionLevel === UNVERIFIED_PERMISSION) {
    return { ...base, detail: "You do not have verified access to it" };
  }

  const plan = planGscSiteTarget(siteUrl);
  if (!plan) {
    return { ...base, detail: "Not a property shape this app can crawl" };
  }

  const existingProjectId = input.importedBy.get(siteUrl);
  if (existingProjectId) {
    return {
      ...base,
      host: plan.host,
      outcome: "skipped_duplicate",
      projectId: existingProjectId,
      detail: "Already imported",
    };
  }

  try {
    const project = await ProjectRepository.createProject(
      input.organizationId,
      plan.host,
      plan.host,
    );
    if (!project) throw new Error("Project insert returned no row");

    await GscConnectionRepository.upsert({
      projectId: project.id,
      organizationId: input.organizationId,
      siteUrl,
      connectedByUserId: input.actorUserId,
      connectedAccountEmail: input.userEmail,
    });
    // Created eagerly rather than left to the first launch, so the site exists
    // as an audit target even when the caller declined the first crawl.
    await AuditTargetRepository.getOrCreateTarget({
      projectId: project.id,
      organizationId: input.organizationId,
      origin: plan.origin,
    });
    // Claim the property for the rest of this batch: two rows deriving the same
    // property cannot both create a project for it.
    input.importedBy.set(siteUrl, project.id);

    const created: GscImportRow = {
      siteUrl,
      host: plan.host,
      outcome: "created",
      projectId: project.id,
      detail: plan.droppedPath
        ? `Crawls the whole origin — Search Console scopes this property to ${plan.droppedPath}`
        : null,
      audit: "not_requested",
      auditId: null,
    };

    if (!input.startAudits) return created;
    if (!input.auditsAllowed) {
      return { ...created, audit: "unavailable" };
    }
    return {
      ...created,
      ...(await launchFirstAudit(input, project.id, plan.origin)),
    };
  } catch (error) {
    // An `AppError` carries a message written to be read by the person who
    // triggered this. Anything else is infrastructure, whose message can name
    // tables and constraints — logged for the operator, generic for the row.
    const appError = asAppError(error);
    if (!appError) {
      console.error(
        `[gsc-import] could not import ${siteUrl} into org ${input.organizationId}`,
        error,
      );
    }
    return {
      ...base,
      host: plan.host,
      detail: appError?.message ?? "Could not create the project",
    };
  }
}

/**
 * One first crawl, sequential by construction (the caller awaits each row), so a
 * ten-site import walks into the launch throttle one site at a time and the rows
 * after it report `throttled` instead of the whole import failing.
 */
async function launchFirstAudit(
  input: {
    actorUserId: string;
    authMode: AuthMode;
    billingCustomer: BillingCustomerContext;
  },
  projectId: string,
  origin: string,
): Promise<Pick<GscImportRow, "audit" | "auditId">> {
  try {
    const launched = await AuditService.startAudit({
      actorUserId: input.actorUserId,
      authMode: input.authMode,
      billingCustomer: input.billingCustomer,
      projectId,
      startUrl: origin,
    });
    return { audit: "started", auditId: launched.auditId };
  } catch (error) {
    const appError = asAppError(error);
    return {
      audit: appError?.code === "RATE_LIMITED" ? "throttled" : "unavailable",
      auditId: null,
    };
  }
}

export const GscSiteImportService = { listCandidates, importSites } as const;
