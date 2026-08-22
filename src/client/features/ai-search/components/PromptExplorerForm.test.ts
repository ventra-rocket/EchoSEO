import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import { PromptExplorerForm } from "./PromptExplorerForm";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { PromptExplorerModel } from "@/types/schemas/ai-search";

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

const baseFormProps = {
  form: {
    prompt: "",
    highlightBrand: "",
    models: [] as PromptExplorerModel[],
    webSearch: false,
    webSearchCountryCode: "US" as const,
  },
  onPromptChange: vi.fn(),
  onHighlightBrandChange: vi.fn(),
  onModelsChange: vi.fn(),
  onWebSearchChange: vi.fn(),
  onCountryChange: vi.fn(),
  onSubmit: vi.fn(),
  isLoading: false,
  validationError: null,
};

describe("PromptExplorerForm", () => {
  it("renders every label, hint and the submit button in English without a missing id", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(PromptExplorerForm, baseFormProps),
    );

    expect(markup).toContain(">Prompt<");
    expect(markup).toContain("What your customers might ask AI.");
    expect(markup).toContain("Highlight brand (optional)");
    expect(markup).toContain(
      "We&#x27;ll flag whether each model mentions this brand.",
    );
    expect(markup).toContain(">Models<");
    expect(markup).toContain("Allow web search (more current answers)");
    expect(markup).toContain('aria-label="Web search location"');
    expect(markup).toContain(">Run<");
    expect(errors).toEqual([]);
  });

  it("renders the same form in Vietnamese without a missing id", () => {
    const { markup, errors } = renderWithIntl(
      "vi",
      createElement(PromptExplorerForm, baseFormProps),
    );

    expect(markup).toContain(">Câu lệnh<");
    expect(markup).toContain("Những gì khách hàng của bạn có thể hỏi AI.");
    expect(markup).toContain("Đánh dấu thương hiệu (tùy chọn)");
    expect(markup).toContain(
      "Chúng tôi sẽ đánh dấu nếu mỗi mô hình có nhắc đến thương hiệu này.",
    );
    expect(markup).toContain(">Mô hình<");
    expect(markup).toContain(
      "Cho phép tìm kiếm web (câu trả lời cập nhật hơn)",
    );
    expect(markup).toContain('aria-label="Vị trí tìm kiếm web"');
    expect(markup).toContain(">Chạy<");
    expect(markup).not.toContain(">Prompt<");
    expect(markup).not.toContain(">Run<");
    expect(errors).toEqual([]);
  });

  it("shows the running label instead of the submit label while loading, in Vietnamese", () => {
    const { markup, errors } = renderWithIntl(
      "vi",
      createElement(PromptExplorerForm, { ...baseFormProps, isLoading: true }),
    );

    expect(markup).toContain("Đang chạy");
    expect(markup).not.toContain(">Chạy<");
    expect(errors).toEqual([]);
  });

  it("renders a caller-supplied validation error verbatim", () => {
    const { markup, errors } = renderWithIntl(
      "vi",
      createElement(PromptExplorerForm, {
        ...baseFormProps,
        validationError: "Chọn ít nhất một mô hình",
      }),
    );

    expect(markup).toContain("Chọn ít nhất một mô hình");
    expect(errors).toEqual([]);
  });
});
