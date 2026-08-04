/**
 * Resolves which DataForSEO API key a given organization should call with.
 *
 * Order: per-organization "bring your own key" (decrypted) → global operator
 * key (`DATAFORSEO_API_KEY` env) → none. The `source` lets the metering layer
 * decide whether to bypass Autumn (org-owned keys are self-paid) and lets the UI
 * label where the active key comes from. `none` is not an error here — the
 * caller surfaces a clear "not configured" message instead of crashing.
 */
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import {
  decryptDataforseoKey,
  OrganizationSeoCredentialRepository,
} from "@/server/features/seo-credentials/OrganizationSeoCredentialRepository";

export type ResolvedDataforseoCredentials =
  | { apiKey: string; source: "org" }
  | { apiKey: string; source: "global" }
  | { apiKey: null; source: "none" };

export async function resolveDataforseoCredentials(
  organizationId: string,
): Promise<ResolvedDataforseoCredentials> {
  const stored =
    await OrganizationSeoCredentialRepository.getEncrypted(organizationId);
  if (stored) {
    const apiKey = await decryptDataforseoKey(stored.encryptedApiKey);
    return { apiKey, source: "org" };
  }

  const globalKey = await getOptionalEnvValue("DATAFORSEO_API_KEY");
  if (globalKey) {
    return { apiKey: globalKey, source: "global" };
  }

  return { apiKey: null, source: "none" };
}
