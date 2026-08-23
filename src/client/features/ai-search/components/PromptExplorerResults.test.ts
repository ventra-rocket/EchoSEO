import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";
import { PromptExplorerResults } from "./PromptExplorerResults";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { PromptExplorerResult } from "@/types/schemas/ai-search";

const CATALOGS = { en, vi: viMessages } as const;

function renderWithIntl(
  locale: keyof typeof CATALOGS,
  node: ReactNode,
): { markup: string; errors: string[] } {
  const errors: string[] = [];
  const intl = createIntl({
    locale,
    messages: CATALOGS[locale],
    onError: (error) => errors.push(error.message),
  });
  const markup = renderToStaticMarkup(
    createElement(RawIntlProvider, { value: intl }, node),
  );
  return { markup, errors };
}

// One model that mentions the brand (with citations + tokens + web search),
// one that doesn't mention it, and one that failed — exercises every badge
// branch and the token-count formatting bug fix in a single fixture.
const result: PromptExplorerResult = {
  prompt: "best seo tools",
  highlightBrand: "Acme",
  fetchedAt: "2024-03-15T00:00:00.000Z",
  results: [
    {
      status: "success",
      model: "chat_gpt",
      modelName: "gpt-5",
      text: "Acme is a great SEO tool.",
      citations: [
        {
          url: "https://example.com/a",
          domain: "example.com",
          title: "Example A",
          matchedBrand: true,
        },
      ],
      fanOutQueries: ["what is seo"],
      brandMentioned: true,
      outputTokens: 1234,
      webSearch: true,
    },
    {
      status: "success",
      model: "gemini",
      modelName: "gemini-2.5",
      text: "No mention of any specific brand.",
      citations: [],
      fanOutQueries: [],
      brandMentioned: false,
      outputTokens: null,
      webSearch: false,
    },
    {
      status: "error",
      model: "claude",
      errorCode: "UPSTREAM_ERROR",
      message: "Claude API timed out",
    },
  ],
};

describe("PromptExplorerResults", () => {
  it("renders sources, tokens, badges and the error state in English without a missing id", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(PromptExplorerResults, { result }),
    );

    expect(markup).toContain("Cited sources (1)");
    expect(markup).toContain("Related queries the model considered");
    // Grouped via intl.formatNumber, not the OS-locale toLocaleString() bug.
    expect(markup).toContain("1,234");
    expect(markup).toContain("tokens");
    expect(markup).toContain("web search");
    expect(markup).toContain("no Acme");
    expect(markup).toContain("Error");
    expect(markup).toContain("Claude API timed out");
    expect(errors).toEqual([]);
  });

  it("renders the same results in Vietnamese without a missing id", () => {
    const { markup, errors } = renderWithIntl(
      "vi",
      createElement(PromptExplorerResults, { result }),
    );

    expect(markup).toContain("Nguồn trích dẫn (1)");
    expect(markup).toContain("Truy vấn liên quan mà mô hình đã xem xét");
    // Vietnamese groups with "." rather than ",".
    expect(markup).toContain("1.234");
    expect(markup).toContain("token");
    expect(markup).toContain("tìm kiếm web");
    expect(markup).toContain("không có Acme");
    expect(markup).toContain("Lỗi");
    expect(markup).not.toContain("Cited sources");
    expect(markup).not.toContain(">Error<");
    expect(errors).toEqual([]);
  });

  it("collapses long citation lists behind a bilingual show-more toggle", () => {
    const many: PromptExplorerResult = {
      ...result,
      results: [
        {
          status: "success",
          model: "chat_gpt",
          modelName: "gpt-5",
          text: "answer",
          citations: Array.from({ length: 7 }, (_, index) => ({
            url: `https://example.com/${index}`,
            domain: "example.com",
            title: `Source ${index}`,
            matchedBrand: false,
          })),
          fanOutQueries: [],
          brandMentioned: false,
          outputTokens: null,
          webSearch: false,
        },
      ],
    };

    const english = renderWithIntl(
      "en",
      createElement(PromptExplorerResults, { result: many }),
    );
    // Heading counts every citation; only the first three render collapsed.
    expect(english.markup).toContain("Cited sources (7)");
    expect(english.markup).toContain("Source 2");
    expect(english.markup).not.toContain("Source 3");
    expect(english.markup).toContain("+4 more");
    expect(english.errors).toEqual([]);

    const vietnamese = renderWithIntl(
      "vi",
      createElement(PromptExplorerResults, { result: many }),
    );
    expect(vietnamese.markup).toContain("Nguồn trích dẫn (7)");
    expect(vietnamese.markup).toContain("+4 nguồn khác");
    expect(vietnamese.markup).not.toContain("+4 more");
    expect(vietnamese.errors).toEqual([]);
  });
});
