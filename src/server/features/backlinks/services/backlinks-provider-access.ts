import type { AuthMode } from "@/lib/auth-mode";
import {
  fetchDataforseoAccountState,
  hasActiveDataforseoSubscription,
} from "@/server/lib/dataforseoAccountState";

const BACKLINKS_NOT_ENABLED_MESSAGE =
  "Backlinks is not enabled for the connected DataForSEO account yet. Turn it on in DataForSEO, then confirm here.";

type BacklinksProviderAccess = {
  enabled: boolean;
  /** A user-facing reason when disabled, or null when enabled. */
  message: string | null;
};

/**
 * Whether the DataForSEO backlinks capability is available to this deployment.
 *
 * Hosted deployments run on our managed, metered key and are always enabled.
 * Self-host (BYO-key) is enabled only while the connected account holds an
 * active backlinks subscription. The auth mode is passed in already resolved so
 * every caller gates on the same source rather than re-reading it, which is how
 * a split config would otherwise let one gate disagree with another.
 */
export async function resolveBacklinksProviderAccess(
  authMode: AuthMode,
): Promise<BacklinksProviderAccess> {
  if (authMode === "hosted") {
    return { enabled: true, message: null };
  }

  const state = await fetchDataforseoAccountState();
  const enabled = hasActiveDataforseoSubscription(
    state?.backlinksSubscriptionExpiryDate ?? null,
  );
  return {
    enabled,
    message: enabled ? null : BACKLINKS_NOT_ENABLED_MESSAGE,
  };
}
