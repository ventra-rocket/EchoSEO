/**
 * Pure string formatting for the Deep report chrome. Kept out of the .tsx so
 * the parts that can actually be wrong — date parsing, URL parsing — have unit
 * tests (this repo's vitest config collects plain `.test.ts` files only).
 */
import type { Locale } from "@/client/i18n/config";

/**
 * The scan date shown in the score band, e.g. "Jul 19, 2026" / "19 thg 7, 2026".
 *
 * Formatted in UTC: the report's `fetchedAt` is an instant, and rendering it in
 * the viewer's zone could label the same report with two different dates on the
 * two sides of a forwarded link. An unparseable value falls back to the raw
 * string rather than "Invalid Date".
 */
export function formatScanDate(fetchedAt: string, locale: Locale): string {
  const date = new Date(fetchedAt);
  if (Number.isNaN(date.getTime())) return fetchedAt;
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Path-only form of a crawled-page URL for the "Other pages crawled" list.
 *
 * Every row in that list shares the report's host, so rendering full URLs made
 * every row truncate to the same "https://host/en/…" prefix — the one varying
 * part was the part that got cut. The host is dropped, the path (plus query)
 * kept. A malformed URL renders as-is rather than hiding the row's identity.
 */
export function pagePathOnly(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    return url;
  }
}
