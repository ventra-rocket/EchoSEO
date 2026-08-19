/** Better Auth providerId for the incremental Google Search Console connection.
 *  Kept in `shared` so both server (auth config, GSC client) and client (connect
 *  button) can reference it without importing the server-only auth config. */
export const GSC_OAUTH_PROVIDER_ID = "google-search-console";

export const GSC_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/webmasters.readonly",
] as const;

/** Why a Search Console property listing came back with nothing to pick. Each
 *  value maps to a different user action, so the picker can stop telling people
 *  to reconnect when a fresh grant cannot fix their problem. Lives in `shared`
 *  so the server-side classifier (GscService) and the client-side copy table
 *  (SitePicker) cannot drift apart. */
export type GscGrantFailureReason =
  /** No google-search-console grant exists for this user at all. */
  | "not_connected"
  /** Google authenticated the grant and still refused Search Console: the OAuth
   *  app's publishing status, a Workspace admin policy, or a declined scope. */
  | "consent_blocked"
  /** The grant is spent — revoked, or its refresh token expired. */
  | "grant_expired"
  /** Search Console itself was unavailable or rate-limiting. Retryable. */
  | "provider_error";

export const GSC_SELF_HOSTED_SETUP_DOCS_URL =
  "https://github.com/ventra-rocket/EchoSEO/blob/main/docs/SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md";
