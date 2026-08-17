import { describe, expect, it } from "vitest";
import {
  computePageChanges,
  type PageFacts,
} from "@/server/features/audit/history/page-changes";

function page(url: string, overrides: Partial<PageFacts> = {}): PageFacts {
  return {
    url,
    title: "Title",
    metaDescription: "Meta",
    h1Count: 1,
    wordCount: 500,
    statusCode: 200,
    canonicalUrl: url,
    isIndexable: true,
    inSitemap: true,
    isHtml: true,
    ...overrides,
  };
}

/** How a failed / non-HTML fetch is stored: placeholder fields, not observations. */
function placeholder(url: string): PageFacts {
  return page(url, {
    title: "",
    metaDescription: "",
    h1Count: 0,
    wordCount: 0,
    statusCode: 0,
    canonicalUrl: "",
    isIndexable: false,
    inSitemap: false,
    isHtml: false,
  });
}

describe("computePageChanges", () => {
  it("reports text facts as changed, added or removed", () => {
    const result = computePageChanges(
      [
        page("https://x/a", { title: "New" }), // changed
        page("https://x/b", { metaDescription: "" }), // removed
        page("https://x/c", { title: "Now set" }),
      ],
      [
        page("https://x/a", { title: "Old" }),
        page("https://x/b", { metaDescription: "Was here" }),
        page("https://x/c", { title: "" }), // added
      ],
    );

    const byUrl = Object.fromEntries(result.changes.map((c) => [c.url, c]));
    expect(byUrl["https://x/a"]?.fields).toContainEqual({
      field: "title",
      kind: "changed",
      from: "Old",
      to: "New",
    });
    expect(byUrl["https://x/b"]?.fields).toContainEqual({
      field: "metaDescription",
      kind: "removed",
      from: "Was here",
    });
    expect(byUrl["https://x/c"]?.fields).toContainEqual({
      field: "title",
      kind: "added",
      to: "Now set",
    });
  });

  it("reports count fields as from → to on a document page", () => {
    // Both sides stay real HTML 200 documents so the counts are observed facts.
    const result = computePageChanges(
      [page("https://x/a", { h1Count: 2, wordCount: 320 })],
      [page("https://x/a", { h1Count: 1, wordCount: 500 })],
    );
    const fields = result.changes[0]?.fields ?? [];
    expect(fields).toContainEqual({
      field: "h1Count",
      kind: "increased",
      from: "1",
      to: "2",
    });
    expect(fields).toContainEqual({
      field: "wordCount",
      kind: "decreased",
      from: "500",
      to: "320",
    });
  });

  it("reports removed-from-sitemap ONLY on a true→false transition", () => {
    // A second URL stays in the sitemap so the current crawl HAS sitemap
    // evidence (otherwise the whole judgement is suppressed — tested separately).
    const removed = computePageChanges(
      [
        page("https://x/a", { inSitemap: false }),
        page("https://x/keep", { inSitemap: true }),
      ],
      [
        page("https://x/a", { inSitemap: true }),
        page("https://x/keep", { inSitemap: true }),
      ],
    );
    const changedA = removed.changes.find((c) => c.url === "https://x/a");
    expect(changedA?.fields).toContainEqual({
      field: "inSitemap",
      kind: "removed-from-sitemap",
    });
    expect(removed.totals.removedFromSitemap).toBe(1);

    // false→true must NOT be reported: a baseline predating the in_sitemap
    // column reads false for every row, so "added to sitemap" would fire
    // spuriously. If the direction guard were dropped this would report a change.
    const added = computePageChanges(
      [page("https://x/a", { inSitemap: true })],
      [page("https://x/a", { inSitemap: false })],
    );
    expect(added.changes).toHaveLength(0);
    expect(added.totals.removedFromSitemap).toBe(0);
  });

  it("reports indexability both ways", () => {
    const noindex = computePageChanges(
      [page("https://x/a", { isIndexable: false })],
      [page("https://x/a", { isIndexable: true })],
    );
    expect(noindex.changes[0]?.fields).toContainEqual({
      field: "isIndexable",
      kind: "became-noindex",
    });
    expect(noindex.totals.becameNoindex).toBe(1);

    const indexable = computePageChanges(
      [page("https://x/a", { isIndexable: true })],
      [page("https://x/a", { isIndexable: false })],
    );
    expect(indexable.changes[0]?.fields).toContainEqual({
      field: "isIndexable",
      kind: "became-indexable",
    });
    expect(indexable.totals.becameNoindex).toBe(0);
  });

  it("ignores a URL present on only one side (no page added/removed)", () => {
    const result = computePageChanges(
      [page("https://x/a"), page("https://x/new")],
      [page("https://x/a"), page("https://x/gone")],
    );
    // https://x/a is unchanged, /new and /gone are single-sided → no changes.
    expect(result.changes).toHaveLength(0);
    expect(result.totals.changedUrls).toBe(0);
  });

  it("emits no entry for an unchanged page", () => {
    const result = computePageChanges(
      [page("https://x/a")],
      [page("https://x/a")],
    );
    expect(result.changes).toHaveLength(0);
  });

  it("treats null/empty title equivalently so a null↔'' is not a phantom change", () => {
    const result = computePageChanges(
      [page("https://x/a", { title: null })],
      [page("https://x/a", { title: "" })],
    );
    expect(result.changes).toHaveLength(0);
  });

  it("does NOT diff on-page facts when a side is a placeholder (failed/non-HTML fetch)", () => {
    // A transient timeout on the current crawl stores placeholder fields. Diffing
    // them against a real baseline would fabricate "became noindex", "title
    // removed" and "word count 500 → 0". The document gate must suppress all of
    // that. If the gate were removed, this crawl would report a pile of changes.
    const result = computePageChanges(
      [placeholder("https://x/a")],
      [page("https://x/a")],
    );
    expect(result.changes).toHaveLength(0);
  });

  it("still reports a genuine status change between two real fetches", () => {
    const result = computePageChanges(
      [page("https://x/a", { statusCode: 404, isHtml: false })],
      [page("https://x/a", { statusCode: 200 })],
    );
    // 200 → 404 is a real transition (both statuses were fetched); the 404's
    // placeholder body is NOT compared, so only the status change appears.
    expect(result.changes[0]?.fields).toEqual([
      { field: "statusCode", kind: "changed", from: "200", to: "404" },
    ]);
  });

  it("does not report a rate-limited crawl as a site-wide status regression", () => {
    // The reported bug: a crawl that outran a site's rate limit stored 429 for
    // 1,894 pages. Compared against a clean baseline that reads as 1,894 status
    // regressions, none of which happened to the site.
    const result = computePageChanges(
      [
        page("https://x/a", { statusCode: 429, isHtml: false }),
        page("https://x/b", { statusCode: 429, isHtml: false }),
      ],
      [page("https://x/a"), page("https://x/b")],
    );

    expect(result.totals.statusChanged).toBe(0);
    expect(result.changes).toHaveLength(0);
  });

  it("does not report recovery from a throttled baseline as a change either", () => {
    // The mirror case: last crawl was throttled, this one succeeded. Reporting
    // "429 → 200" would credit the site with a fix it never made.
    const result = computePageChanges(
      [page("https://x/a")],
      [page("https://x/a", { statusCode: 429, isHtml: false })],
    );

    expect(result.totals.statusChanged).toBe(0);
  });

  it("suppresses removed-from-sitemap when the current crawl has no sitemap evidence", () => {
    // Current crawl's sitemap fetch failed → every row reads inSitemap:false.
    // Without suppression, every previously-listed URL false-positives as removed.
    const result = computePageChanges(
      [
        page("https://x/a", { inSitemap: false }),
        page("https://x/b", { inSitemap: false }),
      ],
      [
        page("https://x/a", { inSitemap: true }),
        page("https://x/b", { inSitemap: true }),
      ],
    );
    expect(result.totals.removedFromSitemap).toBe(0);
    expect(result.changes).toHaveLength(0);
  });

  it("collapses duplicate final-URL rows so a URL is counted once", () => {
    // Two as-written URLs redirecting to one target store two rows with the same
    // final url. The diff must treat them as one URL, not double-count.
    const result = computePageChanges(
      [
        page("https://x/a", { title: "New" }),
        page("https://x/a", { title: "New" }),
        page("https://x/keeps-evidence", { inSitemap: true }),
      ],
      [page("https://x/a", { title: "Old" })],
    );
    expect(result.totals.changedUrls).toBe(1);
    expect(result.changes).toHaveLength(1);
  });
});
