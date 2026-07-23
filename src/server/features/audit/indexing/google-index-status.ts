/**
 * Pure helpers for the Google index-status surface — no database, no network.
 *
 * Everything Google-facing here is a READ or a deep link. The connected GSC grant
 * is `webmasters.readonly`, so there is no submit/index API; requesting indexing
 * or (re)submitting a sitemap is a manual Search Console action the user reaches
 * through these links.
 */
import type { UrlInspectionResult } from "@/server/lib/gscClient";
import { safeHttpUrl } from "@/lib/safe-url";

/** Deep link to the Sitemaps section of Search Console for a property. */
export function buildSitemapsDeepLink(siteUrl: string): string {
  return `https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(
    siteUrl,
  )}`;
}

export interface InspectionView {
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  robotsTxtState: string | null;
  lastCrawlTime: string | null;
  googleCanonical: string | null;
  /** Google's own deep link to this URL's inspection in Search Console. */
  inspectionResultLink: string | null;
}

/**
 * Flatten a GSC URL Inspection result into the fields the card shows. A missing
 * result (the URL was never inspected / had no index-status block) reads as all
 * nulls rather than inventing a verdict.
 */
export function mapInspection(
  result: UrlInspectionResult | null,
): InspectionView {
  const status = result?.indexStatusResult;
  return {
    verdict: status?.verdict ?? null,
    coverageState: status?.coverageState ?? null,
    indexingState: status?.indexingState ?? null,
    robotsTxtState: status?.robotsTxtState ?? null,
    lastCrawlTime: status?.lastCrawlTime ?? null,
    googleCanonical: status?.googleCanonical ?? null,
    // A Google-supplied URL string, so it goes through the http(s) allow-list
    // before becoming a link — a hostile/unexpected value resolves to null, never
    // a `javascript:` href (the same posture the P10 Search tab uses).
    inspectionResultLink: safeHttpUrl(result?.inspectionResultLink),
  };
}

/** Whether `url` sits within `origin` (same scheme + host + port). */
export function isWithinOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}
