/**
 * Business logic for the per-organization "bring your own key" DataForSEO
 * credential: compute a non-secret status, and — for owner/admin callers only —
 * validate a pasted key live against DataForSEO before storing it encrypted, or
 * remove it. The raw key is never logged and never returned to the client; the
 * caller receives only a masked last-4, the resolved source, and what the save
 * probes could actually establish about the DataForSEO account behind the key.
 *
 * Kept free of the TanStack request / Cloudflare runtime so the authorization
 * and validation contract stays unit-testable against a real SQLite database,
 * mirroring the audit service layer.
 */
import { z } from "zod";
import type { AuthMode } from "@/lib/auth-mode";
import {
  canManageTarget,
  resolveWorkspaceRole,
} from "@/server/features/audit/authz/workspace-role";
import {
  encryptDataforseoKey,
  OrganizationSeoCredentialRepository,
} from "@/server/features/seo-credentials/OrganizationSeoCredentialRepository";
import { resolveDataforseoCredentialAccess } from "@/server/lib/dataforseo/credential-access-policy";
import { AppError } from "@/server/lib/errors";

/**
 * DataForSEO's live authentication probe. Fixed on purpose: the host is never
 * taken from user input, so a pasted key can only be checked against DataForSEO
 * itself and never used to make the server call an attacker-chosen URL.
 */
const DATAFORSEO_USER_DATA_URL =
  "https://api.dataforseo.com/v3/appendix/user_data";

/**
 * The readiness probe, and why there are two probes instead of one.
 *
 * `/v3/appendix/user_data` is free, and DataForSEO answers it on an account it
 * will not actually serve — so authenticating there proves the credential is
 * real and nothing more. Saving on that evidence alone is what let the product
 * report success and then fail every data request with 403 / `40104` ("verify
 * your account"). Only a *billable* endpoint returns that refusal, so only a
 * billable endpoint can separate "your key is wrong" from "your account cannot
 * fetch yet".
 *
 * This one is a live database lookup — no crawl behind it, answers instantly,
 * ~$0.0101 per call. Host and payload are both fixed, so a pasted key can never
 * steer the request at an attacker-chosen URL.
 */
const DATAFORSEO_READINESS_PROBE_URL =
  "https://api.dataforseo.com/v3/dataforseo_labs/google/domain_rank_overview/live";

/** Smallest well-formed task the readiness probe can ask for. The result is
 * discarded; only the account's willingness to answer is being measured. */
const READINESS_PROBE_PAYLOAD = [
  { target: "example.com", location_code: 2840, language_code: "en" },
];

/**
 * The DataForSEO statuses that mean "this account cannot fetch data until
 * someone acts", listed one by one rather than as a 401xx/402xx range.
 *
 * The range looked tidier and was wrong: `40202` (rate limit), `40205`/`40206`
 * (duplicate-task limits) and `40209` (too many simultaneous queries) sit
 * inside it and are transient. Reporting those as a broken account would be the
 * same overreach as the bug this probe exists to fix — and the duplicate-task
 * pair is a live risk here, because every save sends the identical payload.
 * Anything not listed falls through to `unknown`.
 */
const ACCOUNT_REFUSAL_STATUSES = new Set([
  40100, // not authorized
  40104, // account not verified yet — the one that prompted this probe
  40200, // payment required, balance exhausted
  40201, // account suspended
  40203, // daily cost limit exceeded
  40207, // caller IP not whitelisted
  40210, // insufficient funds for this request
]);

/** A hung provider must not hold a save open indefinitely. Shorter than the
 * 60s ceiling on data calls: this is one small lookup with a user waiting. */
const READINESS_PROBE_TIMEOUT_MS = 15_000;

/** Reject anything that is not canonical base64, which also blocks any control
 * character (newline, space) that could smuggle an extra header line. */
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * What the account behind an authenticated key can currently do.
 *
 * `unknown` is not padding: a probe that fails on a network blip or a 5xx says
 * nothing about the account, and reporting it as either of the other two would
 * repeat the exact overreach this probe exists to end.
 *
 * Not exported: it reaches the client through `save`'s inferred return type, so
 * a second declaration would be a second thing to keep in sync.
 */
type DataforseoKeyReadiness = "ready" | "not_serving" | "unknown";

/** Non-secret view of an organization's DataForSEO credential state. */
interface DataforseoKeyStatus {
  configured: boolean;
  source: "org" | "global" | "none";
  /** Last 4 chars of the org key, for display only; null unless an org key set. */
  last4: string | null;
  /** Whether the caller (owner/admin) may set or remove the key. */
  canManage: boolean;
}

interface ActorContext {
  userId: string;
  organizationId: string;
  authMode: AuthMode;
}

/**
 * Resolve the credential status without decrypting the stored key: an org row
 * wins as "org"; an operator global key is shown only where runtime policy
 * authorizes its spend; otherwise the status is "none" so the setup CTA invites
 * a BYO key. `canManage` reflects the caller's workspace role so the UI can hide
 * the control from viewers; the server stays the real gate on every write.
 */
async function getStatus(
  input: ActorContext & {
    globalApiKey: string | null | undefined;
    hostedAccessOpen: boolean;
  },
): Promise<DataforseoKeyStatus> {
  const [row, role] = await Promise.all([
    OrganizationSeoCredentialRepository.getEncrypted(input.organizationId),
    resolveWorkspaceRole({
      userId: input.userId,
      organizationId: input.organizationId,
      authMode: input.authMode,
    }),
  ]);
  const canManage = canManageTarget(role);

  if (row) {
    return { configured: true, source: "org", last4: row.keyLast4, canManage };
  }
  const globalApiKey = input.globalApiKey?.trim();
  if (globalApiKey) {
    const access = await resolveDataforseoCredentialAccess(
      { apiKey: globalApiKey, source: "global" },
      {
        hosted: input.authMode === "hosted",
        openAccess: input.hostedAccessOpen,
      },
    );
    if (access !== "unavailable") {
      return { configured: true, source: "global", last4: null, canManage };
    }
  }
  return { configured: false, source: "none", last4: null, canManage };
}

/**
 * Validate a pasted key live against DataForSEO, then store it encrypted for the
 * organization. Owner/admin only. Returns the masked last-4 so the UI can
 * confirm without ever handling the raw key again, plus what the probes could
 * actually establish about the account.
 *
 * A key whose account is not serving yet is still stored: the credential is
 * genuine, the refusal is temporary (a new account can start answering a day
 * later on its own), and refusing the save would strand the owner. The caller's
 * job is to report the state, not to hide it behind a bare "saved".
 */
async function save(input: ActorContext & { apiKey: string }): Promise<{
  source: "org";
  last4: string;
  readiness: DataforseoKeyReadiness;
}> {
  await assertCanManage(input);

  const apiKey = input.apiKey.trim();
  assertValidKeyFormat(apiKey);
  await validateKeyWithDataforseo(apiKey);
  // Ordered so nothing billable is spent on a malformed or rejected key.
  const readiness = await probeAccountReadiness(apiKey);

  const last4 = apiKey.slice(-4);
  await OrganizationSeoCredentialRepository.upsert({
    organizationId: input.organizationId,
    encryptedApiKey: await encryptDataforseoKey(apiKey),
    keyLast4: last4,
    createdByUserId: input.userId,
  });
  return { source: "org", last4, readiness };
}

/** Remove the organization's stored key, falling back to the global env key (or
 * "not configured"). Owner/admin only. */
async function remove(input: ActorContext): Promise<void> {
  await assertCanManage(input);
  await OrganizationSeoCredentialRepository.remove(input.organizationId);
}

async function assertCanManage(input: ActorContext): Promise<void> {
  const role = await resolveWorkspaceRole({
    userId: input.userId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  if (!canManageTarget(role)) {
    throw new AppError(
      "FORBIDDEN",
      "Only workspace owners and admins can manage the DataForSEO key",
    );
  }
}

function assertValidKeyFormat(apiKey: string): void {
  if (
    apiKey.length === 0 ||
    apiKey.length % 4 !== 0 ||
    !BASE64_PATTERN.test(apiKey)
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "The DataForSEO key must be the base64 encoding of your login:password",
    );
  }
}

async function validateKeyWithDataforseo(apiKey: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(DATAFORSEO_USER_DATA_URL, {
      method: "GET",
      headers: { Authorization: `Basic ${apiKey}` },
    });
  } catch {
    // Reaching DataForSEO failed outright (network/DNS). Treat as a transient
    // upstream problem the owner can retry, not a bad key.
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "Could not reach DataForSEO to validate the key",
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new AppError(
      "DATAFORSEO_AUTH_FAILED",
      "DataForSEO rejected this key",
    );
  }
  if (!response.ok) {
    throw new AppError(
      "INTERNAL_ERROR",
      `DataForSEO key validation failed (${response.status})`,
    );
  }
}

/** DataForSEO reports a task-level status inside a 200 as well as at the top
 * level, so both are worth reading before calling an account ready. */
const readinessEnvelopeSchema = z.object({
  status_code: z.number(),
  tasks: z
    .array(z.object({ status_code: z.number().optional() }))
    .nullable()
    .optional(),
});

function isAccountRefusalStatus(status: number | undefined): boolean {
  return status !== undefined && ACCOUNT_REFUSAL_STATUSES.has(status);
}

/**
 * Ask DataForSEO whether it will serve billable data for this account. Never
 * throws: the key has already authenticated by this point, so a probe that
 * cannot reach a verdict must degrade to `unknown` rather than fail the save.
 */
async function probeAccountReadiness(
  apiKey: string,
): Promise<DataforseoKeyReadiness> {
  let response: Response;
  try {
    response = await fetch(DATAFORSEO_READINESS_PROBE_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(READINESS_PROBE_PAYLOAD),
      signal: AbortSignal.timeout(READINESS_PROBE_TIMEOUT_MS),
    });
  } catch {
    return "unknown";
  }

  // 403 is DataForSEO accepting the credential and refusing the account. 401
  // cannot normally reach here — the auth probe ran first — but it is the same
  // refusal if it does.
  if (response.status === 401 || response.status === 403) return "not_serving";
  if (!response.ok) return "unknown";

  const body: unknown = await response.json().catch(() => null);
  const parsed = readinessEnvelopeSchema.safeParse(body);
  if (!parsed.success) return "unknown";

  const taskStatus = parsed.data.tasks?.[0]?.status_code;
  if (
    parsed.data.status_code === 20000 &&
    (taskStatus === undefined || taskStatus === 20000)
  ) {
    return "ready";
  }
  if (
    isAccountRefusalStatus(parsed.data.status_code) ||
    isAccountRefusalStatus(taskStatus)
  ) {
    return "not_serving";
  }
  return "unknown";
}

export const DataforseoKeyService = {
  getStatus,
  save,
  remove,
} as const;
