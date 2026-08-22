import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";
import { MarkdownAnswer } from "./MarkdownAnswer";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

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

describe("MarkdownAnswer", () => {
  it("reports an empty model response in English without a missing id", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(MarkdownAnswer, { text: "" }),
    );

    expect(markup).toContain("Model returned an empty response.");
    expect(errors).toEqual([]);
  });

  it("reports an empty model response in Vietnamese without a missing id", () => {
    const { markup, errors } = renderWithIntl(
      "vi",
      createElement(MarkdownAnswer, { text: "   " }),
    );

    expect(markup).toContain("Mô hình trả về câu trả lời trống.");
    expect(markup).not.toContain("Model returned an empty response.");
    expect(errors).toEqual([]);
  });

  it("labels a reasoning-model's thinking block in English without a missing id", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(MarkdownAnswer, {
        text: "<think>Working through the SEO angle.</think>Acme ranks first.",
      }),
    );

    expect(markup).toContain("Model Thinking");
    expect(markup).toContain("Working through the SEO angle.");
    expect(markup).toContain("Acme ranks first.");
    expect(errors).toEqual([]);
  });

  it("labels the same thinking block in Vietnamese without a missing id", () => {
    const { markup, errors } = renderWithIntl(
      "vi",
      createElement(MarkdownAnswer, {
        text: "<think>Working through the SEO angle.</think>Acme ranks first.",
      }),
    );

    expect(markup).toContain("Quá trình suy luận của mô hình");
    expect(markup).not.toContain("Model Thinking");
    expect(errors).toEqual([]);
  });
});
