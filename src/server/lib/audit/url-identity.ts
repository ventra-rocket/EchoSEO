/**
 * Identity for comparing two URLs that are really the same document.
 *
 * The crawler stores the URL it landed on after redirects, while sitemaps and
 * link hrefs carry the URL as published. Comparing those as raw strings makes a
 * site that canonicalizes `www` -> apex or `http` -> `https` look like it has no
 * sitemap coverage and no internal links at all, so both comparisons key on the
 * same scheme- and www-insensitive identity the crawl boundary already treats as
 * one host.
 *
 * Residual (accepted): a path-level redirect (`/a` -> `/b`) still does not
 * match, because the requested URL is not retained on the crawl result. The
 * error stays one-sided — two different documents never collide.
 */
export function urlEquivalenceKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    parsed.searchParams.sort();
    const path = parsed.pathname.replace(/\/+$/, "") || "/";

    return `${host}${path}${parsed.search}`;
  } catch {
    return null;
  }
}
