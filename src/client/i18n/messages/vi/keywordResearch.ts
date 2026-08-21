import type { keywordResearch as en } from "../en/keywordResearch";

// Keyword Research page: search bar, filters, results tables, pagination, empty and loading states.
export const keywordResearch: Record<keyof typeof en, string> = {
  // Page shell (KeywordResearchPage.tsx)
  "keywordResearch.page.title": "Nghiên cứu từ khóa",
  "keywordResearch.page.subtitle":
    "Khám phá ý tưởng từ khóa, nhu cầu tìm kiếm và cơ hội xếp hạng.",
  "keywordResearch.page.recentSearches": "Tìm kiếm gần đây",
  "keywordResearch.page.error.goToBilling": "Đến trang Thanh toán",
  "keywordResearch.page.saveDialog.title":
    "Lưu {count, plural, other {# từ khóa}}",
  "keywordResearch.page.saveDialog.body":
    "Các từ khóa này sẽ được lưu vào dự án hiện tại của bạn.",
  "keywordResearch.page.saveDialog.cancel": "Hủy",
  "keywordResearch.page.saveDialog.confirm": "Lưu",

  // Search bar (KeywordResearchSearchBar.tsx)
  "keywordResearch.searchBar.keywordPlaceholder":
    "Nhập từ khóa, mỗi dòng một từ",
  "keywordResearch.searchBar.resultLimitOption":
    "{count, plural, other {# kết quả}}",
  "keywordResearch.searchBar.submit": "Tìm kiếm",
  "keywordResearch.searchBar.clickstreamLabel":
    "Lượng tìm kiếm tinh chỉnh theo clickstream",
  "keywordResearch.searchBar.clickstreamTooltip":
    "Google gộp chung một lượng tìm kiếm cho các từ khóa tương tự (vd: 'seo tool' và 'seo tools'). Bật tùy chọn này để ước tính lượng tìm kiếm riêng cho từng từ khóa. Tốn gấp 2 lần tín dụng.",
  "keywordResearch.searchBar.googleAdsNotice":
    "Dữ liệu từ khóa cho quốc gia này lấy từ Google Ads — có lượng tìm kiếm, CPC và xu hướng, nhưng không có độ khó và ý định tìm kiếm.",

  // Search mode (KeywordResearchSearchBar.tsx select) — the same source labels
  // back KeywordResearchDesktopResults' "Source: {source} fallback." note, since
  // both read the same KeywordSource/ResearchSource union.
  "keywordResearch.mode.auto": "Tự động",
  "keywordResearch.mode.related": "Từ khóa liên quan",
  "keywordResearch.mode.suggestions": "Gợi ý",
  "keywordResearch.mode.ideas": "Ý tưởng",
  "keywordResearch.mode.googleAds": "Google Ads",

  // Filter primitives shared by the desktop filter panel and the results table's
  // empty-after-filtering state (keywordResearchDesktopFilters.tsx).
  "keywordResearch.filters.min": "Tối thiểu",
  "keywordResearch.filters.max": "Tối đa",
  "keywordResearch.filters.emptyResults":
    "Không có từ khóa nào khớp với bộ lọc hiện tại của bạn.",
  "keywordResearch.filters.clearFilters": "Xóa bộ lọc",

  // Results table columns (KeywordResearchDesktopTable.tsx) — shared by the
  // desktop and mobile presentations, which render the same table component.
  "keywordResearch.table.column.keyword": "Từ khóa",
  "keywordResearch.table.column.volume": "Lượng tìm kiếm",
  "keywordResearch.table.column.cpc": "CPC",
  "keywordResearch.table.column.cpcHelp":
    "Chi phí mỗi lượt nhấp tính bằng USD.",
  "keywordResearch.table.column.competition": "Cạnh tranh",
  "keywordResearch.table.column.competitionHelp":
    "Mức độ cạnh tranh quảng cáo tìm kiếm trả phí từ Google Ads (0-1): giá trị càng cao nghĩa là càng nhiều nhà quảng cáo đặt giá thầu.",
  "keywordResearch.table.column.difficulty": "Điểm",
  "keywordResearch.table.column.difficultyHelp":
    "Độ khó xếp hạng tự nhiên (0-100): giá trị càng cao thì càng khó lọt vào top 10 của Google.",
  "keywordResearch.table.column.intent": "Ý định",

  // Results — identical text in both the desktop and mobile presentations
  // (KeywordResearchDesktopResults.tsx / KeywordResearchMobileResults.tsx).
  "keywordResearch.results.serpHeading": "Phân tích SERP",
  "keywordResearch.results.refineResults": "Tinh chỉnh kết quả bảng",
  "keywordResearch.results.exportCsv": "Xuất CSV",
  "keywordResearch.results.filtersButton": "Bộ lọc",

  // Desktop results (KeywordResearchDesktopResults.tsx)
  "keywordResearch.desktopResults.trendHeading": "Xu hướng tìm kiếm",
  "keywordResearch.desktopResults.trendRangeDefault":
    "12 tháng gần nhất có dữ liệu",
  "keywordResearch.desktopResults.trendRange": "{start} - {end}",
  "keywordResearch.desktopResults.approximateMatch":
    'Không có kết quả khớp chính xác cho "<b>{keyword}</b>". Đang hiển thị các từ khóa liên quan gần nhất thay vào đó.',
  "keywordResearch.desktopResults.approximateMatchSource":
    " Nguồn thay thế: {source}.",
  "keywordResearch.desktopResults.toggleFiltersTitle": "Bật/tắt bộ lọc bảng",
  "keywordResearch.desktopResults.selectedOfTotal":
    "Đã chọn {selected, number}/{total, number}",
  "keywordResearch.desktopResults.filteredOfTotal":
    "Đang hiển thị {filtered, number}/{total, plural, other {# từ khóa}}",
  "keywordResearch.desktopResults.filteredCount":
    "Đang hiển thị {count, plural, other {# từ khóa}}",
  "keywordResearch.desktopResults.saveKeywords": "Lưu từ khóa",
  "keywordResearch.desktopResults.filters.activeCount":
    "{count, number} đang áp dụng",
  "keywordResearch.desktopResults.filters.clearAll": "Xóa tất cả",
  "keywordResearch.desktopResults.filters.includeLabel": "Bao gồm từ",
  "keywordResearch.desktopResults.filters.includePlaceholder":
    "audit, checker, template",
  "keywordResearch.desktopResults.filters.excludeLabel": "Loại trừ từ",
  "keywordResearch.desktopResults.filters.excludePlaceholder":
    "jobs, salary, course",
  "keywordResearch.desktopResults.filters.searchVolume": "Lượng tìm kiếm",
  "keywordResearch.desktopResults.filters.cpcUsd": "CPC (USD)",
  "keywordResearch.desktopResults.filters.difficulty": "Độ khó",

  // Mobile results (KeywordResearchMobileResults.tsx)
  "keywordResearch.mobileResults.tabKeywords": "Từ khóa ({count, number})",
  "keywordResearch.mobileResults.approximateMatch":
    'Không có kết quả khớp chính xác cho "<b>{keyword}</b>". Đang hiển thị các từ khóa liên quan gần nhất.',
  "keywordResearch.mobileResults.saveButton": "Lưu",
  "keywordResearch.mobileResults.selectedCount": "{count, number} đã chọn",
  "keywordResearch.mobileResults.filteredOfTotal":
    "Đang hiển thị {filtered, number}/{total, number}",
  "keywordResearch.mobileResults.filteredCount":
    "Đang hiển thị {count, plural, other {# từ khóa}}",
  "keywordResearch.mobileResults.clear": "Xóa",
  "keywordResearch.mobileResults.includePlaceholder":
    "Bao gồm từ (audit, checker)",
  "keywordResearch.mobileResults.excludePlaceholder":
    "Loại trừ từ (jobs, course)",
  "keywordResearch.mobileResults.minVolume": "Lượng tìm kiếm tối thiểu",
  "keywordResearch.mobileResults.maxVolume": "Lượng tìm kiếm tối đa",
  "keywordResearch.mobileResults.minCpc": "CPC tối thiểu",
  "keywordResearch.mobileResults.maxCpc": "CPC tối đa",
  "keywordResearch.mobileResults.minDifficulty": "Độ khó tối thiểu",
  "keywordResearch.mobileResults.maxDifficulty": "Độ khó tối đa",

  // Empty state (KeywordResearchEmptyState.tsx)
  "keywordResearch.emptyState.noResults.heading":
    "Chưa đủ dữ liệu từ khóa cho truy vấn này",
  "keywordResearch.emptyState.noResults.body":
    'Chúng tôi không tìm thấy cơ hội từ khóa nào cho "<b>{keyword}</b>" tại <b>{location}</b>.',
  "keywordResearch.emptyState.noResults.unknownLocation": "khu vực này",
  "keywordResearch.emptyState.history.recentSearches":
    "{count, plural, other {# tìm kiếm gần đây}}",
  "keywordResearch.emptyState.history.removeSearch":
    "Xóa tìm kiếm gần đây cho {keyword}",
  "keywordResearch.emptyState.history.getStarted":
    "Nhập một từ khóa để bắt đầu",
  "keywordResearch.emptyState.history.getStartedBody":
    "Tìm kiếm bất kỳ từ khóa nào để xem lượng tìm kiếm, độ khó, CPC và các ý tưởng từ khóa liên quan.",
};
