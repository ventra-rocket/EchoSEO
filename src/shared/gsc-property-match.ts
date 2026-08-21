/**
 * Two different questions about a connected Search Console `siteUrl`, kept apart
 * on purpose because one function answering both was a defect: it capped a crawl
 * of `blog.example.com` at the unverified size for the owner of
 * `https://example.com/`, who had proved exactly what the cap exists to demand.
 *
 * - `propertyCoversOrigin` — **whose data is this?** Strict, because reading a
 *   property that does not cover the target attributes one site's Search Console
 *   metrics to another. A URL-prefix property covers an origin only when it is
 *   rooted at `/`: Search Console reports a path-scoped property on its own
 *   prefix alone, never on the rest of the host it sits on.
 * - `propertyProvesOwnership` — **may this user spend a large crawl here?** A
 *   proof of control, so it follows down the host tree and ignores the scheme.
 *
 * Shared rather than server-only because the launch form must answer the same
 * question the launch gate answers — before the crawl is refused for it. Both
 * sides calling one function is the only way the explanation shown to the user
 * cannot disagree with the rule enforced on the server.
 */

const DOMAIN_PROPERTY_PREFIX = "sc-domain:";

function readOriginHost(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** The domain of an `sc-domain:` property, or null for any other shape. */
function readDomainProperty(siteUrl: string): string | null {
  if (!siteUrl.startsWith(DOMAIN_PROPERTY_PREFIX)) return null;
  const domain = siteUrl.slice(DOMAIN_PROPERTY_PREFIX.length).trim();
  return domain ? domain.toLowerCase() : null;
}

function readPrefixProperty(siteUrl: string): URL | null {
  try {
    return new URL(siteUrl);
  } catch {
    return null;
  }
}

/**
 * `host` is `domain` itself or a subdomain of it. The leading dot is what keeps
 * `example.com.evil.com` out.
 */
function hostIsAtOrUnder(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Does this property's Search Console data cover this origin?
 *
 * - `sc-domain:<domain>` — the domain, its subdomains, and both protocols.
 * - `https://host/…` — the same protocol and host, and only when the property
 *   itself is scoped to the root (`/`). Search Console reports a URL-prefix
 *   property on URLs under its own prefix and nothing else, so
 *   `https://example.com/shop/` never reports on `https://example.com` as a
 *   whole — treating it as if it did would attribute one path's metrics to
 *   the entire host, exactly the fabricated join this gate exists to refuse.
 */
export function propertyCoversOrigin(origin: string, siteUrl: string): boolean {
  const originHost = readOriginHost(origin);
  if (!originHost) return false;

  const domain = readDomainProperty(siteUrl);
  if (domain) return hostIsAtOrUnder(originHost, domain);

  const property = readPrefixProperty(siteUrl);
  if (!property) return false;
  return (
    property.protocol === new URL(origin).protocol &&
    property.hostname.toLowerCase() === originHost &&
    property.pathname === "/"
  );
}

/**
 * Does this property prove the user controls this origin?
 *
 * Ownership is a property of the site, not of a URL, so this is deliberately
 * wider than `propertyCoversOrigin` in two ways — each one a case where the
 * strict rule refused a crawl the user had already proved they were entitled to:
 *
 * - **Subdomains.** Verifying `https://example.com/` means placing a file, a
 *   meta tag, or a DNS record for `example.com`; whoever can do that controls its
 *   subdomains. Reaching `*.example.com` therefore requires already controlling
 *   the host that grants it, which is the same bar `sc-domain:example.com`
 *   already sets. It does not widen who can pass the gate, only which of their
 *   own hosts they can crawl.
 * - **Protocol.** `http://` and `https://` on one host are one site with one
 *   owner. Only a data read cares which scheme the property was registered under.
 *
 * The one place it stays strict: a path-scoped property extends to no other host.
 * `https://sites.example.com/site/mine/` proves control of a directory on a
 * shared host, never of the hosts beside it.
 */
export function propertyProvesOwnership(
  origin: string,
  siteUrl: string,
): boolean {
  const originHost = readOriginHost(origin);
  if (!originHost) return false;

  const domain = readDomainProperty(siteUrl);
  if (domain) return hostIsAtOrUnder(originHost, domain);

  const property = readPrefixProperty(siteUrl);
  if (!property) return false;

  const propertyHost = property.hostname.toLowerCase();
  if (propertyHost === originHost) return true;
  if (property.pathname !== "/") return false;
  return hostIsAtOrUnder(originHost, propertyHost);
}
