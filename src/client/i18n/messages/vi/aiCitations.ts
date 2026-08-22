import type { aiCitations as en } from "../en/aiCitations";

// Brand Lookup citations: filter panel, citations card and its tables. See en/aiCitations.ts for scope.
export const aiCitations: Record<keyof typeof en, string> = {
  "aiCitations.filterPanel.heading": "Tinh chỉnh kết quả",
  "aiCitations.filterPanel.activeCount": "{count, number} đang áp dụng",
  "aiCitations.filterPanel.clearAll": "Xóa hết",
  "aiCitations.filterPanel.includeLabel": "Bao gồm cụm từ",
  "aiCitations.filterPanel.excludeLabel": "Loại trừ cụm từ",
  "aiCitations.filterPanel.min": "Tối thiểu",
  "aiCitations.filterPanel.max": "Tối đa",
  "aiCitations.filterPanel.platformLabel": "Nền tảng",
  "aiCitations.filterPanel.platformAll": "Tất cả",
  "aiCitations.filterPanel.pages.includePlaceholder": "reddit, forbes",
  "aiCitations.filterPanel.pages.excludePlaceholder": "pinterest, /tag",
  "aiCitations.filterPanel.pages.mentionsTitle": "Lượt đề cập nguồn",
  "aiCitations.filterPanel.queries.includePlaceholder": "bảng giá, đánh giá",
  "aiCitations.filterPanel.queries.excludePlaceholder": "đăng nhập, tải xuống",
  "aiCitations.filterPanel.queries.volumeTitle": "Lượng tìm kiếm AI",

  "aiCitations.card.tab.queries": "Truy vấn",
  "aiCitations.card.tab.pages": "Nguồn được trích dẫn",
  "aiCitations.card.export.csv": "CSV",
  "aiCitations.card.filters.toggleTitle": "Bật/tắt bộ lọc bảng",
  "aiCitations.card.filters.label": "Bộ lọc",
  "aiCitations.card.caption.pages":
    "Các trang được trích dẫn cùng với {brand} trong câu trả lời AI. Các prompt ví dụ lấy từ mẫu đã thu thập.",
  "aiCitations.card.caption.queries":
    "Mẫu prompt đã thu thập có câu trả lời AI trích dẫn {brand} trong nội dung hoặc nguồn.",

  "aiCitations.table.column.source": "Nguồn",
  "aiCitations.table.column.sourceHelp":
    "Trang được trích dẫn làm nguồn trong câu trả lời AI, nơi thương hiệu hoặc tên miền tìm kiếm xuất hiện.",
  "aiCitations.table.column.platform": "Nền tảng",
  "aiCitations.table.column.platformHelp":
    "Nền tảng AI nào đã tạo ra câu trả lời — ChatGPT hoặc Google AI Overview.",
  "aiCitations.table.column.citedFor": "Được trích dẫn cho",
  "aiCitations.table.column.citedForHelp":
    "Các prompt ví dụ từ mẫu đã thu thập, nơi trang này được trích dẫn.",
  "aiCitations.table.column.sourceVolume": "Lượng nguồn",
  "aiCitations.table.column.sourceVolumeHelp":
    "Nhu cầu prompt hàng tháng ước tính mà DataForSEO báo cáo cho nguồn được trích dẫn này, trên các prompt có thương hiệu hoặc tên miền tìm kiếm xuất hiện.",
  "aiCitations.table.column.query": "Truy vấn",
  "aiCitations.table.column.queryHelp":
    "Một prompt người dùng được lấy mẫu có câu trả lời AI trích dẫn thương hiệu hoặc tên miền tìm kiếm trong nội dung hoặc nguồn. Bản thân prompt có thể không nêu tên thương hiệu.",
  "aiCitations.table.column.aiSearchVolume": "Lượng tìm kiếm AI",
  "aiCitations.table.column.aiSearchVolumeHelp":
    "Nhu cầu tìm kiếm hàng tháng ước tính cho chủ đề của prompt này. Đây là nhu cầu prompt, không phải số lượt đề cập thương hiệu.",
  "aiCitations.table.column.actions": "Thao tác",
  "aiCitations.table.you": "Bạn",
  "aiCitations.table.brandsMentioned": "Thương hiệu: {brands}",
  "aiCitations.table.keywordsShowLess": "Thu gọn",
  "aiCitations.table.keywordsMore": "+{count, number} nữa",
  "aiCitations.table.keywordVolume": "{count} lượt",
  "aiCitations.table.runPromptTitle": "Chạy prompt này trong {promptExplorer}",
  "aiCitations.table.volumeTooltip":
    "Lượng tìm kiếm của prompt trong mẫu đã thu thập",
  "aiCitations.table.pagesEmpty": "Không có nguồn trích dẫn nào để hiển thị.",
  "aiCitations.table.queriesEmpty": "Không tìm thấy truy vấn nào khớp.",
};
