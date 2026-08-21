import type { keywordUi as en } from "../en/keywordUi";

// Shared keyword display primitives: intent badges, SERP analysis card, metric labels.
export const keywordUi: Record<keyof typeof en, string> = {
  "keywordUi.intent.informational.short": "Thông tin",
  "keywordUi.intent.informational.label": "Thông tin",
  "keywordUi.intent.informational.description":
    "Người tìm kiếm muốn tìm thông tin hoặc câu trả lời. Phù hợp với nội dung mang tính giáo dục, hướng dẫn và bài giải thích ít so sánh.",
  "keywordUi.intent.commercial.short": "Thương mại",
  "keywordUi.intent.commercial.label": "Thương mại",
  "keywordUi.intent.commercial.description":
    "Người tìm kiếm đang tìm hiểu các lựa chọn trước khi mua. Hãy xem đây là ý định mua hàng, phù hợp với trang so sánh, lựa chọn thay thế và trang giới thiệu sản phẩm.",
  "keywordUi.intent.transactional.short": "Giao dịch",
  "keywordUi.intent.transactional.label": "Giao dịch",
  "keywordUi.intent.transactional.description":
    "Người tìm kiếm đã sẵn sàng thực hiện hành động, thường là mua hàng. Hãy ưu tiên ưu đãi rõ ràng, bảng giá, dùng thử hoặc lộ trình chuyển đổi.",
  "keywordUi.intent.navigational.short": "Điều hướng",
  "keywordUi.intent.navigational.label": "Điều hướng",
  "keywordUi.intent.navigational.description":
    "Người tìm kiếm đang tìm một trang web, thương hiệu hoặc trang cụ thể. Những truy vấn này thường ưu tiên trang đích khớp đúng như mong đợi.",
  "keywordUi.intent.unknown.short": "?",
  "keywordUi.intent.unknown.label": "Không xác định",
  "keywordUi.intent.unknown.description":
    "Không có dữ liệu ý định cho từ khóa này, vì vậy đừng chỉ dựa vào nhãn này để đưa ra quyết định chiến lược nội dung.",
  "keywordUi.intent.ariaLabel": "Ý định tìm kiếm: {label}",

  "keywordUi.trendChart.ariaLabel": "Biểu đồ xu hướng tìm kiếm",
  "keywordUi.trendChart.seriesName": "Lượng tìm kiếm",

  "keywordUi.overview.volume": "Lượng",
  "keywordUi.overview.cpc": "CPC",
  "keywordUi.overview.competition": "Cạnh tranh",

  "keywordUi.serp.resultCount": "{count, plural, other {# kết quả tự nhiên}}",
  "keywordUi.serp.table.pageColumn": "Trang",
  "keywordUi.serp.pagination.prev": "Trước",
  "keywordUi.serp.pagination.next": "Sau",
  "keywordUi.serp.empty.title": "Chưa có dữ liệu SERP cho từ khóa này.",
  "keywordUi.serp.empty.hint": "Hãy thử nhấp vào từ khóa khác để tải dữ liệu.",

  "keywordUi.research.errorDefault": "Nghiên cứu từ khóa thất bại.",

  "keywordUi.serp.errorDefault": "Không thể tải dữ liệu SERP.",

  "keywordUi.controlsForm.keywordRequired":
    "Vui lòng nhập ít nhất một từ khóa.",
  "keywordUi.controlsForm.tooManyKeywords":
    "Vui lòng nhập không quá {max, number} từ khóa (mỗi dòng một từ khóa).",
  "keywordUi.controlsForm.tabsSkipped":
    "{skipped, plural, other {# từ khóa}} bị bỏ qua — đóng bớt một tab để mở thêm (tối đa {max, number}).",

  "keywordUi.saveExport.noSelectionToast": "Vui lòng chọn ít nhất một từ khóa",
  "keywordUi.saveExport.savedToast":
    "{count, plural, other {Đã lưu # từ khóa}}",
  "keywordUi.saveExport.saveErrorDefault": "Lưu thất bại.",
  "keywordUi.saveExport.noDataToExport": "Không có dữ liệu để xuất",
};
