import { createElement, useState, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { useForm } from "@tanstack/react-form";
import { describe, expect, it } from "vitest";

import { BrandLookupFilterPanel } from "./BrandLookupFilterPanel";
import { countActiveFilters } from "@/client/features/ai-search/brandLookupFiltering";
import {
  EMPTY_QUERIES_FILTERS,
  EMPTY_TOP_PAGES_FILTERS,
  type CitationTab,
  type QueriesFilterValues,
  type TopPagesFilterValues,
} from "@/client/features/ai-search/brandLookupFilterTypes";
import type { BrandLookupFiltersState } from "@/client/features/ai-search/useBrandLookupFilters";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

const CATALOGS = { en, vi: viMessages } as const;

/**
 * Same probe pattern as DomainTables.test.ts: a real IntlShape with an
 * onError hook, so a component that echoes an id back as its own fallback
 * (the id-echo bug — plausible-looking text that still throws on every
 * render) fails the test even though the markup alone would look fine.
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

// A real `useForm` per tab (not a hand-rolled fake): BrandLookupFilterPanel's
// `filters` prop is typed against useBrandLookupFilters' real return shape
// (a full TanStack FormApi per tab), and faking that shape would need an
// `as unknown as` wide enough to hide a real mismatch. Bypasses
// useBrandLookupFilters' own hook (which always seeds empty — localStorage is
// unavailable under vitest's node environment) so the "N active" fixture
// below can seed a non-empty value directly.
function useFixtureTabFilters<T extends Record<string, string>>(values: T) {
  const form = useForm({ defaultValues: values });
  return {
    form,
    values,
    reset: () => {},
    activeFilterCount: countActiveFilters(values),
  };
}

function FilterPanelFixture({
  activeTab,
  pagesValues,
  queriesValues,
}: {
  activeTab: CitationTab;
  pagesValues: TopPagesFilterValues;
  queriesValues: QueriesFilterValues;
}) {
  const pages = useFixtureTabFilters(pagesValues);
  const queries = useFixtureTabFilters(queriesValues);
  const [showFilters, setShowFilters] = useState(true);
  const filters: BrandLookupFiltersState = {
    pages,
    queries,
    showFilters,
    setShowFilters,
  };
  return createElement(BrandLookupFilterPanel, { activeTab, filters });
}

describe("BrandLookupFilterPanel", () => {
  it.each(["en", "vi"] as const)(
    "renders the pages-tab filter chrome in %s without a missing id",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(FilterPanelFixture, {
          activeTab: "pages",
          pagesValues: EMPTY_TOP_PAGES_FILTERS,
          queriesValues: EMPTY_QUERIES_FILTERS,
        }),
      );

      expect(errors).toEqual([]);
      for (const id of [
        "aiCitations.filterPanel.heading",
        "aiCitations.filterPanel.clearAll",
        "aiCitations.filterPanel.includeLabel",
        "aiCitations.filterPanel.excludeLabel",
        "aiCitations.filterPanel.pages.includePlaceholder",
        "aiCitations.filterPanel.pages.excludePlaceholder",
        "aiCitations.filterPanel.pages.mentionsTitle",
        "aiCitations.filterPanel.platformLabel",
        "aiCitations.filterPanel.platformAll",
        "aiCitations.filterPanel.min",
        "aiCitations.filterPanel.max",
      ] as const) {
        expect(markup).toContain(catalog[id]);
      }
      // Zero active filters: the count badge does not render at all, and the
      // reset button is disabled.
      expect(markup).not.toContain(
        catalog["aiCitations.filterPanel.activeCount"].replace(
          "{count, number}",
          "0",
        ),
      );
      expect(markup).toContain('disabled=""');
      // Never the raw id: an id-echo bug reads as plausible prose here too.
      expect(markup).not.toContain('aiCitations.filterPanel.heading"');
    },
  );

  it.each(["en", "vi"] as const)(
    "renders the queries-tab placeholders and the active-filter count in %s",
    (locale) => {
      const catalog = CATALOGS[locale];
      const dirtyQueries: QueriesFilterValues = {
        ...EMPTY_QUERIES_FILTERS,
        include: "pricing",
      };
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(FilterPanelFixture, {
          activeTab: "queries",
          pagesValues: EMPTY_TOP_PAGES_FILTERS,
          queriesValues: dirtyQueries,
        }),
      );

      expect(errors).toEqual([]);
      for (const id of [
        "aiCitations.filterPanel.queries.includePlaceholder",
        "aiCitations.filterPanel.queries.excludePlaceholder",
        "aiCitations.filterPanel.queries.volumeTitle",
      ] as const) {
        expect(markup).toContain(catalog[id]);
      }
      // Counts go through ICU (`{count, number}`), not string concatenation:
      // assert the exact locale-formatted badge text, not just its digit.
      const intl = createIntl({ locale, messages: catalog });
      expect(markup).toContain(
        intl.formatMessage(
          { id: "aiCitations.filterPanel.activeCount" },
          { count: 1 },
        ),
      );
    },
  );
});
