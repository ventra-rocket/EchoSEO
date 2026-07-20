import { describe, expect, it } from "vitest";
import { buildLinkEdges } from "./link-graph";
import type { StepPageResult } from "./types";

function page(url: string, internalLinks: string[]): StepPageResult {
  return {
    id: url,
    url,
    statusCode: 200,
    redirectUrl: null,
    title: "",
    metaDescription: "",
    canonicalUrl: null,
    robotsMeta: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    h1Count: 0,
    h2Count: 0,
    h3Count: 0,
    h4Count: 0,
    h5Count: 0,
    h6Count: 0,
    headingOrder: [],
    wordCount: 0,
    imagesTotal: 0,
    imagesMissingAlt: 0,
    images: [],
    internalLinks,
    externalLinks: [],
    hasStructuredData: false,
    hreflangTags: [],
    hasMixedContent: false,
    isIndexable: true,
    isHtml: true,
    responseTimeMs: 0,
  };
}

describe("buildLinkEdges", () => {
  it("emits one edge per source -> target pair", () => {
    const edges = buildLinkEdges([
      page("https://a.com/", ["https://a.com/x", "https://a.com/y"]),
    ]);

    expect(edges).toEqual([
      { sourceUrl: "https://a.com/", targetUrl: "https://a.com/x" },
      { sourceUrl: "https://a.com/", targetUrl: "https://a.com/y" },
    ]);
  });

  it("dedupes repeated links from the same page", () => {
    const edges = buildLinkEdges([
      page("https://a.com/", [
        "https://a.com/x",
        "https://a.com/x",
        "https://a.com/x",
      ]),
    ]);

    expect(edges).toEqual([
      { sourceUrl: "https://a.com/", targetUrl: "https://a.com/x" },
    ]);
  });

  it("drops self-links", () => {
    const edges = buildLinkEdges([
      page("https://a.com/x", ["https://a.com/x", "https://a.com/y"]),
    ]);

    expect(edges).toEqual([
      { sourceUrl: "https://a.com/x", targetUrl: "https://a.com/y" },
    ]);
  });

  it("keeps the same target reached from different sources", () => {
    const edges = buildLinkEdges([
      page("https://a.com/one", ["https://a.com/shared"]),
      page("https://a.com/two", ["https://a.com/shared"]),
    ]);

    expect(edges).toHaveLength(2);
    expect(edges.map((edge) => edge.sourceUrl)).toEqual([
      "https://a.com/one",
      "https://a.com/two",
    ]);
  });

  it("returns nothing for pages without internal links", () => {
    expect(buildLinkEdges([page("https://a.com/", [])])).toEqual([]);
  });
});
