/**
 * Sitemap membership for crawled pages.
 *
 * A crawled page is identified by its FINAL url (after redirects) while sitemap
 * entries are the `<loc>` values as published. An exact string match therefore
 * reports "not in sitemap" for the very common setup where the sitemap lists
 * `www`/`http` URLs and the site canonicalizes to apex/https — marking every
 * page an orphan. Membership is matched on crawl-boundary equivalence instead:
 * the same `www`/apex and scheme tolerance the crawler already uses to decide a
 * URL is in scope.
 *
 * Residual (accepted) limitation: a path-level redirect (`/a` -> `/b`) still
 * does not match, because the requested URL is not retained on the crawl result.
 * The error stays one-sided — pages are never wrongly marked as in-sitemap.
 */

import { urlEquivalenceKey } from "./url-identity";

/**
 * Build a membership predicate for one crawl. Both sides of the comparison go
 * through the same key function, so the sitemap set and the page can never
 * disagree on identity.
 */
export function buildSitemapMembership(
  sitemapUrls: Iterable<string>,
): (pageUrl: string) => boolean {
  const keys = new Set<string>();
  for (const url of sitemapUrls) {
    const key = urlEquivalenceKey(url);
    if (key) keys.add(key);
  }

  return (pageUrl: string) => {
    const key = urlEquivalenceKey(pageUrl);
    return key !== null && keys.has(key);
  };
}
