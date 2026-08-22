import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { Columns3, SearchCheck, Sparkles } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { AiSearchPaidPlanGate } from "./AiSearchPaidPlanGate";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { MessageId } from "@/client/i18n/messages";

const CATALOGS = { en, vi: viMessages } as const;

// The gate links to /subscribe; the router itself is not under test.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement("a", { href: to }, children),
}));

/**
 * Renders through a real IntlShape with an onError probe. AiSearchPaidPlanGate
 * takes featureId/descriptionId/bullets[].titleId/bodyId — every one of those
 * is exactly the "prop expects a message id" shape the id-echo regression
 * hits when a caller passes a formatted string instead, so this also asserts
 * `errors` is empty.
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

// Mirrors PromptExplorerPage.tsx's PROMPT_EXPLORER_BULLETS exactly, including
// reusing nav.promptExplorer as the featureId so the sidebar, the <h1>, and
// this "Unlock {feature}" title can never drift apart.
const PROMPT_EXPLORER_BULLETS: Array<{
  icon: typeof Columns3;
  titleId: MessageId;
  bodyId: MessageId;
}> = [
  {
    icon: Columns3,
    titleId: "aiPromptExplorer.paidGate.bullets.models.title",
    bodyId: "aiPromptExplorer.paidGate.bullets.models.body",
  },
  {
    icon: SearchCheck,
    titleId: "aiPromptExplorer.paidGate.bullets.citations.title",
    bodyId: "aiPromptExplorer.paidGate.bullets.citations.body",
  },
  {
    icon: Sparkles,
    titleId: "aiPromptExplorer.paidGate.bullets.brand.title",
    bodyId: "aiPromptExplorer.paidGate.bullets.brand.body",
  },
];

describe("AiSearchPaidPlanGate", () => {
  it("renders the Prompt Explorer upsell in English without a missing id", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(AiSearchPaidPlanGate, {
        featureId: "nav.promptExplorer",
        descriptionId: "aiPromptExplorer.paidGate.description",
        bullets: PROMPT_EXPLORER_BULLETS,
      }),
    );

    expect(markup).toContain("Paid plan");
    // The nested FormattedMessage-as-value composes the feature name inside
    // the structural "Unlock {feature}" sentence.
    expect(markup).toContain("Unlock Prompt Explorer");
    expect(markup).toContain(
      "Ask one prompt across ChatGPT, Claude, Gemini, and Perplexity",
    );
    expect(markup).toContain("Four models side-by-side");
    expect(markup).toContain("See what the models cite");
    expect(markup).toContain("Check brand mentions");
    expect(markup).toContain("Upgrade");
    expect(errors).toEqual([]);
  });

  it("renders the same upsell in Vietnamese without a missing id", () => {
    const { markup, errors } = renderWithIntl(
      "vi",
      createElement(AiSearchPaidPlanGate, {
        featureId: "nav.promptExplorer",
        descriptionId: "aiPromptExplorer.paidGate.description",
        bullets: PROMPT_EXPLORER_BULLETS,
      }),
    );

    expect(markup).toContain("Gói trả phí");
    expect(markup).toContain("Mở khóa Khám phá prompt");
    expect(markup).toContain("Bốn mô hình cạnh nhau");
    expect(markup).toContain("Xem nguồn mà các mô hình trích dẫn");
    expect(markup).toContain("Kiểm tra nhắc đến thương hiệu");
    expect(markup).toContain("Nâng cấp");
    expect(markup).not.toContain("Unlock");
    expect(markup).not.toContain("Upgrade");
    expect(errors).toEqual([]);
  });
});
