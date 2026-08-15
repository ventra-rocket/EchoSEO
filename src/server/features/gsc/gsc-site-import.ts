/**
 * Turning a Search Console property into something this app can audit.
 *
 * Google hands back two shapes and they mean different things:
 *
 * - `sc-domain:example.com` — a domain property. Covers every subdomain and both
 *   schemes, so there is no single URL in it; one has to be derived.
 * - `https://www.example.com/` — a URL-prefix property. Scheme and host are part
 *   of the property's identity, so neither may be rewritten.
 *
 * The invariant every mapping here must hold: **the origin this derives must be
 * covered by the property it came from.** Every Search Console read for the target
 * runs through `propertyCoversOrigin`, which compares protocol and host exactly
 * for a URL-prefix property — so silently upgrading `http://` to `https://` would
 * produce a target whose own property reports `property_mismatch`, and the
 * failure would only appear as missing search data long after the import
 * "succeeded". That is why `gsc-site-import.test.ts` asserts the mapping against
 * the real predicate rather than restating these rules.
 */

const DOMAIN_PROPERTY_PREFIX = "sc-domain:";

export type GscPropertyKind = "domain" | "url_prefix";

type GscSiteTargetPlan = {
  /** The property exactly as Search Console named it. */
  siteUrl: string;
  kind: GscPropertyKind;
  /** Canonical origin the audit target crawls, e.g. `https://example.com`. */
  origin: string;
  /** The origin's host — the project's name and its `domain` column. */
  host: string;
  /**
   * Path a URL-prefix property was scoped to, which the crawl origin drops.
   *
   * Surfaced rather than swallowed: `propertyCoversOrigin` compares host and
   * protocol only, so `https://example.com/shop/` does report on the whole origin
   * and the crawl will legitimately reach beyond `/shop/`. The importer says so
   * instead of letting the user discover it in a crawl report.
   */
  droppedPath: string | null;
};

/**
 * Map one property to the target it should create, or null when the property is
 * not something a crawl can be pointed at.
 *
 * Null rather than throwing: an import is a batch, and one unusable property must
 * cost the user only that row.
 */
export function planGscSiteTarget(siteUrl: string): GscSiteTargetPlan | null {
  const raw = siteUrl.trim();
  if (!raw) return null;

  if (raw.toLowerCase().startsWith(DOMAIN_PROPERTY_PREFIX)) {
    return planDomainProperty(raw);
  }
  return planUrlPrefixProperty(raw);
}

function planDomainProperty(siteUrl: string): GscSiteTargetPlan | null {
  const domain = siteUrl
    .slice(DOMAIN_PROPERTY_PREFIX.length)
    .trim()
    .toLowerCase();
  // A domain property is a bare host. Anything carrying a scheme, a path or
  // whitespace is not one, and guessing what was meant would produce a target
  // pointed somewhere the user never verified.
  if (!domain || /[\s/:?#]/.test(domain)) return null;

  // `https` is chosen, not assumed: a domain property covers both schemes, and
  // `propertyCoversOrigin` ignores protocol for this shape, so the crawl should
  // start on the one the site is expected to serve.
  let parsed: URL;
  try {
    parsed = new URL(`https://${domain}`);
  } catch {
    return null;
  }
  // Rejects a host `URL` accepted but rewrote (an IDN, a stray credential, a
  // trailing dot) — the origin must read back as the domain Google named.
  if (parsed.hostname !== domain) return null;

  return {
    siteUrl,
    kind: "domain",
    origin: parsed.origin,
    host: parsed.hostname,
    droppedPath: null,
  };
}

function planUrlPrefixProperty(siteUrl: string): GscSiteTargetPlan | null {
  let parsed: URL;
  try {
    parsed = new URL(siteUrl);
  } catch {
    return null;
  }
  // Search Console only issues http/https properties; anything else reaching
  // here is a malformed row, not a site.
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!parsed.hostname) return null;

  return {
    siteUrl,
    kind: "url_prefix",
    // Keeps the property's own scheme. Upgrading it would break the exact
    // protocol comparison the verification gate makes.
    origin: parsed.origin,
    host: parsed.hostname.toLowerCase(),
    droppedPath: parsed.pathname === "/" ? null : parsed.pathname,
  };
}
