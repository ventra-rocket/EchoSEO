import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";

import { DomainFilterPanel } from "./DomainFilterPanel";
import { DomainKeywordsPagination } from "./DomainKeywordsPagination";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

// The filter panel and pagination halves of the Domain Overview tables. Split
// from DomainTables.test.ts to stay under the 400-line max-lines ceiling; see
// the note there about the duplicated harness.

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

describe("DomainFilterPanel", () => {
  const FIELDS = ["include", "minTraffic", "maxTraffic"] as const;
  const TEXT_FIELDS = [
    {
      key: "include" as const,
      labelId: "domainTables.keywords.filter.includeLabel" as const,
      placeholderId: "domainTables.keywords.filter.includePlaceholder" as const,
    },
  ];
  const RANGE_FIELDS = [
    {
      titleId: "domainTables.keywords.filter.trafficTitle" as const,
      minKey: "minTraffic" as const,
      maxKey: "maxTraffic" as const,
    },
  ];
  const APPLIED = { include: "", minTraffic: "", maxTraffic: "" };

  it.each(["en", "vi"] as const)(
    "renders chrome, field labels and the active-count badge in %s without a missing id",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(DomainFilterPanel, {
          debugName: "TestFilterPanel",
          activeFilterCount: 2,
          appliedFilters: APPLIED,
          fields: FIELDS,
          textFields: TEXT_FIELDS,
          rangeFields: RANGE_FIELDS,
          countConditions: (values: Record<string, string>) =>
            Object.values(values).filter((v) => v.trim() !== "").length,
          onApply: () => {},
          onClear: () => {},
        }),
      );

      expect(errors).toEqual([]);
      expect(markup).toContain(catalog["domainTables.filterPanel.title"]);
      expect(markup).toContain(catalog["domainTables.filterPanel.clearAll"]);
      expect(markup).toContain(catalog["domainTables.filterPanel.cancel"]);
      expect(markup).toContain(catalog["domainTables.filterPanel.apply"]);
      expect(markup).toContain(
        catalog["domainTables.keywords.filter.includeLabel"],
      );
      expect(markup).toContain(
        catalog["domainTables.keywords.filter.includePlaceholder"],
      );
      expect(markup).toContain(
        catalog["domainTables.keywords.filter.trafficTitle"],
      );
      expect(markup).toContain(
        `placeholder="${catalog["domainTables.filterPanel.min"]}"`,
      );
      expect(markup).toContain(
        `placeholder="${catalog["domainTables.filterPanel.max"]}"`,
      );
      const expectedActive = createIntl({
        locale,
        messages: catalog,
      }).formatMessage(
        { id: "domainTables.filterPanel.activeCount" },
        { count: 2 },
      );
      expect(markup).toContain(expectedActive);
    },
  );

  it("hides the active-count badge at zero", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(DomainFilterPanel, {
        debugName: "TestFilterPanel",
        activeFilterCount: 0,
        appliedFilters: APPLIED,
        fields: FIELDS,
        textFields: TEXT_FIELDS,
        rangeFields: RANGE_FIELDS,
        countConditions: () => 0,
        onApply: () => {},
        onClear: () => {},
      }),
    );
    expect(errors).toEqual([]);
    expect(markup).not.toContain("active<");
  });

  it.each(["en", "vi"] as const)(
    "translates the over-limit warning and the disabled apply tooltip (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(DomainFilterPanel, {
          debugName: "TestFilterPanel",
          activeFilterCount: 0,
          appliedFilters: APPLIED,
          fields: FIELDS,
          textFields: TEXT_FIELDS,
          rangeFields: RANGE_FIELDS,
          // Forces meta.overLimit regardless of field contents.
          countConditions: () => 999,
          onApply: () => {},
          onClear: () => {},
        }),
      );

      expect(errors).toEqual([]);
      const intl = createIntl({ locale, messages: catalog });
      expect(markup).toContain(
        intl.formatMessage(
          { id: "domainTables.filterPanel.overLimit" },
          { count: 999, max: 8 },
        ),
      );
      expect(markup).toContain(
        `title="${intl.formatMessage(
          { id: "domainTables.filterPanel.applyDisabledTitle" },
          { max: 8 },
        )}"`,
      );
    },
  );
});

describe("DomainKeywordsPagination", () => {
  it.each(["en", "vi"] as const)(
    "renders the known-total range, rows-per-page and page chrome in %s",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(DomainKeywordsPagination, {
          page: 2,
          pageSize: 50,
          totalCount: 235,
          hasNextPage: true,
          isLoading: false,
          onPageChange: () => {},
          onPageSizeChange: () => {},
        }),
      );

      expect(errors).toEqual([]);
      const intl = createIntl({ locale, messages: catalog });
      expect(markup).toContain(
        intl.formatMessage(
          { id: "common.table.rangeWithTotal" },
          { start: 51, end: 100, total: 235 },
        ),
      );
      expect(markup).toContain(catalog["common.table.rowsPerPage"]);
      expect(markup).toContain(
        intl.formatMessage(
          { id: "common.table.pageOf" },
          { page: 2, totalPages: 5 },
        ),
      );
      expect(markup).toContain(
        `aria-label="${catalog["common.table.previousPage"]}"`,
      );
      expect(markup).toContain(
        `aria-label="${catalog["common.table.nextPage"]}"`,
      );
    },
  );

  it("shows a totalless range while the count is still loading", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(DomainKeywordsPagination, {
        page: 1,
        pageSize: 50,
        totalCount: null,
        hasNextPage: true,
        isLoading: true,
        onPageChange: () => {},
        onPageSizeChange: () => {},
      }),
    );
    expect(errors).toEqual([]);
    expect(markup).toContain("1\u201350");
    expect(markup).not.toContain(" of ");
  });

  it("renders zero rather than an inverted range when the result set is empty", () => {
    const { markup, errors } = renderWithIntl(
      "en",
      createElement(DomainKeywordsPagination, {
        page: 1,
        pageSize: 50,
        totalCount: 0,
        hasNextPage: false,
        isLoading: false,
        onPageChange: () => {},
        onPageSizeChange: () => {},
      }),
    );
    expect(errors).toEqual([]);
    expect(markup).toContain(">0<");
  });
});
