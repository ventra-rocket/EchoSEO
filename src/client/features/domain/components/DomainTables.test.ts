import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";

import { DomainKeywordsTable } from "./DomainKeywordsTable";
import { DomainPagesTable } from "./DomainPagesTable";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { KeywordRow, PageRow } from "@/client/features/domain/types";

// Split from the filter/pagination controls purely to stay under the 400-line
// max-lines ceiling; the harness is duplicated because every intl test file in
// this repo carries its own (9 of them today), and inventing a shared one here
// would add a tenth pattern rather than remove nine.

// The states under test link to the domain route; the router itself is not.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    "aria-label": ariaLabel,
    "aria-disabled": ariaDisabled,
    children,
  }: {
    "aria-label"?: string;
    "aria-disabled"?: boolean;
    children?: ReactNode;
  }) =>
    createElement(
      "a",
      { "aria-label": ariaLabel, "aria-disabled": ariaDisabled },
      children,
    ),
  linkOptions: (options: unknown) => options,
}));

const CATALOGS = { en, vi: viMessages } as const;

/**
 * Renders through a real IntlShape with an onError probe, the same pattern
 * KeywordSuggestionColumns.test.ts uses to pin the id-echo regression: a
 * component that passes an already-formatted string into a prop expecting a
 * raw message id renders a *correct-looking* string (the id resolves to
 * itself as its own MissingTranslationError fallback) while still throwing on
 * every render. Reading rendered text alone would pass against that bug, so
 * this also asserts `errors` is empty.
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

// Named so the assertions can format the exact numbers the table receives.
// `KeywordRow` types both fields as optional, so reading them back off the
// fixture would need a cast that claims more than the type knows.
const KEYWORD_CPC = 2.35;
const KEYWORD_VOLUME = 1234;

const KEYWORD_ROW: KeywordRow = {
  keyword: "seo audit tool",
  position: 4,
  searchVolume: KEYWORD_VOLUME,
  traffic: 87.6,
  cpc: KEYWORD_CPC,
  url: "https://example.com/seo-audit",
  relativeUrl: "/seo-audit",
  keywordDifficulty: 42,
};

const PAGE_ROW: PageRow = {
  page: "https://example.com/pricing",
  relativePath: "/pricing",
  organicTraffic: 512.4,
  keywords: 87,
};

describe("DomainKeywordsTable", () => {
  it.each(["en", "vi"] as const)(
    "renders every column header and the sort aria-label in %s without a missing id",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(DomainKeywordsTable, {
          domain: "example.com",
          rows: [KEYWORD_ROW],
          selectedKeywords: new Set<string>(),
          visibleKeywords: [KEYWORD_ROW.keyword],
          sortMode: "rank",
          currentSortOrder: "asc",
          onSortClick: () => {},
          onToggleKeyword: () => {},
        }),
      );

      expect(errors).toEqual([]);
      for (const id of [
        "domainTables.keywords.column.keyword",
        "domainTables.keywords.column.rank",
        "domainTables.keywords.column.volume",
        "domainTables.keywords.column.traffic",
        "domainTables.keywords.column.cpc",
        "domainTables.keywords.column.url",
        "domainTables.keywords.column.score",
      ] as const) {
        expect(markup).toContain(catalog[id]);
      }
      // The sortable "Rank" column's accessible name — the exact spot the
      // shipped bug lived in a sibling component (a hardcoded "Sort by "
      // prefix that never asked react-intl for anything at all).
      const expectedSortLabel = createIntl({
        locale,
        messages: catalog,
      }).formatMessage(
        { id: "common.table.sortBy" },
        { label: catalog["domainTables.keywords.column.rank"] },
      );
      expect(markup).toContain(`aria-label="${expectedSortLabel}"`);
      // Never the raw id: an id-echo bug reads as *plausible* prose here too.
      expect(markup).not.toContain('domainTables.keywords.column.rank"');
      // Currency and volume must go through the active IntlShape rather than
      // a hand-rolled "$" concatenation: en and vi disagree on both the
      // symbol placement and the thousands separator, so a locale-blind
      // formatter would silently ship the wrong one to the vi reader.
      const intl = createIntl({ locale, messages: catalog });
      expect(markup).toContain(
        intl.formatNumber(KEYWORD_CPC, {
          style: "currency",
          currency: "USD",
        }),
      );
      expect(markup).toContain(intl.formatNumber(KEYWORD_VOLUME));
    },
  );

  it.each(["en", "vi"] as const)(
    "prompts for a selection and switches to a count once one is made (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup: promptMarkup, errors: promptErrors } = renderWithIntl(
        locale,
        createElement(DomainKeywordsTable, {
          domain: "example.com",
          rows: [KEYWORD_ROW],
          selectedKeywords: new Set<string>(),
          visibleKeywords: [KEYWORD_ROW.keyword],
          sortMode: "rank",
          currentSortOrder: "asc",
          onSortClick: () => {},
          onToggleKeyword: () => {},
        }),
      );
      expect(promptErrors).toEqual([]);
      expect(promptMarkup).toContain(
        catalog["domainTables.keywords.selectionHint"],
      );

      const { markup: selectedMarkup, errors: selectedErrors } = renderWithIntl(
        locale,
        createElement(DomainKeywordsTable, {
          domain: "example.com",
          rows: [KEYWORD_ROW],
          selectedKeywords: new Set([KEYWORD_ROW.keyword]),
          visibleKeywords: [KEYWORD_ROW.keyword],
          sortMode: "rank",
          currentSortOrder: "asc",
          onSortClick: () => {},
          onToggleKeyword: () => {},
        }),
      );
      expect(selectedErrors).toEqual([]);
      expect(selectedMarkup).toContain(catalog["common.table.selected"]);
      expect(selectedMarkup).not.toContain(
        catalog["domainTables.keywords.selectionHint"],
      );
    },
  );

  it.each(["en", "vi"] as const)(
    "names the empty result instead of rendering a blank table (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(DomainKeywordsTable, {
          domain: "example.com",
          rows: [],
          selectedKeywords: new Set<string>(),
          visibleKeywords: [],
          sortMode: "rank",
          currentSortOrder: "asc",
          onSortClick: () => {},
          onToggleKeyword: () => {},
        }),
      );
      expect(errors).toEqual([]);
      expect(markup).toContain(catalog["domainTables.keywords.empty"]);
    },
  );
});

describe("DomainPagesTable", () => {
  it.each(["en", "vi"] as const)(
    "renders every column header in %s without a missing id",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(DomainPagesTable, {
          domain: "example.com",
          rows: [PAGE_ROW],
          sortMode: "traffic",
          currentSortOrder: "desc",
          onSortClick: () => {},
        }),
      );

      expect(errors).toEqual([]);
      for (const id of [
        "domainTables.pages.column.page",
        "domainTables.pages.column.organicTraffic",
        "domainTables.pages.column.keywords",
      ] as const) {
        expect(markup).toContain(catalog[id]);
      }
    },
  );

  it.each(["en", "vi"] as const)(
    "names the empty result instead of rendering a blank table (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(DomainPagesTable, {
          domain: "example.com",
          rows: [],
          sortMode: "traffic",
          currentSortOrder: "desc",
          onSortClick: () => {},
        }),
      );
      expect(errors).toEqual([]);
      expect(markup).toContain(catalog["domainTables.pages.empty"]);
    },
  );
});
