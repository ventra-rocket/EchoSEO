import { createAuthClient } from "better-auth/react";
import {
  genericOAuthClient,
  inferAdditionalFields,
  organizationClient,
} from "better-auth/client/plugins";
import { captureClientEvent, resetAnalyticsUser } from "@/client/lib/posthog";
import { userAdditionalFields } from "@/lib/auth-options";
import { roles } from "@/lib/auth-access-control";
import { getSignInHrefForLocation } from "@/lib/auth-redirect";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  plugins: [
    // The same roles as the server so the client's inviteMember/updateMemberRole
    // accept editor/viewer, not only Better Auth's owner/admin/member defaults.
    organizationClient({ roles }),
    genericOAuthClient(),
    inferAdditionalFields({ user: userAdditionalFields }),
  ],
});

export const { useSession } = authClient;

export function signOutAndRedirect() {
  const signInHref = getSignInHrefForLocation(window.location);
  captureClientEvent("auth:sign_out");
  resetAnalyticsUser();
  void authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.assign(signInHref);
      },
    },
  });
}
