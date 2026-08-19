import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { account } from "@/db/schema";
import {
  GSC_OAUTH_PROVIDER_ID,
  type GscGrantFailureReason,
} from "@/shared/gsc";
import { AppError } from "@/server/lib/errors";
import {
  createGscClient,
  GscApiError,
  GscTokenError,
  type GscSite,
  type UrlInspectionResult,
} from "@/server/lib/gscClient";
import {
  buildSearchAnalyticsRequest,
  type GscPerformanceInput,
} from "@/server/features/gsc/searchAnalytics";
import {
  GscConnectionRepository,
  type GscConnection,
} from "@/server/features/gsc/repositories/GscConnectionRepository";
import type {
  GscSearchAnalyticsRequest,
  GscSearchAnalyticsRow,
} from "@/server/lib/gscClient";

const SITE_UNVERIFIED_PERMISSION = "siteUnverifiedUser";

type GscPerformanceResult = {
  siteUrl: string;
  connectedBy: string | null;
  request: GscSearchAnalyticsRequest;
  rows: GscSearchAnalyticsRow[];
};

type GscGrantFailure = {
  reason: GscGrantFailureReason;
  /** Status Search Console answered with, or null when the call never reached
   *  Google because no access token could be minted. Logged, never shown. */
  providerStatus: number | null;
};

type GscSiteListResult = {
  sites: GscSite[];
  /** Null when the listing succeeded. */
  failure: GscGrantFailure | null;
};

/** Thrown when a project has no connected GSC property. */
export class GscNotConnectedError extends Error {
  constructor(public readonly projectId: string) {
    super("Search Console is not connected for this project");
    this.name = "GscNotConnectedError";
  }
}

async function getConnection(projectId: string): Promise<GscConnection | null> {
  return GscConnectionRepository.getByProjectId(projectId);
}

/** Whether this user has linked a google-search-console grant (regardless of
 *  whether they've picked a property yet). Drives the connect-vs-pick UI. */
async function userHasGrant(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, GSC_OAUTH_PROVIDER_ID),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** List verified properties available on a user's google-search-console grant. */
async function listSitesForUser(userId: string): Promise<GscSite[]> {
  return createGscClient({ userId }).listSites();
}

/** Expected ways a stored grant fails to reach Search Console: no token could be
 *  minted (refresh token revoked or expired), or Google rejected the call
 *  (401/403). These surface a reconnect prompt instead of being routed through
 *  error tracking. Other statuses (429, 5xx) are genuine faults and propagate. */
export function isExpectedGrantFailure(error: unknown): boolean {
  if (error instanceof GscTokenError) return true;
  return (
    error instanceof GscApiError &&
    (error.status === 401 || error.status === 403)
  );
}

/** Reasons Google reports when a 403 is a *permission* refusal rather than a
 *  quota refusal: the OAuth app is still in Testing, a Workspace admin policy
 *  blocks it, or the Search Console scope was declined on the consent screen.
 *  Search Console answers 403 for quota too, so anything not on this list stays
 *  transient — telling a rate-limited user to reconnect is the exact misdirection
 *  this classification exists to prevent. */
const GOOGLE_PERMISSION_DENIED_REASONS: Record<string, true> = {
  forbidden: true,
  insufficientPermissions: true,
  accessNotConfigured: true,
  ACCESS_TOKEN_SCOPE_INSUFFICIENT: true,
  PERMISSION_DENIED: true,
};

/** Google's REST error envelope. Only the reason fields are read; the rest of a
 *  provider body is diagnostic noise that must not reach the browser. */
const googleErrorBodySchema = z.object({
  error: z.object({
    status: z.string().optional(),
    errors: z.array(z.object({ reason: z.string().optional() })).optional(),
    details: z.array(z.object({ reason: z.string().optional() })).optional(),
  }),
});

function deniesPermission(body: string | undefined): boolean {
  if (!body) return false;
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return false;
  }
  const parsed = googleErrorBodySchema.safeParse(json);
  if (!parsed.success) return false;
  const { status, errors, details } = parsed.data.error;
  if (status !== undefined && GOOGLE_PERMISSION_DENIED_REASONS[status]) {
    return true;
  }
  return [...(errors ?? []), ...(details ?? [])].some(
    (entry) =>
      entry.reason !== undefined &&
      GOOGLE_PERMISSION_DENIED_REASONS[entry.reason],
  );
}

/** Narrow an expected grant failure to the one thing the user can act on. The
 *  caller has already established that a grant exists, so every branch here is
 *  about a grant Google would not serve. */
function classifyGrantFailure(error: unknown): GscGrantFailure {
  if (error instanceof GscApiError) {
    if (error.status === 403 && deniesPermission(error.body)) {
      return { reason: "consent_blocked", providerStatus: error.status };
    }
    // 401 means Google rejected a token Better Auth had just minted, so the
    // grant behind it is spent. A 403 we could not attribute to a permission
    // refusal is Search Console's quota answer far more often than a dead grant,
    // and a retry costs the user nothing while a reconnect cannot help.
    return {
      reason: error.status === 401 ? "grant_expired" : "provider_error",
      providerStatus: error.status,
    };
  }
  // GscTokenError: no token could be minted, so nothing reached Google.
  return { reason: "grant_expired", providerStatus: null };
}

/** List properties for the picker UI. When the stored grant can't currently
 *  reach GSC, return a classified failure instead of throwing, so an expected
 *  external-auth failure doesn't land in error tracking — and so the picker can
 *  name an action that actually helps for each case.
 *
 *  Only a GscTokenError unlinks the stored grant — the one unambiguous "this
 *  grant is dead" signal (Better Auth couldn't mint/refresh a token, i.e. the
 *  user revoked access or the refresh token expired). A bare 401/403 from
 *  sites.list is left in place: Search Console also returns 403 for quota/rate
 *  limits, so destroying the grant there would force needless reconnects across
 *  every project on it. Reconnecting re-upserts the grant either way. */
async function listSitesForUserWithGrantStatus(
  userId: string,
): Promise<GscSiteListResult> {
  try {
    return { sites: await listSitesForUser(userId), failure: null };
  } catch (error) {
    if (!isExpectedGrantFailure(error)) {
      throw error;
    }
    // A user who never linked an account fails to mint a token exactly like a
    // revoked one does, and "reconnect" is nonsense advice for them. Read before
    // any unlink below, so the answer describes the state the user arrived in.
    const failure: GscGrantFailure = (await userHasGrant(userId))
      ? classifyGrantFailure(error)
      : { reason: "not_connected", providerStatus: null };
    // Expected end states, so deliberately not error-tracked — but an operator
    // still has to be able to tell a policy block from a quota refusal after the
    // fact, and the provider status is the only signal that separates them.
    console.warn(
      `[gsc-sites] grant unusable for user ${userId}: reason=${failure.reason} providerStatus=${failure.providerStatus ?? "none"}`,
    );
    if (error instanceof GscTokenError) {
      await unlinkUserGrant(userId);
    }
    return { sites: [], failure };
  }
}

/** Map a verified property to a project. Rejects unverified properties and
 *  properties not present on the connector's grant. */
async function setSite(input: {
  projectId: string;
  organizationId: string;
  siteUrl: string;
  userId: string;
  userEmail: string;
}): Promise<GscConnection> {
  const sites = await listSitesForUser(input.userId);
  const match = sites.find((s) => s.siteUrl === input.siteUrl);
  if (!match) {
    throw new AppError(
      "NOT_FOUND",
      "That Search Console property isn't available on your connected Google account.",
    );
  }
  if (match.permissionLevel === SITE_UNVERIFIED_PERMISSION) {
    throw new AppError(
      "FORBIDDEN",
      "You don't have verified access to that Search Console property.",
    );
  }
  return GscConnectionRepository.upsert({
    projectId: input.projectId,
    organizationId: input.organizationId,
    siteUrl: input.siteUrl,
    connectedByUserId: input.userId,
    connectedAccountEmail: input.userEmail,
  });
}

/** Remove this user's google-search-console grant (stored OAuth tokens). */
async function unlinkUserGrant(userId: string): Promise<void> {
  await db
    .delete(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, GSC_OAUTH_PROVIDER_ID),
      ),
    );
}

async function disconnect(input: {
  projectId: string;
  userId: string;
}): Promise<void> {
  const connection = await GscConnectionRepository.getByProjectId(
    input.projectId,
  );
  await GscConnectionRepository.deleteByProjectId(input.projectId);
  // Clean up the caller's *own* OAuth grant once none of their projects still
  // use it. Safe by construction: unlinkUserGrant only ever deletes the
  // caller's account row, never another member's. We skip cleanup only when the
  // binding we removed belonged to a *different* member, so unbinding their
  // property never revokes the caller's unrelated grant. A null connection
  // means the caller linked Google but never picked a property — that dangling
  // grant is theirs to drop.
  if (!connection || connection.connectedByUserId === input.userId) {
    const stillUsed = await GscConnectionRepository.existsForConnector(
      input.userId,
    );
    if (!stillUsed) {
      await unlinkUserGrant(input.userId);
    }
  }
}

/** Pass-through of GSC `searchAnalytics.query` for a project's connected property. */
async function getPerformance(
  input: GscPerformanceInput,
): Promise<GscPerformanceResult> {
  const connection = await GscConnectionRepository.getByProjectId(
    input.projectId,
  );
  if (!connection) {
    throw new GscNotConnectedError(input.projectId);
  }
  const request = buildSearchAnalyticsRequest(input);
  const client = createGscClient({ userId: connection.connectedByUserId });
  const rows = await client.querySearchAnalytics(connection.siteUrl, request);
  return {
    siteUrl: connection.siteUrl,
    connectedBy: connection.connectedAccountEmail,
    request,
    rows,
  };
}

type GscUrlInspection = {
  url: string;
  result: UrlInspectionResult | null;
  error?: string;
};

type GscInspectUrlsResult = {
  siteUrl: string;
  connectedBy: string | null;
  results: GscUrlInspection[];
};

/** Inspect 1–N URLs against a project's connected property. Resolves the
 *  connection once, then inspects each URL; per-URL failures are captured
 *  inline so one bad URL doesn't fail the batch. Token/grant failures
 *  propagate so the caller can prompt a reconnect. */
async function inspectUrls(input: {
  projectId: string;
  urls: string[];
  languageCode?: string;
}): Promise<GscInspectUrlsResult> {
  const connection = await GscConnectionRepository.getByProjectId(
    input.projectId,
  );
  if (!connection) {
    throw new GscNotConnectedError(input.projectId);
  }
  const client = createGscClient({ userId: connection.connectedByUserId });
  const results: GscUrlInspection[] = [];
  for (const url of input.urls) {
    try {
      const result = await client.inspectUrl(
        connection.siteUrl,
        url,
        input.languageCode,
      );
      results.push({ url, result });
    } catch (error) {
      if (error instanceof GscTokenError) throw error;
      results.push({
        url,
        result: null,
        error: error instanceof Error ? error.message : "Inspection failed",
      });
    }
  }
  return {
    siteUrl: connection.siteUrl,
    connectedBy: connection.connectedAccountEmail,
    results,
  };
}

export const GscService = {
  getConnection,
  userHasGrant,
  listSitesForUserWithGrantStatus,
  setSite,
  disconnect,
  getPerformance,
  inspectUrls,
};
