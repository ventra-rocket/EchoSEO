/**
 * Diffs two audits' stored page facts and reports what changed per URL.
 *
 * Pure: no database, no clock, no network — the same two inputs always produce
 * the same result, so the whole diff is unit-testable from crafted inputs.
 *
 * Honesty is the constraint that shapes this file. The crawl stores counts and
 * flags, not text bodies: there is no H1 text and no content hash, only
 * `h1Count` and `wordCount`. So a change is reported as "H1 count 1 → 2" or
 * "word count 500 → 320", never "H1 reworded" or "content changed" — a page
 * reworded with the same counts is invisible to the crawl, and claiming
 * otherwise would be a lie.
 *
 * The comparison key is the stored `url` (the final landed URL), the same
 * contract the issue delta uses. A URL present on only one side is NOT a change
 * here: a page missing from the current crawl may have hit the crawl cap rather
 * than been deleted, and a new URL may simply have been reached this time.
 * Page-added / page-removed is deliberately out of scope.
 */

/** The stored page facts this diff compares; a lean projection of audit_pages. */
export interface PageFacts {
  url: string;
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  wordCount: number;
  statusCode: number | null;
  canonicalUrl: string | null;
  isIndexable: boolean;
  inSitemap: boolean;
  /**
   * The response really was an HTML document. A failed fetch or a non-HTML
   * resource is stored with empty placeholder fields (blank title, 0 counts,
   * noindex), so on-page facts are only trustworthy — and only compared — when
   * this is true on both sides, mirroring the materializer's document gate.
   */
  isHtml: boolean;
}

export type PageFieldName =
  | "title"
  | "metaDescription"
  | "h1Count"
  | "wordCount"
  | "statusCode"
  | "canonicalUrl"
  | "isIndexable"
  | "inSitemap";

export type PageFieldChangeKind =
  | "changed"
  | "added"
  | "removed"
  | "increased"
  | "decreased"
  | "removed-from-sitemap"
  | "became-noindex"
  | "became-indexable";

export interface PageFieldChange {
  field: PageFieldName;
  kind: PageFieldChangeKind;
  /** Present for numeric/text fields; a display string, never re-derived. */
  from?: string;
  to?: string;
}

export interface PageChange {
  url: string;
  fields: PageFieldChange[];
}

export interface PageChangesTotals {
  changedUrls: number;
  removedFromSitemap: number;
  becameNoindex: number;
  statusChanged: number;
  titleChanged: number;
  metaChanged: number;
}

interface PageChanges {
  totals: PageChangesTotals;
  /** Capped elsewhere; this pure function returns every changed URL. */
  changes: PageChange[];
}

/** A text fact reduced to "" ↔ null equivalence for change classification. */
function textChange(
  field: PageFieldName,
  before: string | null,
  after: string | null,
): PageFieldChange | null {
  const from = (before ?? "").trim();
  const to = (after ?? "").trim();
  if (from === to) return null;
  if (from === "") return { field, kind: "added", to: after ?? "" };
  if (to === "") return { field, kind: "removed", from: before ?? "" };
  return { field, kind: "changed", from: before ?? "", to: after ?? "" };
}

function numberChange(
  field: PageFieldName,
  before: number | null,
  after: number | null,
): PageFieldChange | null {
  const from = before ?? 0;
  const to = after ?? 0;
  if (from === to) return null;
  return {
    field,
    kind: to > from ? "increased" : "decreased",
    from: String(from),
    to: String(to),
  };
}

/** A real fetched HTML document — the only rows whose on-page facts are observed. */
function isDocument(page: PageFacts): boolean {
  return page.isHtml && page.statusCode === 200;
}

/** A fetch that actually returned a status; 0 is the "fetch failed" sentinel. */
function hasRealStatus(page: PageFacts): boolean {
  return (page.statusCode ?? 0) > 0;
}

/**
 * The changes to one page's facts. Order is stable and matters only for
 * presentation, so the most consequential regressions (status, indexability,
 * sitemap) come first.
 *
 * `sitemapEvidence` is whether the current crawl saw ANY page in a sitemap. When
 * it did not (a failed sitemap fetch, or the site dropped its sitemap), every
 * row reads `inSitemap: false`, so "removed from sitemap" would fire for the
 * whole site — the judgement is suppressed instead, matching how the cross-page
 * rules self-suppress when the crawl can't support them.
 */
function diffPage(
  current: PageFacts,
  baseline: PageFacts,
  sitemapEvidence: boolean,
): PageFieldChange[] {
  const changes: PageFieldChange[] = [];

  // Status is compared only between two real fetches. A stored 0 means the fetch
  // failed, not that the page returned status 0, so a transient failure is never
  // reported as "200 → 0"; a genuine 200 → 404 (both real) still is.
  if (
    hasRealStatus(current) &&
    hasRealStatus(baseline) &&
    current.statusCode !== baseline.statusCode
  ) {
    changes.push({
      field: "statusCode",
      kind: "changed",
      from: String(baseline.statusCode),
      to: String(current.statusCode),
    });
  }

  // On-page facts are placeholders on a non-document row (failed/non-HTML fetch),
  // so they are only compared when BOTH sides are real HTML 200 documents — the
  // same gate the materializer applies before running document rules. Without it,
  // a single transient timeout invents "became noindex", "title removed" and
  // "word count 800 → 0".
  if (isDocument(current) && isDocument(baseline)) {
    if (baseline.isIndexable && !current.isIndexable) {
      changes.push({ field: "isIndexable", kind: "became-noindex" });
    } else if (!baseline.isIndexable && current.isIndexable) {
      changes.push({ field: "isIndexable", kind: "became-indexable" });
    }

    const title = textChange("title", baseline.title, current.title);
    if (title) changes.push(title);

    const meta = textChange(
      "metaDescription",
      baseline.metaDescription,
      current.metaDescription,
    );
    if (meta) changes.push(meta);

    const canonical = textChange(
      "canonicalUrl",
      baseline.canonicalUrl,
      current.canonicalUrl,
    );
    if (canonical) changes.push(canonical);

    const h1 = numberChange("h1Count", baseline.h1Count, current.h1Count);
    if (h1) changes.push(h1);

    const words = numberChange(
      "wordCount",
      baseline.wordCount,
      current.wordCount,
    );
    if (words) changes.push(words);
  }

  // Sitemap membership is resolved from discovery, independent of fetch success,
  // so it is not behind the document gate. One way only: a baseline predating the
  // in_sitemap column reads false everywhere, so a false→true "added" would fire
  // spuriously, while a true→false removal cannot be produced by such a baseline.
  if (sitemapEvidence && baseline.inSitemap && !current.inSitemap) {
    changes.push({ field: "inSitemap", kind: "removed-from-sitemap" });
  }

  return changes;
}

/**
 * Index page facts by URL, first row winning. Two as-written URLs that redirect
 * to one target legally produce two rows with the same stored (final) `url` —
 * the crawl dedupes what it *queues*, not what it *lands on* — so collapsing to
 * one keeps `changedUrls` counting URLs and never emits a duplicate row.
 */
function indexByUrl(pages: PageFacts[]): Map<string, PageFacts> {
  const byUrl = new Map<string, PageFacts>();
  for (const page of pages) {
    if (!byUrl.has(page.url)) byUrl.set(page.url, page);
  }
  return byUrl;
}

export function computePageChanges(
  current: PageFacts[],
  baseline: PageFacts[],
): PageChanges {
  const baselineByUrl = indexByUrl(baseline);
  // "Did the current crawl see a sitemap at all?" A crawl whose sitemap fetch
  // failed reads inSitemap:false everywhere; without this, every previously
  // listed URL would false-positive as "removed from sitemap".
  const sitemapEvidence = current.some((page) => page.inSitemap);

  const changes: PageChange[] = [];
  const totals: PageChangesTotals = {
    changedUrls: 0,
    removedFromSitemap: 0,
    becameNoindex: 0,
    statusChanged: 0,
    titleChanged: 0,
    metaChanged: 0,
  };

  for (const [url, page] of indexByUrl(current)) {
    const before = baselineByUrl.get(url);
    // A URL only in the current crawl is not a change: it may simply have been
    // reached this time. Page-added is out of scope.
    if (!before) continue;

    const fields = diffPage(page, before, sitemapEvidence);
    if (fields.length === 0) continue;

    changes.push({ url, fields });
    totals.changedUrls += 1;
    for (const change of fields) {
      if (change.kind === "removed-from-sitemap")
        totals.removedFromSitemap += 1;
      if (change.kind === "became-noindex") totals.becameNoindex += 1;
      if (change.field === "statusCode") totals.statusChanged += 1;
      if (change.field === "title") totals.titleChanged += 1;
      if (change.field === "metaDescription") totals.metaChanged += 1;
    }
  }

  return { totals, changes };
}
