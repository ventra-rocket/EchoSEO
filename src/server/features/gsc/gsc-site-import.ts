/**
 * Turning a Search Console property into something this app can audit.
 *
 * Google hands back two shapes and they mean different things:
 *
 * - `sc-domain:example.com` — a domain property. Covers every subdomain and both
 *   schemes, so there is no single URL in it; one has to be derived.
 * - `https://www.example.com/` — a URL-prefix property. Scheme and host are part
 *   of the property's identity, so neither may be rewritten — and its path
 *   matters too: `propertyCoversOrigin` credits a URL-prefix property for an
 *   origin only when the property itself is rooted at `/`. A property scoped to
 *   a path, `https://example.com/shop/`, is refused rather than mapped to
 *   `https://example.com` with the path silently dropped.
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
  // `propertyCoversOrigin` (`@/shared/gsc-property-match`) credits a URL-prefix
  // property only when it is rooted at `/`: Search Console reports a
  // path-scoped property on its own prefix alone, never on the rest of the
  // host it sits on. Mapping it to the bare origin anyway — the previous
  // behavior — produced a project this app described as covering the whole
  // site while Search Console would only ever report on `/shop/`. Refusing it
  // here, instead of dropping the path, is the fix.
  if (parsed.pathname !== "/") return null;

  return {
    siteUrl,
    kind: "url_prefix",
    // Keeps the property's own scheme. Upgrading it would break the exact
    // protocol comparison the verification gate makes.
    origin: parsed.origin,
    host: parsed.hostname.toLowerCase(),
  };
}

/**
 * True when `siteUrl` is a URL-prefix property Search Console could actually
 * issue, scoped to a path rather than the root — real and verified, and still
 * refused by `planUrlPrefixProperty` above, because `propertyCoversOrigin`
 * credits it only for that one path. Exported so the importer can name this
 * specific, fixable reason on the picker and the import result, instead of
 * lumping a too-narrow property in with a shape Search Console never issues.
 */
export function isPathScopedGscProperty(siteUrl: string): boolean {
  const raw = siteUrl.trim();
  if (raw.toLowerCase().startsWith(DOMAIN_PROPERTY_PREFIX)) return false;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (!parsed.hostname) return false;
  return parsed.pathname !== "/";
}
