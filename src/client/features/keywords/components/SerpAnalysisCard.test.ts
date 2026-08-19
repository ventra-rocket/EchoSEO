import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SerpAnalysisCard } from "./SerpAnalysisCard";

// The states under test link to the help page; the router itself is not.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement("a", { href: to }, children),
  linkOptions: (options: unknown) => options,
}));

const baseProps = {
  items: [],
  keyword: "seo tools",
  loading: false,
  error: null,
  onRetry: vi.fn(),
  page: 0,
  pageSize: 10,
  onPageChange: vi.fn(),
};

describe("SerpAnalysisCard", () => {
  it("reports the missing key rather than a keyword without SERP details", () => {
    const markup = renderToStaticMarkup(
      createElement(SerpAnalysisCard, { ...baseProps, seoKeyMissing: true }),
    );

    expect(markup).toContain("No DataForSEO API key connected");
    expect(markup).toContain('href="/help/dataforseo-api-key"');
    expect(markup).not.toContain("No SERP details available");
  });

  it("still reports an empty SERP response for a query that ran", () => {
    const markup = renderToStaticMarkup(
      createElement(SerpAnalysisCard, { ...baseProps, seoKeyMissing: false }),
    );

    expect(markup).toContain("No SERP details available for this keyword yet.");
    expect(markup).not.toContain("No DataForSEO API key connected");
  });
});
