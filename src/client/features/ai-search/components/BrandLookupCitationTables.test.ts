import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider, type IntlShape } from "react-intl";
import { describe, expect, it, vi } from "vitest";

import {
  buildTopPagesColumns,
  TopPagesTable,
} from "./BrandLookupCitationTables";
import {
  buildTopQueriesColumns,
  TopQueriesTable,
} from "./BrandLookupQueriesTable";
import { useAppTable } from "@/client/components/table/AppDataTable";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { BrandLookupResult } from "@/types/schemas/ai-search";

// Citation prompts link into Prompt Explorer; the router itself is not under
// test here, matching DomainTables.test.ts's own Link mock.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    title,
    "aria-label": ariaLabel,
    children,
  }: {
    title?: string;
    "aria-label"?: string;
    children?: ReactNode;
  }) => createElement("a", { title, "aria-label": ariaLabel }, children),
  linkOptions: (options: unknown) => options,
}));

type TopPageRow = BrandLookupResult["topPages"][number];
type TopQueryRow = BrandLookupResult["topQueries"][number];

const CATALOGS = { en, vi: viMessages } as const;

/**
 * Renders through a real IntlShape with an onError probe — the pattern
 * DomainTables.test.ts uses to pin the id-echo regression: a component that
 * passes an already-formatted string into a prop expecting a raw message id
 * renders a *correct-looking* string (the id resolves to itself as its own
 * MissingTranslationError fallback) while still throwing on every render.
 * Reading rendered text alone would pass against that bug, so this also
 * asserts `errors` is empty.
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
const PAGE_VOLUME = 4200;
const KEYWORD_VOLUME_1 = 90;
const KEYWORD_VOLUME_2 = 40;
const KEYWORD_VOLUME_3 = 30;
const KEYWORD_VOLUME_4 = 20;
const QUERY_VOLUME = 5400;

// Four keywords: the top 3 render inline, the 4th only behind "+1 more".
const PAGE_ROW: TopPageRow = {
  url: "https://example.com/pricing",
  domain: "example.com",
  platform: "chat_gpt",
  mentions: 4,
  capturedVolume: PAGE_VOLUME,
  keywords: [
    { question: "what does example cost", aiSearchVolume: KEYWORD_VOLUME_1 },
    { question: "example pricing plans", aiSearchVolume: KEYWORD_VOLUME_2 },
    { question: "is example worth it", aiSearchVolume: KEYWORD_VOLUME_3 },
    { question: "example vs competitor", aiSearchVolume: KEYWORD_VOLUME_4 },
  ],
};

// A different domain than the target: must not get the "You" badge, and its
// null capturedVolume exercises formatCount's null branch.
const OTHER_PAGE_ROW: TopPageRow = {
  url: "https://reviews.example/best-seo-tools",
  domain: "reviews.example",
  platform: "google",
  mentions: 2,
  capturedVolume: null,
  keywords: [],
};

const QUERY_ROW: TopQueryRow = {
  question: "what is the best seo tool",
  platform: "google",
  aiSearchVolume: QUERY_VOLUME,
  firstSeenAt: "2024-01-01",
  lastSeenAt: "2024-02-01",
  citedSources: [],
  brandsMentioned: ["Acme", "Beta"],
};

function PagesTableFixture({
  intl,
  rows,
  showPlatform,
  targetDomain,
}: {
  intl: IntlShape;
  rows: TopPageRow[];
  showPlatform: boolean;
  targetDomain: string | null;
}) {
  const columns = buildTopPagesColumns({
    intl,
    showPlatform,
    targetDomain,
    projectId: "proj_1",
    brand: "example.com",
  });
  const table = useAppTable({ data: rows, columns, withSorting: true });
  return createElement(TopPagesTable, { table });
}

function QueriesTableFixture({
  intl,
  rows,
  showPlatform,
}: {
  intl: IntlShape;
  rows: TopQueryRow[];
  showPlatform: boolean;
}) {
  const columns = buildTopQueriesColumns({
    intl,
    showPlatform,
    projectId: "proj_1",
    brand: "example.com",
  });
  const table = useAppTable({ data: rows, columns, withSorting: true });
  return createElement(TopQueriesTable, { table });
}

describe("TopPagesTable", () => {
  it.each(["en", "vi"] as const)(
    "renders every pages column header, the You badge and the keyword overflow toggle in %s",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(PagesTableFixture, {
          intl,
          rows: [PAGE_ROW, OTHER_PAGE_ROW],
          showPlatform: true,
          targetDomain: "example.com",
        }),
      );

      expect(errors).toEqual([]);
      for (const id of [
        "aiCitations.table.column.source",
        "aiCitations.table.column.platform",
        "aiCitations.table.column.citedFor",
        "aiCitations.table.column.sourceVolume",
      ] as const) {
        expect(markup).toContain(catalog[id]);
      }
      // The sortable "Source vol." column's accessible name, through the
      // shared common.table.sortBy id — the exact spot the shipped id-echo
      // bug lived in a sibling component.
      expect(markup).toContain(
        `aria-label="${intl.formatMessage(
          { id: "common.table.sortBy" },
          { label: catalog["aiCitations.table.column.sourceVolume"] },
        )}"`,
      );
      // Never the raw id: an id-echo bug reads as plausible prose here too.
      expect(markup).not.toContain('aiCitations.table.column.source"');
      // Volume is locale-formatted through the active IntlShape, not through
      // platformLabels' formatCount, which hardcodes en-US.
      expect(markup).toContain(intl.formatNumber(PAGE_VOLUME));
      // Only the searched domain's own page gets the "You" badge.
      expect(markup).toContain(catalog["aiCitations.table.you"]);
      // Four keywords on PAGE_ROW: the top 3 render inline with a locale
      // number, the 4th is behind "+1 more" rather than "Show less".
      expect(markup).toContain(
        intl.formatMessage(
          { id: "aiCitations.table.keywordVolume" },
          { count: intl.formatNumber(KEYWORD_VOLUME_1) },
        ),
      );
      expect(markup).toContain(
        intl.formatMessage(
          { id: "aiCitations.table.keywordsMore" },
          { count: 1 },
        ),
      );
      expect(markup).not.toContain(
        catalog["aiCitations.table.keywordsShowLess"],
      );
      // The run-prompt tooltip reuses nav.promptExplorer for the destination
      // name so this sentence and the sidebar link can never disagree.
      const runPromptTitle = intl.formatMessage(
        { id: "aiCitations.table.runPromptTitle" },
        { promptExplorer: catalog["nav.promptExplorer"] },
      );
      expect(markup).toContain(`title="${runPromptTitle}"`);
    },
  );

  it.each(["en", "vi"] as const)(
    "names the empty result instead of rendering a blank table (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(PagesTableFixture, {
          intl,
          rows: [],
          showPlatform: false,
          targetDomain: null,
        }),
      );
      expect(errors).toEqual([]);
      expect(markup).toContain(catalog["aiCitations.table.pagesEmpty"]);
    },
  );
});

describe("TopQueriesTable", () => {
  it.each(["en", "vi"] as const)(
    "renders every queries column header, the brand list and the run-prompt affordance in %s",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(QueriesTableFixture, {
          intl,
          rows: [QUERY_ROW],
          showPlatform: true,
        }),
      );

      expect(errors).toEqual([]);
      for (const id of [
        "aiCitations.table.column.query",
        "aiCitations.table.column.platform",
        "aiCitations.table.column.aiSearchVolume",
        "aiCitations.table.column.actions",
      ] as const) {
        expect(markup).toContain(catalog[id]);
      }
      expect(markup).toContain(
        `aria-label="${intl.formatMessage(
          { id: "common.table.sortBy" },
          { label: catalog["aiCitations.table.column.aiSearchVolume"] },
        )}"`,
      );
      expect(markup).toContain(intl.formatNumber(QUERY_VOLUME));
      // The brand list is joined data (arbitrary brand names), interpolated
      // into the translated "Brands: {brands}" sentence rather than
      // translated itself.
      expect(markup).toContain(
        intl.formatMessage(
          { id: "aiCitations.table.brandsMentioned" },
          { brands: "Acme, Beta" },
        ),
      );
      const runPromptTitle = intl.formatMessage(
        { id: "aiCitations.table.runPromptTitle" },
        { promptExplorer: catalog["nav.promptExplorer"] },
      );
      expect(markup).toContain(`data-tip="${runPromptTitle}"`);
      expect(markup).toContain(`aria-label="${runPromptTitle}"`);
    },
  );

  it.each(["en", "vi"] as const)(
    "names the empty result instead of rendering a blank table (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(QueriesTableFixture, {
          intl,
          rows: [],
          showPlatform: false,
        }),
      );
      expect(errors).toEqual([]);
      expect(markup).toContain(catalog["aiCitations.table.queriesEmpty"]);
    },
  );
});
