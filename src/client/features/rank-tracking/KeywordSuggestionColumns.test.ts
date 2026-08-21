import { Fragment, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { RawIntlProvider, createIntl, useIntl } from "react-intl";
import { describe, expect, it } from "vitest";

import {
  buildKeywordSuggestionColumns,
  type SuggestedKeyword,
} from "./KeywordSuggestionColumns";
import { en } from "@/client/i18n/messages/en";
import { vi } from "@/client/i18n/messages/vi";

/**
 * Why this asserts on errors and not on text.
 *
 * These four headers each passed `intl.formatMessage(...)` into a prop that
 * takes a message **id**. react-intl looked the resulting sentence up as an id,
 * found nothing, and rendered its fallback — which echoes the id back. The id
 * was the finished translation, so the rendered tooltip was *correct in both
 * locales* while every render threw `MissingTranslationError` four times.
 *
 * A test that reads the tooltip text therefore passes against the bug. The only
 * observable difference is the error, so that is what this pins: rendering a
 * converted header must not ask the catalog for anything the catalog lacks.
 */
const CATALOGS = { en, vi } as const;

function HeaderHarness() {
  const intl = useIntl();
  const table = useReactTable({
    data: [],
    columns: buildKeywordSuggestionColumns(intl),
    getCoreRowModel: getCoreRowModel(),
  });

  return createElement(
    Fragment,
    null,
    table
      .getFlatHeaders()
      .map((header) =>
        createElement(
          Fragment,
          { key: header.id },
          flexRender(header.column.columnDef.header, header.getContext()),
        ),
      ),
  );
}

function renderHeaders(locale: keyof typeof CATALOGS): {
  errors: string[];
  titles: string[];
} {
  const errors: string[] = [];
  const intl = createIntl({
    locale,
    messages: CATALOGS[locale],
    onError: (error) => errors.push(error.code),
  });

  const markup = renderToStaticMarkup(
    createElement(
      RawIntlProvider,
      { value: intl },
      createElement(HeaderHarness),
    ),
  );
  const titles = [...markup.matchAll(/title="([^"]*)"/g)].map(
    (match) => match[1],
  );

  return { errors, titles };
}

describe("buildKeywordSuggestionColumns", () => {
  it.each(["en", "vi"] as const)(
    "renders every header in %s without asking for a missing id",
    (locale) => {
      const { errors, titles } = renderHeaders(locale);

      expect(errors).toEqual([]);
      expect(titles).toHaveLength(4);
      // A tooltip is the point of the prop; an empty one means the id resolved
      // to nothing and the column silently lost its explanation.
      for (const title of titles) expect(title).not.toBe("");
    },
  );

  it("localises the tooltips rather than shipping one language twice", () => {
    const { titles: english } = renderHeaders("en");
    const { titles: vietnamese } = renderHeaders("vi");

    expect(vietnamese).not.toEqual(english);
    expect(vietnamese).toEqual([
      vi["rank.config.keywordSuggestions.column.keywordTooltip"],
      vi["rank.config.keywordSuggestions.column.positionTooltip"],
      vi["rank.config.keywordSuggestions.column.volumeTooltip"],
      vi["rank.config.keywordSuggestions.column.trafficTooltip"],
    ]);
  });
});

describe("suggested keyword rows", () => {
  it("keeps the row shape the columns read", () => {
    const row: SuggestedKeyword = {
      keyword: "seo audit tool",
      position: null,
      searchVolume: null,
      traffic: null,
    };
    const ids = buildKeywordSuggestionColumns(
      createIntl({ locale: "en", messages: en }),
    ).map((col) => col.id);

    expect(ids).toEqual(["keyword", "position", "searchVolume", "traffic"]);
    expect(Object.keys(row).toSorted()).toEqual([
      "keyword",
      "position",
      "searchVolume",
      "traffic",
    ]);
  });
});
