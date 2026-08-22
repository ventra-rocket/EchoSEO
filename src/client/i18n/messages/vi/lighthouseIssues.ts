import type { lighthouseIssues as en } from "../en/lighthouseIssues";

// Lighthouse issue list: rows, grouped parts and the issues screen. See
// en/lighthouseIssues.ts for scope, the shared severity/category ids and the
// provider-text line.
export const lighthouseIssues: Record<keyof typeof en, string> = {
  "lighthouseIssues.severity.critical": "Nghiêm trọng",
  "lighthouseIssues.severity.warning": "Cảnh báo",
  "lighthouseIssues.severity.info": "Thông tin",

  "lighthouseIssues.category.all": "Tất cả",
  "lighthouseIssues.category.performance": "Hiệu suất",
  "lighthouseIssues.category.accessibility": "Khả năng truy cập",
  "lighthouseIssues.category.bestPractices": "Thực hành tốt nhất",
  "lighthouseIssues.category.seo": "SEO",

  "lighthouseIssues.header.backTo": "← Quay lại {backLabel}",
  "lighthouseIssues.header.title": "Vấn đề Lighthouse",
  "lighthouseIssues.header.loadingUrl": "Đang tải URL…",
  "lighthouseIssues.header.scanned": "Quét lúc {date}",
  "lighthouseIssues.header.loadingScanTime": "Đang tải vấn đề mới nhất…",

  "lighthouseIssues.list.loading": "Đang tải vấn đề…",
  "lighthouseIssues.list.emptyDefault":
    "Không có vấn đề nào cần xử lý cho danh mục này.",
  "lighthouseIssues.list.providerNotice":
    "Tiêu đề, mô tả vấn đề và các giá trị đo lường được lấy trực tiếp từ báo cáo Lighthouse nên hiển thị bằng tiếng Anh.",
  "lighthouseIssues.list.column.severity": "Mức độ",
  "lighthouseIssues.list.column.issue": "Vấn đề",
  "lighthouseIssues.list.column.category": "Danh mục",
  "lighthouseIssues.list.column.impact": "Tác động",
  "lighthouseIssues.list.column.score": "Điểm",

  "lighthouseIssues.row.affectedItems": "Mục bị ảnh hưởng ({count, number})",

  "lighthouseIssues.export.menuButton": "Xuất",
  "lighthouseIssues.export.sheetsSectionTitle": "Xuất ra Sheets",
  "lighthouseIssues.export.sheetsCurrentCategory":
    "Mở trong Sheets — {category}",
  "lighthouseIssues.export.sheetsAllActionable":
    "Mở trong Sheets — tất cả vấn đề cần xử lý",
  "lighthouseIssues.export.copySectionTitle": "Sao chép",
  "lighthouseIssues.export.copyCurrentCategory": "Sao chép vấn đề {category}",
  "lighthouseIssues.export.copyAllActionable":
    "Sao chép tất cả vấn đề cần xử lý",
  "lighthouseIssues.export.copySavedPayload":
    "Sao chép dữ liệu Lighthouse đã lưu",
  "lighthouseIssues.export.copiedCurrentCategoryToast":
    "Đã sao chép vấn đề {category}",
  "lighthouseIssues.export.copiedAllActionableToast":
    "Đã sao chép tất cả vấn đề cần xử lý",
  "lighthouseIssues.export.copiedSavedPayloadToast":
    "Đã sao chép dữ liệu Lighthouse đã lưu",
  "lighthouseIssues.export.jsonSectionTitle": "Tải xuống JSON",
  "lighthouseIssues.export.csvSectionTitle": "Tải xuống CSV",
  "lighthouseIssues.export.downloadCurrentCategory":
    "Tải xuống vấn đề {category}",
  "lighthouseIssues.export.downloadAllActionable":
    "Tải xuống tất cả vấn đề cần xử lý",
  "lighthouseIssues.export.downloadSavedPayload":
    "Tải xuống dữ liệu Lighthouse đã lưu",

  "lighthouseIssues.actions.downloadStarted": "Đã bắt đầu tải xuống",
  "lighthouseIssues.actions.csvDownloadStarted": "Đã bắt đầu tải xuống CSV",
  "lighthouseIssues.actions.exportErrorDefault": "Không thể xuất dữ liệu.",
  "lighthouseIssues.actions.copyErrorDefault": "Không thể sao chép dữ liệu.",

  "lighthouseIssues.screen.loadError": "Không thể tải vấn đề Lighthouse.",
  "lighthouseIssues.screen.legacyPayloadWarning":
    "Lần chạy Lighthouse này được lưu trước khi chi tiết vấn đề được giữ lại. Hãy chạy lại lượt kiểm tra để xem số lượng theo danh mục và các thẻ vấn đề.",
  "lighthouseIssues.screen.legacyPayloadEmptyMessage":
    "Lượt kiểm tra này được lưu mà không có chi tiết vấn đề Lighthouse ở cấp độ từng mục. Hãy chạy lại lượt kiểm tra để có dữ liệu cho màn hình này.",
};
