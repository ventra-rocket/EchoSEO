/**
 * Scheme allow-list for URLs that reach an `<a href>`.
 *
 * Any URL we did not author is untrusted: DataForSEO results, LLM answers, and
 * — for the site audit — every URL discovered by crawling a customer's site. A
 * crawled or generated `javascript:` URL rendered into `href` is clickable from
 * inside an authenticated session, so it is filtered at the boundary instead.
 *
 * Environment-neutral on purpose: the same check has to run server-side when
 * building a response and client-side when rendering a link, and duplicating it
 * is how the two drift apart.
 */

/**
 * The URL string unchanged when its protocol is `http:` or `https:`, otherwise
 * null. Callers drop null entries rather than rendering them as links.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // Reject `user:pass@host` — the hostname the user sees in link text may
    // differ from where the browser authenticates.
    if (url.username || url.password) return null;
    return value;
  } catch {
    return null;
  }
}

/** Type guard form, for JSX that needs a boolean rather than a value. */
export function isSafeHttpUrl(
  value: string | null | undefined,
): value is string {
  return safeHttpUrl(value) !== null;
}

/**
 * Extract the bare hostname (without leading `www.`) from a URL string,
 * returning null if the URL is invalid or uses a non-http(s) scheme.
 */
export function safeHostname(value: string | null | undefined): string | null {
  const url = safeHttpUrl(value);
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
