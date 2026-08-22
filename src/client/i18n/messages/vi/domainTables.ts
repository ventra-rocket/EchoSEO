import type { domainTables as en } from "../en/domainTables";

// Domain Overview tables: keyword and page tabs, sortable headers, difficulty badges, filter panel and pagination. See en/domainTables.ts for scope.
export const domainTables: Record<keyof typeof en, string> = {
  "domainTables.toolbar.toggleFiltersTitle": "Bật/tắt bộ lọc bảng",
  "domainTables.toolbar.filtersLabel": "Bộ lọc",

  "domainTables.filterPanel.title": "Tinh chỉnh kết quả bảng",
  "domainTables.filterPanel.activeCount": "{count, number} đang áp dụng",
  "domainTables.filterPanel.unappliedCount": "{count, number} chưa áp dụng",
  "domainTables.filterPanel.clearAll": "Xóa hết",
  "domainTables.filterPanel.min": "Tối thiểu",
  "domainTables.filterPanel.max": "Tối đa",
  "domainTables.filterPanel.overLimit":
    "Có quá nhiều điều kiện lọc ({count, number}/{max, number} tối đa). Hãy bớt một số cụm từ hoặc khoảng giá trị trước khi áp dụng.",
  "domainTables.filterPanel.conditionCount":
    "{count, number} / {max, number} điều kiện",
  "domainTables.filterPanel.cancel": "Hủy",
  "domainTables.filterPanel.apply": "Áp dụng bộ lọc",
  "domainTables.filterPanel.applyDisabledTitle":
    "DataForSEO chỉ chấp nhận tối đa {max, number} điều kiện lọc cho mỗi yêu cầu",

  "domainTables.export.copyJson": "Sao chép dữ liệu (JSON)",
  "domainTables.export.downloadCsv": "Tải CSV",
  "domainTables.export.downloadExcel": "Tải Excel",
  "domainTables.export.copiedToast": "Đã sao chép dữ liệu",

  "domainTables.pagination.rangeNoTotal": "{start, number}–{end, number}",

  "domainTables.keywords.resultCount": "{count, plural, other {# từ khóa}}",
  "domainTables.keywords.bulk.save": "Lưu từ khóa",
  "domainTables.keywords.selectionHint": "Chọn từ khóa để lưu",
  "domainTables.keywords.column.keyword": "Từ khóa",
  "domainTables.keywords.column.rank": "Thứ hạng",
  "domainTables.keywords.column.volume": "Lượng tìm kiếm",
  "domainTables.keywords.column.traffic": "Lưu lượng truy cập",
  "domainTables.keywords.column.cpc": "CPC",
  "domainTables.keywords.column.cpcTooltip":
    "Chi phí mỗi lượt nhấp, tính bằng USD.",
  "domainTables.keywords.column.url": "URL",
  "domainTables.keywords.column.score": "Điểm",
  "domainTables.keywords.column.scoreTooltip":
    "Độ khó xếp hạng tự nhiên (0-100): điểm càng cao thì càng khó vào top 10 của Google.",
  "domainTables.keywords.empty": "Không có từ khóa nào khớp với tìm kiếm này.",
  "domainTables.keywords.filter.includeLabel": "Bao gồm cụm từ",
  "domainTables.keywords.filter.includePlaceholder": "audit, kiểm tra, mẫu",
  "domainTables.keywords.filter.excludeLabel": "Loại trừ cụm từ",
  "domainTables.keywords.filter.excludePlaceholder":
    "việc làm, lương, khóa học",
  "domainTables.keywords.filter.trafficTitle": "Lưu lượng truy cập",
  "domainTables.keywords.filter.volumeTitle": "Lượng tìm kiếm",
  "domainTables.keywords.filter.cpcTitle": "CPC (USD)",
  "domainTables.keywords.filter.scoreTitle": "Điểm (KD)",
  "domainTables.keywords.filter.rankTitle": "Thứ hạng",

  "domainTables.pages.resultCount": "{count, plural, other {# trang}}",
  "domainTables.pages.column.page": "Trang",
  "domainTables.pages.column.organicTraffic": "Lưu lượng tự nhiên",
  "domainTables.pages.column.keywords": "Từ khóa",
  "domainTables.pages.empty": "Không có trang nào khớp với tìm kiếm này.",
  "domainTables.pages.filter.includeLabel": "Bao gồm cụm từ trang",
  "domainTables.pages.filter.includePlaceholder":
    "bảng giá, công cụ, hướng dẫn",
  "domainTables.pages.filter.excludeLabel": "Loại trừ cụm từ trang",
  "domainTables.pages.filter.excludePlaceholder": "blog, thẻ, lưu trữ",
  "domainTables.pages.filter.trafficTitle": "Lưu lượng truy cập",
  "domainTables.pages.filter.keywordsTitle": "Từ khóa",
};
