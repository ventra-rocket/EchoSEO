import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import { SerpAnalysisCard } from "./SerpAnalysisCard";
import { en } from "@/client/i18n/messages/en";

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

// SerpAnalysisCard resolves its copy through react-intl (SERP empty state,
// pagination, retry), so it needs an IntlProvider around it the same way the
// real app does — see SitePicker.test.ts for the same pattern.
function renderCard(
  props: Partial<typeof baseProps> & { seoKeyMissing: boolean },
) {
  return renderToStaticMarkup(
    createElement(
      IntlProvider,
      { locale: "en", messages: en },
      createElement(SerpAnalysisCard, { ...baseProps, ...props }),
    ),
  );
}

describe("SerpAnalysisCard", () => {
  it("reports the missing key rather than a keyword without SERP details", () => {
    const markup = renderCard({ seoKeyMissing: true });

    expect(markup).toContain("No DataForSEO API key connected");
    expect(markup).toContain('href="/help/dataforseo-api-key"');
    expect(markup).not.toContain("No SERP details available");
  });

  it("still reports an empty SERP response for a query that ran", () => {
    const markup = renderCard({ seoKeyMissing: false });

    expect(markup).toContain("No SERP details available for this keyword yet.");
    expect(markup).not.toContain("No DataForSEO API key connected");
  });
});
