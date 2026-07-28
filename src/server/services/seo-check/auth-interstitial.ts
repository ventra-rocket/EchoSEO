/**
 * Detect when a fetch's final URL is a known auth/SSO interstitial — a login or
 * access-gate page that answers 200 for a site whose real content sits behind it.
 *
 * The Lite checker follows redirects and only rejects non-2xx (see safe-fetch),
 * so an auth-gated homepage (e.g. Cloudflare Access → `*.cloudflareaccess.com`)
 * lands on a 200 login page and would otherwise be scored as if it were the site
 * — handing the visitor a confident number for a login screen. Matching a small
 * allowlist of interstitial hosts lets the checker say "this site is behind a
 * login" instead.
 *
 * Host-allowlist only, never a path heuristic like "/login": real, indexable
 * pages live under `/login` on plenty of sites, so a path match would be a false
 * positive. The trade-off is that an unknown SSO provider is missed until its
 * host is added here — a miss degrades to the old behaviour, which is acceptable.
 */
const AUTH_INTERSTITIAL_HOSTS = [
  "cloudflareaccess.com", // Cloudflare Access / Zero Trust
  "accounts.google.com", // Google sign-in
  "login.microsoftonline.com", // Microsoft Entra ID
  "okta.com", // Okta
] as const;

/** True if `url`'s host is (or is a subdomain of) a known auth interstitial. */
export function isAuthInterstitialUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return false;
  }
  return AUTH_INTERSTITIAL_HOSTS.some(
    (base) => host === base || host.endsWith(`.${base}`),
  );
}
