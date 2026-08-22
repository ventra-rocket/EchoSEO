import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { MessageSquare } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { SearchHistorySection } from "./SearchHistorySection";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

const CATALOGS = { en, vi: viMessages } as const;

/**
 * Renders through a real IntlShape with an onError probe — see
 * DomainTables.test.ts / KeywordSuggestionColumns.test.ts for why markup
 * alone is not enough: a prop that expects a message id but receives an
 * already-formatted string renders correct-looking text while still throwing
 * `MissingTranslationError` on every render.
 */
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

type TestHistoryItem = { timestamp: number; label: string };

const historyFixture: TestHistoryItem[] = [
  { timestamp: new Date("2024-03-15T00:00:00Z").getTime(), label: "first" },
  { timestamp: new Date("2024-03-16T00:00:00Z").getTime(), label: "second" },
  { timestamp: new Date("2024-03-17T00:00:00Z").getTime(), label: "third" },
];
// Mirrors PromptExplorerHistorySection.tsx's call site exactly. Fixed via a
// TS instantiation expression so createElement can see a concrete TItem
// instead of trying (and failing) to infer it from contravariant callback
// parameters.
const PromptSearchHistorySection = SearchHistorySection<TestHistoryItem>;

function baseProps(history: TestHistoryItem[]) {
  return {
    history,
    historyLoaded: true,
    onRemoveHistoryItem: vi.fn(),
    renderItemLink: (item: TestHistoryItem, content: ReactNode) =>
      createElement("a", { href: "#", key: item.timestamp }, content),
    emptyIcon: MessageSquare,
    emptyMessageId: "aiPromptExplorer.history.emptyMessage" as const,
    nounId: "aiPromptExplorer.history.noun" as const,
    renderItem: (item: TestHistoryItem) =>
      createElement("span", null, item.label),
  };
}

describe("SearchHistorySection", () => {
  it("renders the Prompt Explorer empty state in English", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(PromptSearchHistorySection, baseProps([])),
    );

    expect(markup).toContain("Enter a prompt to compare model answers");
    expect(errors).toEqual([]);
  });

  it("renders the Prompt Explorer empty state in Vietnamese", () => {
    const { markup, errors } = renderWithIntl(
      "vi",
      createElement(PromptSearchHistorySection, baseProps([])),
    );

    expect(markup).toContain(
      "Nhập một câu lệnh để so sánh câu trả lời của các mô hình",
    );
    expect(errors).toEqual([]);
  });

  it("returns nothing before history has loaded from storage", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(PromptSearchHistorySection, {
        ...baseProps([]),
        historyLoaded: false,
      }),
    );

    expect(markup).toBe("");
    expect(errors).toEqual([]);
  });

  it("uses the English singular branch for exactly one recent prompt", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(
        PromptSearchHistorySection,
        baseProps(historyFixture.slice(0, 1)),
      ),
    );

    expect(markup).toContain("1 recent prompt");
    expect(markup).not.toContain("1 recent prompts");
    expect(errors).toEqual([]);
  });

  it("uses the English plural branch for three recent prompts", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(PromptSearchHistorySection, baseProps(historyFixture)),
    );

    expect(markup).toContain("3 recent prompts");
    expect(markup).toContain("Remove from history");
    expect(errors).toEqual([]);
  });

  it("renders three recent items in Vietnamese with an ICU count, locale-aware dates, and a translated remove label", () => {
    const { markup, errors } = renderWithIntl(
      "vi",
      createElement(PromptSearchHistorySection, baseProps(historyFixture)),
    );

    // ICU plural count with the caller's noun composed in, not a hand-built
    // "N recent {noun}" string — Vietnamese has no "one" category, so this is
    // the same "other" branch used for every count.
    expect(markup).toContain("3 câu lệnh gần đây");
    // Vietnamese month abbreviation ("thg") only appears when the timestamp
    // goes through intl.formatDate with the active locale — the
    // toLocaleDateString(undefined, ...) it replaced ignores the app locale
    // entirely and would never produce it here.
    expect(markup).toContain("thg");
    expect(markup).toContain("Xóa khỏi lịch sử");
    expect(markup).not.toContain("Remove from history");
    expect(errors).toEqual([]);
  });
});
