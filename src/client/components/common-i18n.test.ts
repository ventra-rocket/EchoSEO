import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FormattedMessage, RawIntlProvider, createIntl } from "react-intl";
import { describe, expect, it } from "vitest";

import { AuthConfigErrorCard } from "./AuthConfigErrorCard";
import { NotFound } from "./NotFound";
import { TablePagination } from "./table/TablePagination";
import {
  TableBulkActionBar,
  TableExportMenu,
} from "./table/TableBulkActionBar";
import { LocationSelect } from "./LocationSelect";
import { I18nProvider } from "@/client/i18n/I18nProvider";
import { en } from "@/client/i18n/messages/en";
import { vi } from "@/client/i18n/messages/vi";

const CATALOGS = { en, vi } as const;

function renderIn(locale: keyof typeof CATALOGS, child: ReactNode) {
  const errors: string[] = [];
  const intl = createIntl({
    locale,
    messages: CATALOGS[locale],
    onError: (error) => errors.push(error.code),
  });
  const html = renderToStaticMarkup(
    createElement(RawIntlProvider, { value: intl }, child),
  );
  return { html, errors };
}

describe("shared component translations", () => {
  it.each([
    ["en", "Authentication setup required"],
    ["vi", "Cần thiết lập xác thực"],
  ] as const)(
    "renders the auth setup boundary in %s without an unknown id",
    (locale, title) => {
      const { html, errors } = renderIn(
        locale,
        createElement(AuthConfigErrorCard, {
          message: "provider failure",
          onRetry: () => {},
        }),
      );

      expect(errors).toEqual([]);
      expect(html).toContain(title);
      expect(html).toContain("AUTH_MODE");
      expect(html).toContain("TEAM_DOMAIN");
      expect(html).toContain("POLICY_AUD");
      expect(html).toContain("BETTER_AUTH_SECRET");
      expect(html).toContain("BETTER_AUTH_URL");
    },
  );

  it("translates the default not-found copy instead of translating caller content", () => {
    const defaultVietnamese = renderIn("vi", createElement(NotFound)).html;
    const callerContent = renderIn(
      "vi",
      createElement(
        NotFound,
        null,
        createElement("p", null, "caller owns this text"),
      ),
    ).html;

    expect(defaultVietnamese).toContain(vi["common.notFound.body"]);
    expect(callerContent).toContain("caller owns this text");
    expect(callerContent).not.toContain(vi["common.notFound.body"]);
  });

  it("honors a URL-owned locale during server rendering", () => {
    const html = renderToStaticMarkup(
      createElement(I18nProvider, { locale: "vi" }, createElement(NotFound)),
    );

    expect(html).toContain(vi["common.notFound.body"]);
    expect(html).not.toContain(en["common.notFound.body"]);
  });

  it.each([
    {
      locale: "en" as const,
      range: "26–50 of 1,234",
      page: "Page 2 of 50",
      rows: "Rows per page",
    },
    {
      locale: "vi" as const,
      range: "26–50/1.234",
      page: "Trang 2/50",
      rows: "Số hàng mỗi trang",
    },
  ])("formats pagination numbers and copy in $locale", (expected) => {
    const { html, errors } = renderIn(
      expected.locale,
      createElement(TablePagination, {
        page: 2,
        pageSize: 25,
        pageSizes: [25, 50],
        totalCount: 1234,
        hasNextPage: true,
        isLoading: false,
        onPageChange: () => {},
        onPageSizeChange: () => {},
      }),
    );

    expect(errors).toEqual([]);
    expect(html).toContain(expected.range);
    expect(html).toContain(expected.page);
    expect(html).toContain(expected.rows);
  });

  it.each([
    { locale: "en" as const, count: "1,234", selected: "selected" },
    { locale: "vi" as const, count: "1.234", selected: "đã chọn" },
  ])("localizes shared table defaults in $locale", (expected) => {
    const bulk = renderIn(
      expected.locale,
      createElement(TableBulkActionBar, {
        selectedCount: 1234,
        onClear: () => {},
        actions: null,
        placement: "inline",
      }),
    );
    const exportMenu = renderIn(
      expected.locale,
      createElement(TableExportMenu, { actions: [] }),
    );

    expect(bulk.errors).toEqual([]);
    expect(bulk.html).toContain(expected.count);
    expect(bulk.html).toContain(expected.selected);
    expect(exportMenu.html).toContain(
      CATALOGS[expected.locale]["common.table.export"],
    );
  });

  it.each([
    { locale: "en" as const, country: "United States" },
    { locale: "vi" as const, country: "Hoa Kỳ" },
  ])("localizes region names in $locale", (expected) => {
    const { html, errors } = renderIn(
      expected.locale,
      createElement(LocationSelect, {
        value: 2840,
        onChange: () => {},
      }),
    );

    expect(errors).toEqual([]);
    expect(html).toContain(expected.country);
  });

  it.each([
    { locale: "en" as const, copy: "Copied 1,234 rows to your clipboard" },
    { locale: "vi" as const, copy: "Đã sao chép 1.234 hàng vào bộ nhớ tạm" },
  ])("formats sheet row counts in $locale", (expected) => {
    const { html, errors } = renderIn(
      expected.locale,
      createElement(FormattedMessage, {
        id: "common.sheets.copied",
        values: { rowCount: 1234 },
      }),
    );

    expect(errors).toEqual([]);
    expect(html).toContain(expected.copy);
  });
});
