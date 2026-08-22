import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";

import {
  BrandLookupSearchCard,
  type BrandLookupValidationError,
} from "./BrandLookupSearchCard";
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

const NOOP = () => {};

function baseProps(overrides: {
  isLoading?: boolean;
  competitors?: string;
  validationError?: BrandLookupValidationError | null;
}) {
  return {
    query: "",
    onQueryChange: NOOP,
    competitors: overrides.competitors ?? "",
    onCompetitorsChange: NOOP,
    onSubmit: NOOP,
    isLoading: overrides.isLoading ?? false,
    validationError: overrides.validationError ?? null,
  };
}

describe("BrandLookupSearchCard", () => {
  it.each(["en", "vi"] as const)(
    "shows placeholders, the aria-label and the base cost estimate (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(BrandLookupSearchCard, baseProps({})),
      );
      expect(errors).toEqual([]);
      expect(markup).toContain(
        `placeholder="${catalog["aiBrandLookup.search.queryPlaceholder"]}"`,
      );
      expect(markup).toContain(
        `placeholder="${catalog["aiBrandLookup.search.competitorsPlaceholder"]}"`,
      );
      expect(markup).toContain(
        `aria-label="${catalog["aiBrandLookup.search.competitorsAriaLabel"]}"`,
      );
      expect(markup).toContain(catalog["aiBrandLookup.search.submit"]);
      // Cost through IntlShape ("$0.85"/"0,85 US$", never a hand-rolled "$"
      // concatenation), and no competitor add-on line without competitors.
      expect(markup).toContain(
        intl.formatNumber(0.85, { style: "currency", currency: "USD" }),
      );
      // The competitor cost line only exists once competitors are entered —
      // check via its static (placeholder-free) tail text, locale-agnostic.
      const competitorLineTail =
        catalog["aiBrandLookup.search.costEstimateCompetitors"].split(
          "{amount}",
        )[1];
      expect(markup).not.toContain(competitorLineTail);
    },
  );

  it.each(["en", "vi"] as const)(
    "switches the submit label while loading (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(BrandLookupSearchCard, baseProps({ isLoading: true })),
      );
      expect(errors).toEqual([]);
      expect(markup).toContain(catalog["aiBrandLookup.search.submitLoading"]);
      expect(markup).not.toContain(
        `>${catalog["aiBrandLookup.search.submit"]}<`,
      );
    },
  );

  it.each(["en", "vi"] as const)(
    "adds the competitor cost line once competitors are entered (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(
          BrandLookupSearchCard,
          baseProps({ competitors: "rival.com" }),
        ),
      );
      expect(errors).toEqual([]);
      expect(markup).toContain(
        intl.formatMessage(
          { id: "aiBrandLookup.search.costEstimateCompetitors" },
          {
            amount: intl.formatNumber(0.2, {
              style: "currency",
              currency: "USD",
            }),
          },
        ),
      );
    },
  );

  it.each(["en", "vi"] as const)(
    "resolves each validation messageId with its interpolated values (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const cases: BrandLookupValidationError[] = [
        {
          field: "query",
          messageId: "aiBrandLookup.search.error.queryRequired",
        },
        {
          field: "query",
          messageId: "aiBrandLookup.search.error.queryTooLong",
          values: { max: 250 },
        },
        {
          field: "competitors",
          messageId: "aiBrandLookup.search.error.competitorTooLong",
          values: { max: 250 },
        },
        {
          field: "competitors",
          messageId: "aiBrandLookup.search.error.competitorMatchesTarget",
          values: { competitor: "acme.com" },
        },
      ];

      for (const validationError of cases) {
        const { markup, errors } = renderWithIntl(
          locale,
          createElement(BrandLookupSearchCard, baseProps({ validationError })),
        );
        expect(errors).toEqual([]);
        // `renderToStaticMarkup` HTML-escapes text nodes (`'` → `&#x27;`),
        // so "you're" needs unescaping before a raw comparison against
        // `intl.formatMessage`'s plain-text output.
        expect(markup.replaceAll("&#x27;", "'")).toContain(
          intl.formatMessage(
            { id: validationError.messageId },
            validationError.values,
          ),
        );
      }
    },
  );
});
