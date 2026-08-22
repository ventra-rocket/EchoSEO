import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";

import { BrandLookupHistorySection } from "./BrandLookupHistorySection";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { BrandLookupSearchHistoryItem } from "@/client/hooks/useBrandLookupSearchHistory";

// Renders through the real SearchHistorySection (owned by the Prompt
// Explorer slice) — this test only asserts BrandLookupHistorySection's own
// call-site wiring (emptyMessageId, nounId, the competitors line), not
// SearchHistorySection's internals. The router itself is not under test.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) =>
    createElement("a", null, children),
}));

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

describe("BrandLookupHistorySection", () => {
  it.each(["en", "vi"] as const)(
    "names the empty state instead of rendering a blank section (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(BrandLookupHistorySection, {
          projectId: "p1",
          history: [],
          historyLoaded: true,
          onRemoveHistoryItem: () => {},
        }),
      );
      expect(errors).toEqual([]);
      expect(markup).toContain(catalog["aiBrandLookup.history.emptyMessage"]);
    },
  );

  it.each(["en", "vi"] as const)(
    "lists compared competitors through IntlShape, not string concatenation (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const history: BrandLookupSearchHistoryItem[] = [
        {
          query: "acme.com",
          competitors: ["rival.com", "other.com"],
          timestamp: 1,
        },
      ];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(BrandLookupHistorySection, {
          projectId: "p1",
          history,
          historyLoaded: true,
          onRemoveHistoryItem: () => {},
        }),
      );
      expect(errors).toEqual([]);
      expect(markup).toContain("acme.com");
      expect(markup).toContain(
        intl.formatMessage(
          { id: "aiBrandLookup.history.competitorsPrefix" },
          { competitors: "rival.com, other.com" },
        ),
      );
    },
  );
});
