/**
 * Materialization is the seam where the professional audit reuses the shipped
 * P02 rules. These tests pin the two properties that make that reuse honest:
 * a stored page must produce the same verdict as the live crawl signals, and a
 * missing measurement must never be scored as a good one.
 */
import { describe, expect, it } from "vitest";
import { buildRollups } from "./materialize";
import { toOnPageSignals, type AuditPageRow } from "./snapshot-signals";
import { getIssueGroup } from "./audit-issue-groups";
import {
  lighthouseRow,
  occurrencesFor,
  pageRow,
} from "./__tests__/issue-fixtures";
import { CORE_WEB_VITALS_RULES } from "@/server/lib/seo-rules/rules/core-web-vitals";
import { CROSS_PAGE_RULES } from "@/server/lib/audit/rules/cross-page";
import { LITE_RULES, evaluateLiteSignals } from "@/server/lib/seo-rules";
import { analyzeHtml } from "@/server/lib/audit/page-analyzer";
import type { PageAnalysis } from "@/server/lib/audit/types";

describe("rule group coverage", () => {
  it("maps every rule the audit evaluates to a display group", () => {
    // Without this, a rule would evaluate and then be silently dropped for
    // having nowhere to appear.
    for (const rule of [
      ...LITE_RULES,
      ...CORE_WEB_VITALS_RULES,
      ...CROSS_PAGE_RULES,
    ]) {
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
    expect(occurrencesFor({ pages: [pageRow()], lighthouse: [] })).toEqual([]);
  });

  it("flags mixed content now that the crawl records it", () => {
    const occurrences = occurrencesFor({
      pages: [pageRow({ hasMixedContent: true })],
      lighthouse: [],
    });

    expect(occurrences.map((o) => o.ruleId)).toContain("server-mixed-content");
  });

  it("records the rule revision and evidence with each occurrence", () => {
    const [occurrence] = occurrencesFor({
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
    const occurrences = occurrencesFor({
      pages: [pageRow()],
      lighthouse: [lighthouseRow()],
    });

    const lcp = occurrences.find((o) => o.ruleId === "cwv-lcp");
    expect(lcp?.url).toBe("https://example.com/");
    expect(lcp?.evidence).toEqual({ lcpMs: 9000, strategy: "mobile" });
  });

  it("ignores the desktop run so one URL yields one verdict per rule", () => {
    const occurrences = occurrencesFor({
      pages: [pageRow()],
      lighthouse: [lighthouseRow({ id: "lh2", strategy: "desktop" })],
    });

    expect(occurrences.filter((o) => o.ruleId === "cwv-lcp")).toHaveLength(0);
  });

  it("does not score an incomplete run — a missing metric is not a good one", () => {
    const occurrences = occurrencesFor({
      pages: [pageRow()],
      lighthouse: [lighthouseRow({ lcpMs: null })],
    });

    expect(occurrences.filter((o) => o.ruleId.startsWith("cwv-"))).toEqual([]);
  });

  it("skips a measurement whose page is no longer in the snapshot", () => {
    const occurrences = occurrencesFor({
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
    const occurrences = occurrencesFor({
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
    const occurrences = occurrencesFor({
      pages: [pageRow({ statusCode: 404, title: null, h1Count: 0 })],
      lighthouse: [],
    });

    const ruleIds = occurrences.map((o) => o.ruleId);
    expect(ruleIds).toContain("server-status");
    expect(ruleIds).not.toContain("meta-title");
  });

  it("reports a URL the crawler never reached as unreachable, and nothing else", () => {
    // Status 0 means no response at all. The frozen catalog would grade it
    // milder than a 404, so the cross-page rule owns it instead.
    const occurrences = occurrencesFor({
      pages: [pageRow({ statusCode: 0, title: null, h1Count: 0 })],
    });

    expect(occurrences.map((o) => o.ruleId)).toEqual(["audit-unreachable-url"]);
  });

  it("judges nothing on a page the site refused to serve us", () => {
    // The reported bug: `server-status` is not a document rule, so every one of
    // 1,894 rate-limited requests produced a critical "does not respond with a
    // healthy status code" issue against a page that was never read. A 429 is
    // about our request rate; there is no observation here to grade.
    const occurrences = occurrencesFor({
      pages: [pageRow({ statusCode: 429, title: null, h1Count: 0 })],
    });

    expect(occurrences).toEqual([]);
  });
});

describe("duplicate final URLs", () => {
  it("collapses two crawl entries that redirected to the same URL", () => {
    // http -> https and www -> apex both converge after redirects, so one final
    // URL can be stored twice. Two rows for one (rule, url) would break the
    // one-occurrence-per-URL guarantee the storage layer enforces.
    const occurrences = occurrencesFor({
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
    const occurrences = occurrencesFor({
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
    const occurrences = occurrencesFor({
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
