import type { aiPromptExplorer as en } from "../en/aiPromptExplorer";

// Prompt Explorer: form, results, rendered markdown answers, and the AI-search setup/paid-plan gates. See en/aiPromptExplorer.ts for scope.
export const aiPromptExplorer: Record<keyof typeof en, string> = {
  "aiPromptExplorer.page.subtitle":
    "Đặt bất kỳ câu lệnh nào và so sánh câu trả lời từ ChatGPT, Claude, Gemini và Perplexity cùng lúc.",
  "aiPromptExplorer.page.recentSearches": "Tìm kiếm gần đây",

  "aiPromptExplorer.access.statusErrorFallback":
    "Không thể tải trạng thái thiết lập AI Optimization.",

  "aiPromptExplorer.form.validation.emptyPrompt": "Nhập một câu lệnh",
  "aiPromptExplorer.form.validation.tooLong":
    "Giữ câu lệnh dưới {max, number} ký tự",
  "aiPromptExplorer.form.validation.noModels": "Chọn ít nhất một mô hình",

  "aiPromptExplorer.explore.errorDefault":
    "Không thể chạy câu lệnh này. Vui lòng thử lại.",

  "aiPromptExplorer.paidGate.description":
    "Đặt một câu lệnh trên ChatGPT, Claude, Gemini và Perplexity cùng lúc rồi so sánh câu trả lời — kể cả các nguồn mà mỗi mô hình trích dẫn.",
  "aiPromptExplorer.paidGate.bullets.models.title": "Bốn mô hình cạnh nhau",
  "aiPromptExplorer.paidGate.bullets.models.body":
    "Chạy một câu lệnh trên ChatGPT, Claude, Gemini và Perplexity rồi so sánh câu trả lời trong một màn hình duy nhất.",
  "aiPromptExplorer.paidGate.bullets.citations.title":
    "Xem nguồn mà các mô hình trích dẫn",
  "aiPromptExplorer.paidGate.bullets.citations.body":
    "Mỗi câu trả lời đều liệt kê các nguồn đã tham khảo, giúp bạn kiểm tra mô hình lấy thông tin từ đâu.",
  "aiPromptExplorer.paidGate.bullets.brand.title":
    "Kiểm tra nhắc đến thương hiệu",
  "aiPromptExplorer.paidGate.bullets.brand.body":
    "Đánh dấu một thương hiệu để lập tức biết nó có xuất hiện trong câu trả lời hoặc nguồn trích dẫn hay không.",

  "aiPromptExplorer.form.promptLabel": "Câu lệnh",
  "aiPromptExplorer.form.promptHint":
    "Những gì khách hàng của bạn có thể hỏi AI.",
  "aiPromptExplorer.form.brandLabel": "Đánh dấu thương hiệu (tùy chọn)",
  "aiPromptExplorer.form.brandHint":
    "Chúng tôi sẽ đánh dấu nếu mỗi mô hình có nhắc đến thương hiệu này.",
  "aiPromptExplorer.form.modelsLabel": "Mô hình",
  "aiPromptExplorer.form.webSearchLabel":
    "Cho phép tìm kiếm web (câu trả lời cập nhật hơn)",
  "aiPromptExplorer.form.webSearchLocationAria": "Vị trí tìm kiếm web",
  "aiPromptExplorer.form.submit": "Chạy",
  "aiPromptExplorer.form.submitting": "Đang chạy…",

  "aiPromptExplorer.results.citedSourcesHeading":
    "Nguồn trích dẫn ({count, number})",
  "aiPromptExplorer.results.relatedQueriesHeading":
    "Truy vấn liên quan mà mô hình đã xem xét",
  "aiPromptExplorer.results.errorBadge": "Lỗi",
  "aiPromptExplorer.results.webSearchBadge": "tìm kiếm web",
  "aiPromptExplorer.results.tokensCount": "{count, number} token",
  "aiPromptExplorer.results.brandNotMentioned": "không có {brand}",

  "aiPromptExplorer.markdown.emptyResponse":
    "Mô hình trả về câu trả lời trống.",
  "aiPromptExplorer.markdown.modelThinking": "Quá trình suy luận của mô hình",
  "aiPromptExplorer.markdown.showLess": "Thu gọn",
  "aiPromptExplorer.markdown.readMore": "Xem thêm",

  "aiPromptExplorer.setupGate.title": "Bật tính năng AI Optimization",
  "aiPromptExplorer.setupGate.body":
    "Tài khoản DataForSEO của bạn chưa bật tính năng AI Optimization. Bạn có thể bật trong DataForSEO, hoặc dùng EchoSEO managed để truy cập dữ liệu nhắc đến từ LLM lâu dài với giá {price}/tháng.",
  "aiPromptExplorer.setupGate.helper":
    "Chúng tôi cũng đang lên kế hoạch cho một API để các ứng dụng self-hosted có thể dùng trực tiếp dữ liệu nhắc đến từ LLM của EchoSEO. Trong lúc chờ, {link}.",
  "aiPromptExplorer.setupGate.helperLink": "dùng EchoSEO managed",
  "aiPromptExplorer.setupGate.confirmButton":
    "Xác nhận quyền truy cập AI Optimization",
  "aiPromptExplorer.setupGate.confirming": "Đang xác nhận…",
  "aiPromptExplorer.setupGate.externalLabel":
    "Mở trang API Access trên DataForSEO",

  "aiPromptExplorer.paidGate.badge": "Gói trả phí",
  "aiPromptExplorer.paidGate.title": "Mở khóa {feature}",
  "aiPromptExplorer.paidGate.upgrade": "Nâng cấp",

  "aiPromptExplorer.history.recentCount":
    "{count, plural, other {# {noun} gần đây}}",
  "aiPromptExplorer.history.removeAria": "Xóa khỏi lịch sử",

  "aiPromptExplorer.history.emptyMessage":
    "Nhập một câu lệnh để so sánh câu trả lời của các mô hình",
  "aiPromptExplorer.history.noun": "câu lệnh",
} as const;
