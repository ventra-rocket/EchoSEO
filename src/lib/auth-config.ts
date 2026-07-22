import { env } from "cloudflare:workers";
import { genericOAuth, organization } from "better-auth/plugins";
import { baseAuthOptions } from "@/lib/auth-options";
import { roles } from "@/lib/auth-access-control";
import { sendHostedInvitationEmail } from "@/server/email/loops";
import { GSC_OAUTH_PROVIDER_ID, GSC_OAUTH_SCOPES } from "@/shared/gsc";

export function createBaseAuthConfig() {
  return {
    ...baseAuthOptions,
    account: {
      // Encrypt OAuth access/refresh tokens at rest in D1. Also covers the
      // google social-login tokens; the key derives from BETTER_AUTH_SECRET.
      encryptOAuthTokens: true,
      accountLinking: {
        // Allow connecting a Google account whose email differs from the
        // logged-in user's (agency/freelancer managing a client's property).
        allowDifferentEmails: true,
      },
    },
    plugins: [
      // Block user-initiated org creation: each org is its own Autumn customer
      // with its own onboarding-plan credit grant, so an authenticated user
      // hitting POST /api/auth/organization/create could mint unlimited fresh
      // grants. The app gives every user exactly one workspace, created
      // server-side at signup via `auth.api.createOrganization({ body: { userId }})`
      // — that's a "system action" (no session + userId in body) which better-auth
      // exempts from this flag, so the bootstrap keeps working.
      organization({
        allowUserToCreateOrganization: false,
        // editor/viewer are assignable seats; the audit matrix governs what they
        // can do in-product (see auth-access-control.ts).
        roles,
        // Never throws — an invite must survive a missing template or Loops
        // outage. No-ops in non-hosted mode (no LOOPS_* / BETTER_AUTH_URL).
        sendInvitationEmail: async (data) => {
          const baseUrl = env.BETTER_AUTH_URL?.trim() ?? "";
          try {
            await sendHostedInvitationEmail({
              email: data.email,
              // Names are user-controlled and go into an email to an arbitrary
              // recipient — cap them to blunt the phishing/overflow surface.
              inviterName: (
                data.inviter.user.name?.trim() ||
                data.inviter.user.email ||
                "A teammate"
              ).slice(0, 120),
              organizationName: (
                data.organization.name || "your workspace"
              ).slice(0, 120),
              acceptUrl: `${baseUrl}/accept-invitation/${data.id}`,
            });
          } catch (error) {
            console.error("Failed to send workspace invitation email", error);
          }
        },
      }),
      genericOAuth({
        config: [
          {
            providerId: GSC_OAUTH_PROVIDER_ID,
            clientId: env.GOOGLE_CLIENT_ID?.trim() ?? "",
            clientSecret: env.GOOGLE_CLIENT_SECRET?.trim() ?? "",
            discoveryUrl:
              "https://accounts.google.com/.well-known/openid-configuration",
            scopes: [...GSC_OAUTH_SCOPES],
            accessType: "offline", // request a refresh token
            prompt: "consent", // force refresh-token issuance on re-consent
            pkce: true,
          },
        ],
      }),
    ],
  };
}
