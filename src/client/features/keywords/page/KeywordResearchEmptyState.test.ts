import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { KeywordResearchEmptyState } from "./KeywordResearchEmptyState";

type EmptyStateController = ComponentProps<
  typeof KeywordResearchEmptyState
>["controller"];

// The states under test link to the help page; the router itself is not.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement("a", { href: to }, children),
  linkOptions: (options: unknown) => options,
}));

function render(controller: EmptyStateController) {
  return renderToStaticMarkup(
    createElement(KeywordResearchEmptyState, {
      controller,
      projectId: "project-1",
    }),
  );
}

describe("KeywordResearchEmptyState", () => {
  it("blames the missing key, not the keyword, when no key is connected", () => {
    const markup = render({
      seoKeyMissing: true,
      hasSearched: false,
      isLoading: false,
      lastSearchError: false,
      lastSearchKeyword: "seo tools",
      lastSearchLocationCode: 2840,
      history: [],
      historyLoaded: true,
      removeHistoryItem: () => {},
    });

    expect(markup).toContain("No DataForSEO API key connected");
    expect(markup).toContain('href="/help/dataforseo-api-key"');
    expect(markup).not.toContain("Not enough keyword data");
  });

  it("still reports a genuine empty result for a query that ran", () => {
    const markup = render({
      seoKeyMissing: false,
      hasSearched: true,
      isLoading: false,
      lastSearchError: false,
      lastSearchKeyword: "seo tools",
      lastSearchLocationCode: 2840,
      history: [],
      historyLoaded: true,
      removeHistoryItem: () => {},
    });

    expect(markup).toContain("Not enough keyword data for this query yet");
    expect(markup).toContain("seo tools");
    expect(markup).not.toContain("No DataForSEO API key connected");
  });
});
