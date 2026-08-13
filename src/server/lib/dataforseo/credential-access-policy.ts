import {
  isHostedAccessOpen,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";
import type { ResolvedDataforseoCredentials } from "@/server/lib/dataforseo/resolve-credentials";

type DataforseoCredentialAccess =
  | "unavailable"
  | "byo"
  | "global-self-host"
  | "global-metered";

/**
 * Turns credential source + runtime mode into the only four supported spend
 * paths. Hosted open-access deliberately rejects the operator's global key:
 * with no billing entitlement gate, falling back to that key would let any
 * public signup spend operator funds silently. Organizations can still attach
 * and use their own key, while self-host and metered hosted deployments retain
 * the global-key behavior they explicitly configured.
 */
export async function resolveDataforseoCredentialAccess(
  credentials: ResolvedDataforseoCredentials,
  runtime?: { hosted: boolean; openAccess: boolean },
): Promise<DataforseoCredentialAccess> {
  if (credentials.source === "none") return "unavailable";
  if (credentials.source === "org") return "byo";

  const hosted = runtime?.hosted ?? (await isHostedServerAuthMode());
  if (!hosted) return "global-self-host";

  const openAccess = runtime?.openAccess ?? (await isHostedAccessOpen());
  return openAccess ? "unavailable" : "global-metered";
}

/**
 * Non-secret status helper for UI/readiness surfaces that only know whether an
 * org row exists. It mirrors the execution policy without decrypting or
 * returning either credential.
 */
export async function hasUsableDataforseoCredentials(input: {
  hasOrganizationKey: boolean;
  globalApiKey: string | null | undefined;
  runtime: { hosted: boolean; openAccess: boolean };
}): Promise<boolean> {
  if (input.hasOrganizationKey) return true;

  const globalApiKey = input.globalApiKey?.trim();
  if (!globalApiKey) return false;

  return (
    (await resolveDataforseoCredentialAccess(
      { apiKey: globalApiKey, source: "global" },
      input.runtime,
    )) !== "unavailable"
  );
}
