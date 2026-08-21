import type { savedTable as en } from "../en/savedTable";

// Saved Keywords: table, filter panel, pagination, status line, bulk action bar, tag filter.
export const savedTable: Record<keyof typeof en, string> = {
  // Table columns
  "saved.table.column.keyword": "Từ khóa",
  "saved.table.column.volume": "Lượng tìm kiếm",
  "saved.table.column.cpc": "CPC",
  "saved.table.column.competition": "Cạnh tranh",
  "saved.table.column.difficulty": "Độ khó",
  "saved.table.column.intent": "Ý định",
  "saved.table.column.tags": "Thẻ",
  "saved.table.column.lastFetched": "Lần lấy gần nhất",
  "saved.table.tooltip.competition":
    "Mức độ cạnh tranh quảng cáo tìm kiếm từ Google Ads (0-1): giá trị càng cao nghĩa là càng nhiều nhà quảng cáo tham gia đấu giá.",
  "saved.table.tooltip.difficulty":
    "Độ khó xếp hạng tự nhiên (0-100): giá trị càng cao thì càng khó lọt vào top 10 kết quả tìm kiếm của Google.",

  // Empty states
  "saved.table.empty.noMatch":
    "Không có từ khóa đã lưu nào khớp với bộ lọc hiện tại.",
  "saved.table.empty.noneYet":
    "Chưa có từ khóa đã lưu nào. Dùng trang Nghiên cứu từ khóa để tìm và lưu từ khóa.",

  // Filter panel
  "saved.table.filter.refineResults": "Tinh chỉnh kết quả",
  "saved.table.filter.activeCount": "{count, number} đang áp dụng",
  "saved.table.filter.clearAll": "Xóa hết",
  "saved.table.filter.include": "Bao gồm",
  "saved.table.filter.includePlaceholder": "Phải chứa… vd: audit",
  "saved.table.filter.exclude": "Loại trừ",
  "saved.table.filter.excludePlaceholder": "Không được chứa… vd: jobs",
  "saved.table.filter.removeTerm": "Xóa {term}",
  "saved.table.filter.searchVolume": "Lượng tìm kiếm",
  "saved.table.filter.cpcUsd": "CPC (USD)",
  "saved.table.filter.min": "Tối thiểu",
  "saved.table.filter.max": "Tối đa",

  // Filters toolbar
  "saved.table.filter.toggleTooltip": "Bật/tắt bộ lọc bảng",
  "saved.table.filter.filtersLabel": "Bộ lọc",

  // Tag filter
  "saved.table.tagFilter.label": "Thẻ",
  "saved.table.tagFilter.removeFilterTitle": "Bỏ lọc",
  "saved.table.tagFilter.clearSelected": "Xóa",
  "saved.table.tagFilter.searchPlaceholder": "Tìm thẻ…",
  "saved.table.tagFilter.noTagsYet":
    "Chưa có thẻ nào. Thêm thẻ từ một nhóm từ khóa đã chọn.",
  "saved.table.tagFilter.noSearchMatch":
    "Không có thẻ nào khớp với tìm kiếm đó.",
  "saved.table.tagFilter.selectedCount": "{count, number} đã chọn",
  "saved.table.tagFilter.clearAllTags": "Xóa hết",
  "saved.table.tagFilter.manageAriaLabel": "Quản lý {name}",

  // Bulk action bar
  "saved.table.bulk.tag": "Gắn thẻ",
  "saved.table.bulk.copyKeywords": "Sao chép từ khóa",
  "saved.table.bulk.exportCsv": "Xuất CSV",
  "saved.table.bulk.delete": "Xóa",

  // Status line
  "saved.table.status.count": "{count, plural, other {# từ khóa đã lưu}}",

  // Route toasts and error fallbacks
  "saved.table.remove.success": "Đã xóa {count, plural, other {# từ khóa}}",
  "saved.table.remove.errorDefault": "Xóa thất bại.",
  "saved.table.tagUpdate.success":
    "Đã cập nhật thẻ cho {count, plural, other {# từ khóa}}",
  "saved.table.tagUpdate.errorDefault": "Không thể cập nhật thẻ",
  "saved.table.metrics.success":
    "Đã cập nhật số liệu cho {count, plural, other {# từ khóa}}",
  "saved.table.metrics.errorDefault": "Không thể cập nhật số liệu từ khóa.",
  "saved.table.copy.success": "Đã sao chép {count, plural, other {# từ khóa}}",

  // Export hook
  "saved.table.export.noData": "Không có từ khóa để xuất",
  "saved.table.export.csvErrorDefault": "Không thể xuất CSV",
  "saved.table.export.sheetsErrorDefault": "Không thể xuất sang Sheets",
};
