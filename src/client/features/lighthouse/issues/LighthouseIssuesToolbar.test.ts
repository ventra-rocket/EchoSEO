import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";
import { LighthouseIssuesToolbar } from "./LighthouseIssuesParts";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { CategoryTab } from "./types";

// Split from LighthouseIssuesParts.test.ts (Header + IssueList) to stay
// under the 400-line max-lines ceiling; the harness is duplicated because
// every intl test file in this repo carries its own. Covers the category
// tabs and the export dropdown (LighthouseIssuesExportMenu.tsx) together,
// since LighthouseIssuesToolbar is exactly their composition.

const CATALOGS = { en, vi: viMessages } as const;

function renderWithIntl(
  locale: keyof typeof CATALOGS,
  node: ReactNode,
): string {
  const intl = createIntl({ locale, messages: CATALOGS[locale] });
  return renderToStaticMarkup(
    createElement(RawIntlProvider, { value: intl }, node),
  );
}

const CATEGORY_COUNTS: Record<CategoryTab, number> = {
  all: 12,
  performance: 5,
  accessibility: 3,
  "best-practices": 2,
  seo: 2,
};

function toolbar(selectedCategoryLabel: string) {
  return createElement(LighthouseIssuesToolbar, {
    category: "performance",
    categoryCounts: CATEGORY_COUNTS,
    selectedCategoryLabel,
    isBusy: false,
    visibleIssues: [],
    allIssues: [],
    onCategoryChange: () => {},
    onCopy: () => {},
    onExport: () => {},
    onExportCsv: () => {},
    onExportSheets: () => {},
  });
}

describe("LighthouseIssuesToolbar", () => {
  it("renders translated category tabs, counts and the export menu in English", () => {
    // The caller (LighthouseIssuesScreen.tsx) resolves this once via
    // categoryLabel(intl, category) and threads it down — passed directly
    // here rather than re-deriving it, matching that real call shape.
    const markup = renderWithIntl("en", toolbar("Performance"));

    expect(markup).toContain("All");
    expect(markup).toContain("Performance");
    expect(markup).toContain("Accessibility");
    expect(markup).toContain("Best Practices");
    expect(markup).toContain("SEO");
    expect(markup).toContain("(12)");
    expect(markup).toContain("(5)");
    expect(markup).toContain("Export");
    expect(markup).toContain("Export to Sheets");
    expect(markup).toContain("Open in Sheets — Performance");
    expect(markup).toContain("Open in Sheets — all actionable");
    expect(markup).toContain("Copy Performance issues");
    expect(markup).toContain("Copy all actionable issues");
    expect(markup).toContain("Copy saved Lighthouse payload");
    expect(markup).toContain("Download JSON");
    expect(markup).toContain("Download CSV");
    // Reused id: identical text renders once in the JSON section and once in
    // the CSV section, so this string appears twice in the markup.
    expect(markup.match(/Download Performance issues/g)).toHaveLength(2);
    expect(markup.match(/Download all actionable issues/g)).toHaveLength(2);
    expect(markup).toContain("Download saved Lighthouse payload");
  });

  it("renders translated category tabs, counts and the export menu in Vietnamese", () => {
    const markup = renderWithIntl("vi", toolbar("Hiệu suất"));

    expect(markup).toContain("Tất cả");
    expect(markup).toContain("Hiệu suất");
    expect(markup).toContain("Khả năng truy cập");
    expect(markup).toContain("Thực hành tốt nhất");
    expect(markup).toContain("SEO");
    expect(markup).toContain("(12)");
    expect(markup).toContain("Xuất");
    expect(markup).toContain("Xuất ra Sheets");
    expect(markup).toContain("Mở trong Sheets — Hiệu suất");
    expect(markup).toContain("Mở trong Sheets — tất cả vấn đề cần xử lý");
    expect(markup).toContain("Sao chép vấn đề Hiệu suất");
    expect(markup).toContain("Sao chép tất cả vấn đề cần xử lý");
    expect(markup).toContain("Sao chép dữ liệu Lighthouse đã lưu");
    expect(markup).toContain("Tải xuống JSON");
    expect(markup).toContain("Tải xuống CSV");
    expect(markup.match(/Tải xuống vấn đề Hiệu suất/g)).toHaveLength(2);
    expect(markup).toContain("Tải xuống dữ liệu Lighthouse đã lưu");
    expect(markup).not.toContain("Copy");
    expect(markup).not.toContain("Download");
  });
});
