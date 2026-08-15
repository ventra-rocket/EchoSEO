/**
 * Does a connected Search Console `siteUrl` prove ownership of an origin?
 *
 * Shared rather than server-only because the launch form has to answer the same
 * question the launch gate answers — before the crawl is refused for it. Both
 * sides calling one function is the only way the explanation shown to the user
 * cannot disagree with the rule enforced on the server.
 *
 * - `sc-domain:<domain>` — domain property covering the domain, all subdomains,
 *   and both protocols.
 * - `https://host/…` — URL-prefix property matching the same protocol + host.
 *   A path is ignored: verifying `https://example.com/shop/` does prove the host.
 */
export function originMatchesGscSiteUrl(
  origin: string,
  siteUrl: string,
): boolean {
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  const originHost = originUrl.hostname.toLowerCase();

  const domainPrefix = "sc-domain:";
  if (siteUrl.startsWith(domainPrefix)) {
    const domain = siteUrl.slice(domainPrefix.length).trim().toLowerCase();
    if (!domain) return false;
    return originHost === domain || originHost.endsWith(`.${domain}`);
  }

  try {
    const propertyUrl = new URL(siteUrl);
    return (
      propertyUrl.protocol === originUrl.protocol &&
      propertyUrl.hostname.toLowerCase() === originHost
    );
  } catch {
    return false;
  }
}
