import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import { AiSearchSetupGate } from "./AiSearchSetupGate";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

const CATALOGS = { en, vi: viMessages } as const;

/**
 * Renders through a real IntlShape with an onError probe: a prop that expects
 * a message id but receives an already-formatted string renders
 * correct-looking text (the id resolves to itself) while still throwing on
 * every render, so reading markup alone would pass against that bug — this
 * also asserts `errors` is empty (KeywordSuggestionColumns.test.ts pattern).
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

// This is the state a keyless/product-not-enabled workspace actually reaches
// for both BrandLookupPage and PromptExplorerPage — the shared "AI
// Optimization" gate, not the paid-plan gate or any result state.
describe("AiSearchSetupGate", () => {
  it("renders the AI Optimization enablement gate in English without a missing id", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(AiSearchSetupGate, {
        errorMessage: null,
        isRefetching: false,
        onRetry: vi.fn(),
      }),
    );

    expect(markup).toContain("Enable AI Optimization");
    expect(markup).toContain(
      "AI Optimization is not enabled for your DataForSEO account yet",
    );
    // Currency ICU value — assert on the surrounding text rather than the
    // formatted glyph, which depends on the runtime's ICU data.
    expect(markup).toContain("/month");
    expect(markup).toContain("use managed EchoSEO");
    expect(markup).toContain("Confirm AI Optimization Access");
    expect(markup).toContain("Open DataForSEO API Access");
    expect(errors).toEqual([]);
  });

  it("renders the same gate in Vietnamese without a missing id", () => {
    const { markup, errors } = renderWithIntl(
      "vi",
      createElement(AiSearchSetupGate, {
        errorMessage: null,
        isRefetching: false,
        onRetry: vi.fn(),
      }),
    );

    expect(markup).toContain("Bật tính năng AI Optimization");
    expect(markup).toContain("chưa bật tính năng AI Optimization");
    expect(markup).toContain("/tháng");
    expect(markup).toContain("dùng EchoSEO managed");
    expect(markup).toContain("Xác nhận quyền truy cập AI Optimization");
    expect(markup).toContain("Mở trang API Access trên DataForSEO");
    // DataForSEO and EchoSEO are shipped brand exemptions — stay untranslated.
    expect(markup).toContain("DataForSEO");
    expect(markup).toContain("EchoSEO");
    expect(markup).not.toContain("Enable AI Optimization");
    expect(errors).toEqual([]);
  });

  it("shows the refetching label while confirming, in Vietnamese", () => {
    const { markup, errors } = renderWithIntl(
      "vi",
      createElement(AiSearchSetupGate, {
        errorMessage: null,
        isRefetching: true,
        onRetry: vi.fn(),
      }),
    );

    // AccessGate's refetchingLabel default is English ("Confirming..."); this
    // pins that AiSearchSetupGate always supplies its own localized label
    // instead of falling through to it.
    expect(markup).toContain("Đang xác nhận");
    expect(markup).not.toContain("Xác nhận quyền truy cập AI Optimization");
    expect(markup).not.toContain("Confirming");
    expect(errors).toEqual([]);
  });

  it("surfaces a caller-supplied status error alongside the gate copy", () => {
    const { markup, errors } = renderWithIntl(
      "vi",
      createElement(AiSearchSetupGate, {
        errorMessage: "Không thể tải trạng thái thiết lập AI Optimization.",
        isRefetching: false,
        onRetry: vi.fn(),
      }),
    );

    expect(markup).toContain(
      "Không thể tải trạng thái thiết lập AI Optimization.",
    );
    expect(errors).toEqual([]);
  });
});
