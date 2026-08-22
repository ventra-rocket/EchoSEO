import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";
import { BacklinksTable } from "./BacklinksTable";
import { ReferringDomainsTable } from "./ReferringDomainsTable";
import { TopPagesTable } from "./TopPagesTable";
import { EmptyTableState } from "./BacklinksPageEmptyTableState";
import {
  BacklinksActionsMenu,
  BacklinksExportMenu,
} from "./BacklinksToolbarMenus";
import { BacklinksFilterPanel } from "./BacklinksFilterPanel";
import {
  EMPTY_BACKLINKS_FILTERS,
  EMPTY_REFERRING_DOMAINS_FILTERS,
  EMPTY_TOP_PAGES_FILTERS,
  countActiveFilters,
} from "./backlinksFilterTypes";
import type {
  BacklinksRow,
  ReferringDomainRow,
  TopPageRow,
} from "./backlinksPageTypes";
import type { BacklinksFiltersState } from "./useBacklinksFilters";
import type { BacklinksDomainExpansion } from "./useBacklinksDomainExpansion";
import { MESSAGES } from "@/client/i18n/messages";
import type { Locale } from "@/client/i18n/config";

// Renders through the real IntlProvider + real catalogs, matching
// BacklinksPageStates.test.ts / DomainHistorySection.test.ts: these three
// tables, the toolbar menus, and the filter panel take fixture props and do
// no fetching of their own, so — unlike the overview surface — they render
// fully without a DataForSEO key. `assertNoRawIds` catches the exact failure
// mode a MissingTranslationError produces: react-intl echoing the id back
// instead of throwing, which looks translated at a glance.
function renderWithIntl(node: ReactNode, locale: Locale = "vi"): string {
  return renderToStaticMarkup(
    createElement(IntlProvider, { locale, messages: MESSAGES[locale] }, node),
  );
}

function assertNoRawIds(html: string) {
  expect(html).not.toMatch(
    /backlinksTables\.|common\.table\.|common\.sheets\.|saved\.table\./,
  );
}

function makeBacklinkRow(overrides: Partial<BacklinksRow> = {}): BacklinksRow {
  return {
    domainFrom: "example.org",
    urlFrom: "https://example.org/post",
    urlTo: "https://example.com/path",
    anchor: "Example",
    itemType: "organic",
    isDofollow: true,
    relAttributes: ["noopener", "noreferrer"],
    rank: 123,
    domainFromRank: 45,
    pageFromRank: 12,
    spamScore: 10,
    firstSeen: "2025-01-01",
    lastSeen: "2025-01-15",
    isLost: false,
    isBroken: false,
    linksCount: 2,
    ...overrides,
  };
}

function makeReferringDomainRow(
  overrides: Partial<ReferringDomainRow> = {},
): ReferringDomainRow {
  return {
    domain: "source.com",
    backlinks: 12,
    referringPages: 7,
    rank: 101,
    spamScore: 4,
    firstSeen: "2024-05-10",
    brokenBacklinks: 1,
    brokenPages: 0,
    ...overrides,
  };
}

function makeTopPageRow(overrides: Partial<TopPageRow> = {}): TopPageRow {
  return {
    page: "https://docs.example.com/start",
    backlinks: 22,
    referringDomains: 9,
    rank: 88,
    brokenBacklinks: 0,
    ...overrides,
  };
}

function makeExpansion(
  overrides: Partial<BacklinksDomainExpansion> = {},
): BacklinksDomainExpansion {
  return {
    expandedDomains: new Set(),
    entriesByDomain: {},
    toggleDomain: () => {},
    ...overrides,
  };
}

function makeFiltersState(): BacklinksFiltersState {
  const backlinksValues = { ...EMPTY_BACKLINKS_FILTERS };
  const domainsValues = { ...EMPTY_REFERRING_DOMAINS_FILTERS };
  const pagesValues = { ...EMPTY_TOP_PAGES_FILTERS };
  return {
    backlinks: {
      values: backlinksValues,
      apply: () => {},
      reset: () => {},
      activeFilterCount: countActiveFilters(backlinksValues),
    },
    domains: {
      values: domainsValues,
      apply: () => {},
      reset: () => {},
      activeFilterCount: countActiveFilters(domainsValues),
    },
    pages: {
      values: pagesValues,
      apply: () => {},
      reset: () => {},
      activeFilterCount: countActiveFilters(pagesValues),
    },
    showFilters: true,
    setShowFilters: () => {},
  };
}

describe("EmptyTableState", () => {
  it("renders a table-specific empty message in Vietnamese", () => {
    const html = renderWithIntl(
      createElement(EmptyTableState, {
        labelId: "backlinksTables.empty.backlinks",
      }),
    );
    expect(html).toContain("Không có backlink nào khớp với bộ lọc này.");
    assertNoRawIds(html);
  });
});

describe("BacklinksTable", () => {
  it("renders the empty state in Vietnamese with no rows", () => {
    const html = renderWithIntl(
      createElement(BacklinksTable, {
        rows: [],
        domainRatings: null,
        sorting: [],
        onSortingChange: () => {},
        expansion: null,
      }),
    );
    expect(html).toContain("Không có backlink nào khớp với bộ lọc này.");
    assertNoRawIds(html);
  });

  it("renders columns, flags and the collapsed row-expansion affordance in Vietnamese", () => {
    const html = renderWithIntl(
      createElement(BacklinksTable, {
        rows: [
          makeBacklinkRow({
            isLost: true,
            isBroken: true,
            isDofollow: false,
            anchor: "",
          }),
        ],
        domainRatings: { "example.org": 62 },
        sorting: [],
        onSortingChange: () => {},
        expansion: makeExpansion(),
      }),
    );
    expect(html).toContain("Nguồn"); // Source
    expect(html).toContain("Mục tiêu"); // Target
    expect(html).toContain("Anchor");
    expect(html).toContain("Không có anchor text"); // No anchor text fallback
    expect(html).toContain("Cờ đánh dấu"); // Flags column
    expect(html).toContain("Đã mất"); // Lost badge
    expect(html).toContain("Bị hỏng"); // Broken badge
    expect(html).toContain("Nofollow"); // kept untranslated
    expect(html).toContain("2 liên kết"); // linksCount plural badge
    expect(html).toContain("Liên kết"); // Link column
    expect(html).toContain("Ahrefs DR"); // kept untranslated, shown via domainRatings
    expect(html).toContain("Gần nhất"); // "Last {date}" prefix
    expect(html).toContain('aria-label="Hiện tất cả liên kết từ example.org"');
    assertNoRawIds(html);
  });

  it("renders the loading status row for an expanded domain in Vietnamese", () => {
    const html = renderWithIntl(
      createElement(BacklinksTable, {
        rows: [makeBacklinkRow({ domainFrom: "example.org" })],
        domainRatings: null,
        sorting: [],
        onSortingChange: () => {},
        expansion: makeExpansion({
          expandedDomains: new Set(["example.org"]),
          entriesByDomain: { "example.org": { status: "loading" } },
        }),
      }),
    );
    expect(html).toContain("Đang tải liên kết…"); // Loading links…
    expect(html).toContain('aria-label="Ẩn tất cả liên kết từ example.org"');
    assertNoRawIds(html);
  });

  it("renders the same columns and flags in English with no raw ids", () => {
    const html = renderWithIntl(
      createElement(BacklinksTable, {
        rows: [makeBacklinkRow({ isLost: true, linksCount: 2 })],
        domainRatings: { "example.org": 62 },
        sorting: [],
        onSortingChange: () => {},
        expansion: makeExpansion(),
      }),
      "en",
    );
    expect(html).toContain("Source");
    expect(html).toContain("Lost");
    expect(html).toContain("2 links");
    expect(html).toContain("Ahrefs DR");
    expect(html).toContain('aria-label="Show all links from example.org"');
    assertNoRawIds(html);
  });
});

describe("ReferringDomainsTable", () => {
  it("renders the empty state in Vietnamese with no rows", () => {
    const html = renderWithIntl(
      createElement(ReferringDomainsTable, {
        rows: [],
        domainRatings: null,
        sorting: [],
        onSortingChange: () => {},
      }),
    );
    expect(html).toContain("Không có tên miền trỏ về nào khớp với bộ lọc này.");
    assertNoRawIds(html);
  });

  it("renders columns and the broken-links summary in Vietnamese", () => {
    const html = renderWithIntl(
      createElement(ReferringDomainsTable, {
        rows: [makeReferringDomainRow()],
        domainRatings: { "source.com": 55 },
        sorting: [],
        onSortingChange: () => {},
      }),
    );
    expect(html).toContain("Tên miền"); // Domain
    expect(html).toContain("Liên kết trỏ về"); // Backlinks (shared metric)
    expect(html).toContain("Trang trỏ về"); // Referring Pages
    expect(html).toContain("Xếp hạng"); // Rank
    expect(html).toContain("Spam"); // Spam
    expect(html).toContain("Lần đầu phát hiện"); // First Seen
    expect(html).toContain("Vấn đề"); // Issues
    expect(html).toContain("Liên kết hỏng: 1"); // Broken links: {count}
    expect(html).toContain("Trang hỏng: 0"); // Broken pages: {count}
    expect(html).toContain("Ahrefs DR");
    assertNoRawIds(html);
  });
});

describe("TopPagesTable", () => {
  it("renders the empty state in Vietnamese with no rows", () => {
    const html = renderWithIntl(
      createElement(TopPagesTable, {
        rows: [],
        sorting: [],
        onSortingChange: () => {},
      }),
    );
    expect(html).toContain("Không có trang hàng đầu nào khớp với bộ lọc này.");
    assertNoRawIds(html);
  });

  it("renders every column header in Vietnamese", () => {
    const html = renderWithIntl(
      createElement(TopPagesTable, {
        rows: [makeTopPageRow()],
        sorting: [],
        onSortingChange: () => {},
      }),
    );
    expect(html).toContain("Trang"); // Page
    expect(html).toContain("Liên kết trỏ về"); // Backlinks
    expect(html).toContain("Tên miền trỏ về"); // Referring Domains
    expect(html).toContain("Xếp hạng"); // Rank
    expect(html).toContain("Backlink hỏng"); // Broken Backlinks
    assertNoRawIds(html);
  });
});

describe("BacklinksExportMenu", () => {
  it("renders the export trigger and menu items in Vietnamese", () => {
    const html = renderWithIntl(
      createElement(BacklinksExportMenu, {
        activeTab: "backlinks",
        exportTarget: "example.com",
        headers: ["Domain"],
        rows: [["example.org"]],
      }),
    );
    expect(html).toContain('aria-label="Xuất bảng backlink"');
    expect(html).toContain("Xuất");
    expect(html).toContain("Xuất sang Sheets");
    expect(html).toContain("Xuất CSV");
    assertNoRawIds(html);
  });
});

describe("BacklinksActionsMenu", () => {
  it("renders the actions trigger and Ahrefs DR item in Vietnamese", () => {
    const html = renderWithIntl(
      createElement(BacklinksActionsMenu, {
        isLoadingRatings: false,
        loadRatings: () => {},
        ratableDomains: ["example.org"],
      }),
    );
    expect(html).toContain('aria-label="Thao tác bảng backlink"');
    expect(html).toContain('title="Thao tác bảng backlink"');
    expect(html).toContain(
      'title="Tra cứu Ahrefs Domain Rating cho từng tên miền trong bảng"',
    );
    expect(html).toContain("Ahrefs DR");
    assertNoRawIds(html);
  });
});

describe("BacklinksFilterPanel", () => {
  it("renders backlinks-tab labels, placeholders and toggle controls in Vietnamese", () => {
    const html = renderWithIntl(
      createElement(BacklinksFilterPanel, {
        activeTab: "backlinks",
        filters: makeFiltersState(),
        onApplied: () => {},
      }),
    );
    expect(html).toContain("URL nguồn chứa"); // Source URL Contains
    expect(html).toContain("URL nguồn không chứa"); // Source URL Excludes
    expect(html).toContain("Độ uy tín tên miền"); // Domain Authority
    expect(html).toContain("Độ uy tín liên kết"); // Link Authority
    expect(html).toContain("Điểm Spam"); // Spam Score
    expect(html).toContain("Loại liên kết"); // Link Type
    expect(html).toContain("Tất cả"); // All
    expect(html).toContain("Dofollow");
    expect(html).toContain("Hiển thị"); // Visibility
    expect(html).toContain("Ẩn liên kết đã mất"); // Hide lost
    expect(html).toContain("Ẩn liên kết hỏng"); // Hide broken
    assertNoRawIds(html);
  });

  it("renders domains-tab labels in Vietnamese", () => {
    const html = renderWithIntl(
      createElement(BacklinksFilterPanel, {
        activeTab: "domains",
        filters: makeFiltersState(),
        onApplied: () => {},
      }),
    );
    expect(html).toContain("Tên miền chứa"); // Domain Contains
    expect(html).toContain("Tên miền không chứa"); // Domain Excludes
    expect(html).toContain("Liên kết trỏ về"); // Backlinks range title
    expect(html).toContain("Xếp hạng"); // Rank range title
    assertNoRawIds(html);
  });

  it("renders pages-tab labels in Vietnamese", () => {
    const html = renderWithIntl(
      createElement(BacklinksFilterPanel, {
        activeTab: "pages",
        filters: makeFiltersState(),
        onApplied: () => {},
      }),
    );
    expect(html).toContain("URL trang chứa"); // Page URL Contains
    expect(html).toContain("URL trang không chứa"); // Page URL Excludes
    expect(html).toContain("Tên miền trỏ về"); // Referring Domains range title
    assertNoRawIds(html);
  });
});
