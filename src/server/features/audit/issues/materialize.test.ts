/**
 * Materialization is the seam where the professional audit reuses the shipped
 * P02 rules. These tests pin the two properties that make that reuse honest:
 * a stored page must produce the same verdict as the live crawl signals, and a
 * missing measurement must never be scored as a good one.
 */
import { describe, expect, it } from "vitest";
import { buildOccurrences, buildRollups } from "./materialize";
import { toOnPageSignals, type AuditPageRow } from "./snapshot-signals";
import { getIssueGroup } from "./audit-issue-groups";
import { CORE_WEB_VITALS_RULES } from "@/server/lib/seo-rules/rules/core-web-vitals";
import { LITE_RULES, evaluateLiteSignals } from "@/server/lib/seo-rules";
import { analyzeHtml } from "@/server/lib/audit/page-analyzer";
import type { PageAnalysis } from "@/server/lib/audit/types";
import type { auditLighthouseResults } from "@/db/audit.schema";

type LighthouseRow = typeof auditLighthouseResults.$inferSelect;

function pageRow(overrides: Partial<AuditPageRow> = {}): AuditPageRow {
  return {
    id: "p1",
    auditId: "a1",
    url: "https://example.com/",
    statusCode: 200,
    redirectUrl: null,
    title: "A perfectly reasonable title for a page",
    metaDescription:
      "A meta description that is comfortably inside the range the rule wants to see on a healthy page.",
    canonicalUrl: "https://example.com/",
    robotsMeta: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    h1Count: 1,
    h2Count: 0,
    h3Count: 0,
    h4Count: 0,
    h5Count: 0,
    h6Count: 0,
    headingOrderJson: "[1]",
    wordCount: 800,
    imagesTotal: 0,
    imagesMissingAlt: 0,
    imagesJson: "[]",
    internalLinkCount: 0,
    externalLinkCount: 0,
    hasStructuredData: true,
    hreflangTagsJson: "[]",
    isIndexable: true,
    hasMixedContent: false,
    isHtml: true,
    inSitemap: true,
    responseTimeMs: 100,
    ...overrides,
  };
}

function lighthouseRow(overrides: Partial<LighthouseRow> = {}): LighthouseRow {
  return {
    id: "lh1",
    auditId: "a1",
    pageId: "p1",
    strategy: "mobile",
    performanceScore: 50,
    accessibilityScore: null,
    bestPracticesScore: null,
    seoScore: null,
    lcpMs: 9000,
    cls: 0.01,
    inpMs: 100,
    ttfbMs: 200,
    errorMessage: null,
    r2Key: null,
    payloadSizeBytes: null,
    ...overrides,
  };
}

describe("rule group coverage", () => {
  it("maps every rule the audit evaluates to a display group", () => {
    // Without this, a rule would evaluate and then be silently dropped for
    // having nowhere to appear.
    for (const rule of [...LITE_RULES, ...CORE_WEB_VITALS_RULES]) {
      expect(
        getIssueGroup(rule.id),
        `missing group for ${rule.id}`,
      ).not.toBeNull();
    }
  });
});

/**
 * Mirrors the column mapping in `AuditRepository.batchWriteResults`. The point
 * of the round trip below is that a field the writer drops, or the reader
 * defaults, changes a verdict — so the mapping is written out rather than
 * reusing the adapter on both sides, which would prove nothing.
 */
function storeAndReload(analysis: PageAnalysis): AuditPageRow {
  return pageRow({
    url: analysis.url,
    statusCode: analysis.statusCode,
    redirectUrl: analysis.redirectUrl,
    title: analysis.title,
    metaDescription: analysis.metaDescription,
    canonicalUrl: analysis.canonical,
    robotsMeta: analysis.robotsMeta,
    ogTitle: analysis.ogTitle,
    ogDescription: analysis.ogDescription,
    ogImage: analysis.ogImage,
    h1Count: analysis.h1s.length,
    headingOrderJson: JSON.stringify(analysis.headingOrder),
    wordCount: analysis.wordCount,
    imagesJson: JSON.stringify(analysis.images),
    hasStructuredData: analysis.hasStructuredData,
    hreflangTagsJson: JSON.stringify(analysis.hreflangTags),
    hasMixedContent: analysis.hasMixedContent,
    responseTimeMs: analysis.responseTimeMs,
    isHtml: true,
  });
}

describe("stored page reproduces the live verdict", () => {
  it("returns the same verdicts after a crawl -> store -> reload round trip", () => {
    const html = `<!doctype html><html><head>
        <title>Short</title>
        <meta name="description" content="tiny">
        <link rel="canonical" href="https://example.com/p">
        <script type="application/ld+json">{"@type":"Article"}</script>
      </head><body>
        <h1>One</h1><h1>Two</h1>
        <h3>Skipped a level</h3>
        <img src="a.png"><img src="b.png" alt="described">
        <img src="http://insecure.example.com/c.png" alt="">
        <p>Only a handful of words on this page.</p>
      </body></html>`;
    const analysis = analyzeHtml(html, "https://example.com/p", 200, 10, null);

    const live = evaluateLiteSignals(analysis).map(
      (issue) => `${issue.id}:${issue.status}`,
    );
    const reloaded = evaluateLiteSignals(
      toOnPageSignals(storeAndReload(analysis)),
    ).map((issue) => `${issue.id}:${issue.status}`);

    expect(reloaded).toEqual(live);
    // Guard against the round trip being vacuously clean.
    expect(live.some((verdict) => verdict.endsWith(":fail"))).toBe(true);
  });

  it("stores no occurrence for a clean page", () => {
    expect(buildOccurrences({ pages: [pageRow()], lighthouse: [] })).toEqual(
      [],
    );
  });

  it("flags mixed content now that the crawl records it", () => {
    const occurrences = buildOccurrences({
      pages: [pageRow({ hasMixedContent: true })],
      lighthouse: [],
    });

    expect(occurrences.map((o) => o.ruleId)).toContain("server-mixed-content");
  });

  it("records the rule revision and evidence with each occurrence", () => {
    const [occurrence] = buildOccurrences({
      pages: [pageRow({ title: "" })],
      lighthouse: [],
    });

    expect(occurrence?.ruleId).toBe("meta-title");
    expect(occurrence?.ruleVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(occurrence?.evidence).toEqual({ title: "", length: 0 });
    expect(occurrence?.url).toBe("https://example.com/");
  });
});

describe("core web vitals occurrences", () => {
  it("evaluates the mobile run and records the metric as evidence", () => {
    const occurrences = buildOccurrences({
      pages: [pageRow()],
      lighthouse: [lighthouseRow()],
    });

    const lcp = occurrences.find((o) => o.ruleId === "cwv-lcp");
    expect(lcp?.url).toBe("https://example.com/");
    expect(lcp?.evidence).toEqual({ lcpMs: 9000, strategy: "mobile" });
  });

  it("ignores the desktop run so one URL yields one verdict per rule", () => {
    const occurrences = buildOccurrences({
      pages: [pageRow()],
      lighthouse: [lighthouseRow({ id: "lh2", strategy: "desktop" })],
    });

    expect(occurrences.filter((o) => o.ruleId === "cwv-lcp")).toHaveLength(0);
  });

  it("does not score an incomplete run — a missing metric is not a good one", () => {
    const occurrences = buildOccurrences({
      pages: [pageRow()],
      lighthouse: [lighthouseRow({ lcpMs: null })],
    });

    expect(occurrences.filter((o) => o.ruleId.startsWith("cwv-"))).toEqual([]);
  });

  it("skips a measurement whose page is no longer in the snapshot", () => {
    const occurrences = buildOccurrences({
      pages: [pageRow()],
      lighthouse: [lighthouseRow({ pageId: "ghost" })],
    });

    expect(occurrences.filter((o) => o.ruleId.startsWith("cwv-"))).toEqual([]);
  });
});

describe("rows that are not judgeable documents", () => {
  it("does not judge a non-HTML resource as a contentless page", () => {
    // A PDF listed in a sitemap is stored with empty placeholder fields; the
    // content rules would otherwise report it as missing title, H1 and body.
    const occurrences = buildOccurrences({
      pages: [
        pageRow({
          isHtml: false,
          title: null,
          metaDescription: null,
          canonicalUrl: null,
          h1Count: 0,
          wordCount: 0,
          hasStructuredData: false,
        }),
      ],
      lighthouse: [],
    });

    expect(occurrences.map((o) => o.ruleId)).not.toContain("meta-title");
    expect(occurrences.map((o) => o.ruleId)).not.toContain("structure-h1");
  });

  it("does not judge an error page's content", () => {
    const occurrences = buildOccurrences({
      pages: [pageRow({ statusCode: 404, title: null, h1Count: 0 })],
      lighthouse: [],
    });

    const ruleIds = occurrences.map((o) => o.ruleId);
    expect(ruleIds).toContain("server-status");
    expect(ruleIds).not.toContain("meta-title");
  });

  it("reports nothing for a URL the crawler never reached", () => {
    // Status 0 means no response at all. The frozen catalog grades it milder
    // than a 404, so it is deferred to the cross-page rules rather than
    // mis-reported here.
    expect(
      buildOccurrences({
        pages: [pageRow({ statusCode: 0, title: null, h1Count: 0 })],
        lighthouse: [],
      }),
    ).toEqual([]);
  });
});

describe("duplicate final URLs", () => {
  it("collapses two crawl entries that redirected to the same URL", () => {
    // http -> https and www -> apex both converge after redirects, so one final
    // URL can be stored twice. Two rows for one (rule, url) would break the
    // one-occurrence-per-URL guarantee the storage layer enforces.
    const occurrences = buildOccurrences({
      pages: [
        pageRow({ id: "p1", url: "https://example.com/dup", title: "" }),
        pageRow({ id: "p2", url: "https://example.com/dup", title: "" }),
      ],
      lighthouse: [],
    });

    const keys = occurrences.map((o) => `${o.ruleId}\n${o.url}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps the worse verdict when duplicates disagree", () => {
    // meta-description: absent fails, too-short warns.
    const occurrences = buildOccurrences({
      pages: [
        pageRow({
          id: "p1",
          url: "https://example.com/dup",
          metaDescription: "too short",
        }),
        pageRow({
          id: "p2",
          url: "https://example.com/dup",
          metaDescription: null,
        }),
      ],
      lighthouse: [],
    });

    const description = occurrences.find(
      (o) => o.ruleId === "meta-description",
    );
    expect(description?.status).toBe("fail");
  });
});

describe("buildRollups", () => {
  it("counts distinct affected URLs per rule", () => {
    const occurrences = buildOccurrences({
      pages: [
        pageRow({ id: "p1", url: "https://example.com/a", title: "" }),
        pageRow({ id: "p2", url: "https://example.com/b", title: "" }),
      ],
      lighthouse: [],
    });

    const rollup = buildRollups(occurrences).find(
      (entry) => entry.ruleId === "meta-title",
    );

    expect(rollup?.urlCount).toBe(2);
    expect(rollup?.issueGroup).toBe("content");
  });
});
