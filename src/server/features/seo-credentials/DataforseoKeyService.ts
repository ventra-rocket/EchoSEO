/**
 * Business logic for the per-organization "bring your own key" DataForSEO
 * credential: compute a non-secret status, and — for owner/admin callers only —
 * validate a pasted key live against DataForSEO before storing it encrypted, or
 * remove it. The raw key is never logged and never returned to the client; the
 * caller receives only a masked last-4 and the resolved source.
 *
 * Kept free of the TanStack request / Cloudflare runtime so the authorization
 * and validation contract stays unit-testable against a real SQLite database,
 * mirroring the audit service layer.
 */
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

/** Reject anything that is not canonical base64, which also blocks any control
 * character (newline, space) that could smuggle an extra header line. */
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

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
 * confirm without ever handling the raw key again.
 */
async function save(
  input: ActorContext & { apiKey: string },
): Promise<{ source: "org"; last4: string }> {
  await assertCanManage(input);

  const apiKey = input.apiKey.trim();
  assertValidKeyFormat(apiKey);
  await validateKeyWithDataforseo(apiKey);

  const last4 = apiKey.slice(-4);
  await OrganizationSeoCredentialRepository.upsert({
    organizationId: input.organizationId,
    encryptedApiKey: await encryptDataforseoKey(apiKey),
    keyLast4: last4,
    createdByUserId: input.userId,
  });
  return { source: "org", last4 };
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

export const DataforseoKeyService = {
  getStatus,
  save,
  remove,
} as const;
