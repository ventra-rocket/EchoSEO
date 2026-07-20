/**
 * Cross-page rules judge the whole crawl, so the risk they carry is accusing a
 * healthy page. These tests pin the guards against that: URL spellings are
 * resolved through one equivalence key, an unresolved link target is unknown
 * rather than broken, and the crawl entry point is never an orphan.
 */
import { describe, expect, it } from "vitest";
import { edge, occurrencesFor, pageRow } from "./__tests__/issue-fixtures";
import { CROSS_PAGE_RULES } from "@/server/lib/audit/rules/cross-page";
import { CORE_WEB_VITALS_RULES } from "@/server/lib/seo-rules/rules/core-web-vitals";
import { LITE_RULES } from "@/server/lib/seo-rules";

describe("cross-page rules", () => {
  const HOME = "https://example.com/";
  const CHILD = "https://example.com/child";

  it("reports a page nothing links to, but not the crawl entry point", () => {
    const occurrences = occurrencesFor({
      pages: [
        pageRow({ id: "p1", url: HOME }),
        pageRow({ id: "p2", url: CHILD }),
      ],
      startUrl: HOME,
    });

    const orphans = occurrences
      .filter((o) => o.ruleId === "audit-orphan-page")
      .map((o) => o.url);
    expect(orphans).toEqual([CHILD]);
  });

  it("does not call a page orphaned when the link spells the URL differently", () => {
    // The link points at the www/http spelling; the crawler landed on the
    // canonical one. A raw string join would report a false orphan here.
    const occurrences = occurrencesFor({
      pages: [
        pageRow({ id: "p1", url: HOME }),
        pageRow({ id: "p2", url: CHILD }),
      ],
      edges: [edge(HOME, "http://www.example.com/child")],
      startUrl: HOME,
    });

    expect(occurrences.filter((o) => o.ruleId === "audit-orphan-page")).toEqual(
      [],
    );
  });

  it("does not judge a non-indexable or non-HTML page as an orphan", () => {
    const occurrences = occurrencesFor({
      pages: [
        pageRow({ id: "p1", url: CHILD, isIndexable: false }),
        pageRow({
          id: "p2",
          url: "https://example.com/doc.pdf",
          isHtml: false,
        }),
      ],
      startUrl: HOME,
    });

    expect(occurrences.filter((o) => o.ruleId === "audit-orphan-page")).toEqual(
      [],
    );
  });

  it("reports a link to a crawled error page", () => {
    const occurrences = occurrencesFor({
      pages: [
        pageRow({ id: "p1", url: HOME }),
        pageRow({ id: "p2", url: CHILD, statusCode: 404 }),
      ],
      edges: [edge(HOME, CHILD)],
      startUrl: HOME,
    });

    const broken = occurrences.find(
      (o) => o.ruleId === "audit-broken-internal-link",
    );
    expect(broken?.url).toBe(HOME);
    expect(broken?.evidence).toEqual({
      brokenLinkCount: 1,
      brokenLinkTargets: [CHILD],
    });
  });

  it("does not call a link broken when its target was never crawled", () => {
    // An unresolved target means the crawler reached it under another URL or
    // not at all — unknown, not a defect.
    const occurrences = occurrencesFor({
      pages: [pageRow({ id: "p1", url: HOME })],
      edges: [edge(HOME, "https://example.com/never-crawled")],
      startUrl: HOME,
    });

    expect(
      occurrences.filter((o) => o.ruleId === "audit-broken-internal-link"),
    ).toEqual([]);
  });

  it("does not call an access-restricted or rate-limited target broken", () => {
    // 401/403 mean "you may not see this" and 429 means "not right now";
    // neither is a dead link the site owner should go rip out.
    for (const statusCode of [401, 403, 429]) {
      const occurrences = occurrencesFor({
        pages: [
          pageRow({ id: "p1", url: HOME }),
          pageRow({ id: "p2", url: CHILD, statusCode }),
        ],
        edges: [edge(HOME, CHILD)],
        startUrl: HOME,
      });

      expect(
        occurrences.filter((o) => o.ruleId === "audit-broken-internal-link"),
        `status ${statusCode}`,
      ).toEqual([]);
    }
  });

  it("reports an indexable page missing from a sitemap that exists", () => {
    const occurrences = occurrencesFor({
      pages: [
        pageRow({ id: "p1", url: HOME, inSitemap: true }),
        pageRow({ id: "p2", url: CHILD, inSitemap: false }),
      ],
      edges: [edge(HOME, CHILD)],
      startUrl: HOME,
    });

    const missing = occurrences.find(
      (o) => o.ruleId === "audit-missing-from-sitemap",
    );
    expect(missing?.url).toBe(CHILD);
    expect(missing?.status).toBe("warn");
    expect(missing?.issueGroup).toBe("sitemaps");
  });

  it("stays silent about sitemap coverage when the site has no sitemap", () => {
    // Google's own guidance is that a small, well-linked site may not need one.
    const occurrences = occurrencesFor({
      pages: [
        pageRow({ id: "p1", url: HOME, inSitemap: false }),
        pageRow({ id: "p2", url: CHILD, inSitemap: false }),
      ],
      edges: [edge(HOME, CHILD)],
      startUrl: HOME,
    });

    expect(
      occurrences.filter((o) => o.ruleId === "audit-missing-from-sitemap"),
    ).toEqual([]);
  });
});

describe("orphan detection is switched off when it cannot be trusted", () => {
  const HOME = "https://example.com/";

  it("reports no orphans when the crawl stopped at its page cap", () => {
    // A truncated crawl never fetched the pages that would have linked here,
    // so every sitemap-discovered page would otherwise look orphaned.
    const occurrences = occurrencesFor({
      pages: [
        pageRow({ id: "p1", url: HOME }),
        pageRow({ id: "p2", url: "https://example.com/a" }),
        pageRow({ id: "p3", url: "https://example.com/b" }),
      ],
      startUrl: HOME,
      crawlWasTruncated: true,
    });

    expect(occurrences.filter((o) => o.ruleId === "audit-orphan-page")).toEqual(
      [],
    );
  });

  it("reports no orphans when the start URL never matched a crawled page", () => {
    // A start URL that path-redirects (/ -> /en/) leaves the graph without a
    // known root, and the real home page would be the one accused.
    const occurrences = occurrencesFor({
      pages: [pageRow({ id: "p1", url: "https://example.com/en" })],
      startUrl: HOME,
    });

    expect(occurrences.filter((o) => o.ruleId === "audit-orphan-page")).toEqual(
      [],
    );
  });
});

describe("cross-page rule citations", () => {
  it("cites a real Google source with a verbatim quote and a review date", () => {
    for (const rule of CROSS_PAGE_RULES) {
      expect(rule.googleSourceUrl, rule.id).toMatch(
        /^https:\/\/(developers|web)\.(google|dev)\.com\//,
      );
      expect(rule.guideQuote.length, rule.id).toBeGreaterThan(20);
      expect(rule.lastReviewedDate, rule.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(rule.fixSteps.length, rule.id).toBeGreaterThan(0);
    }
  });

  it("uses ids that cannot collide with the frozen catalog", () => {
    const catalogIds = new Set(
      [...LITE_RULES, ...CORE_WEB_VITALS_RULES].map((rule) => rule.id),
    );
    for (const rule of CROSS_PAGE_RULES) {
      expect(rule.id.startsWith("audit-"), rule.id).toBe(true);
      expect(catalogIds.has(rule.id), rule.id).toBe(false);
    }
  });
});
