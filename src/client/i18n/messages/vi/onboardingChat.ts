import type { onboardingChat as en } from "../en/onboardingChat";

// Onboarding strategy chat surface: shell, conversation, composer, credit limits and site-save flow. See en/onboardingChat.ts for scope.
export const onboardingChat: Record<keyof typeof en, string> = {
  "onboardingChat.shell.loadError":
    "Không thể tải chiến lược của bạn. Vui lòng tải lại trang để thử lại.",
  "onboardingChat.shell.loading": "Đang tải…",

  "onboardingChat.siteForm.title": "Cho chúng tôi biết về website của bạn.",
  "onboardingChat.siteForm.subtitle":
    "Nếu bạn có nhiều website, bạn có thể thiết lập sau.",
  "onboardingChat.siteForm.domainLabel": "Website của bạn",
  "onboardingChat.siteForm.domainPlaceholder": "example.com",
  "onboardingChat.siteForm.locationLabel":
    "Đây là quốc gia chúng tôi sẽ dùng khi lấy dữ liệu SEO.",
  "onboardingChat.siteForm.saving": "Đang lưu…",
  "onboardingChat.siteForm.submit": "Tiếp tục",
  "onboardingChat.siteForm.saveErrorDefault":
    "Chúng tôi không thể lưu website của bạn. Vui lòng thử lại.",

  "onboardingChat.welcome.greeting":
    "Chào bạn, tôi là Sam — chào mừng bạn đến với EchoSEO.",
  "onboardingChat.welcome.upgradeExplainer":
    "Để có toàn quyền truy cập EchoSEO, bạn cần nâng cấp lên gói trả phí. Nhưng tôi luôn ở đây nếu bạn có bất kỳ câu hỏi nào.",
  "onboardingChat.welcome.helpLinks":
    "Bạn cũng có thể <discordLink>tham gia Discord</discordLink> hoặc gửi email tới <emailLink>ventrarocket.work@gmail.com</emailLink> nếu có câu hỏi nào tôi không thể giúp được.",
  "onboardingChat.welcome.analyzePrompt":
    "Bạn muốn tôi phân tích {domain} và soạn một chiến lược, hay bạn có câu hỏi trước? Chọn một gợi ý bên dưới để bắt đầu.",
  "onboardingChat.welcome.mobileCalloutTitle": "Muốn Sam tiếp tục hỗ trợ?",
  "onboardingChat.welcome.mobileCalloutBody":
    "Nâng cấp để chạy nghiên cứu từ khóa, theo dõi thứ hạng và audit website trên {domain}.",

  "onboardingChat.upgrade.redirecting": "Đang chuyển hướng...",
  "onboardingChat.upgrade.cta": "Nâng cấp",
  "onboardingChat.upgrade.ctaFull": "Nâng cấp để tiếp tục",

  "onboardingChat.upgrade.feature.core":
    "Nghiên cứu từ khóa, backlink, theo dõi thứ hạng & audit website",
  "onboardingChat.upgrade.feature.gsc":
    "Google Search Console — chỉ đọc, không tốn credit, không cần thiết lập Google Cloud",
  "onboardingChat.upgrade.feature.mcp":
    "Kết nối Claude, Cursor, Codex & các MCP client khác",
  "onboardingChat.upgrade.feature.creditsRollover":
    "Credit top-up được chuyển tiếp và không bao giờ hết hạn",
  "onboardingChat.upgrade.previewingLabel": "Đang xem trước EchoSEO",
  "onboardingChat.upgrade.perMonthSuffix": "/tháng",
  "onboardingChat.upgrade.priceIncludes":
    "Bao gồm {price} credit sử dụng mỗi tháng, cùng với bảo đảm hoàn tiền trong 30 ngày.",
  "onboardingChat.upgrade.discordPrompt":
    "Muốn nghe lời khuyên từ người dùng EchoSEO khác? <discordLink>Tham gia Discord</discordLink>.",
  "onboardingChat.upgrade.questionsUsed":
    "Đã dùng {used, number} trong {limit, plural, other {# câu hỏi miễn phí}}",

  "onboardingChat.gate.allQuestionsUsed":
    "Bạn đã dùng hết {limit, plural, other {# câu hỏi miễn phí}}",
  "onboardingChat.gate.description":
    "Nâng cấp để tiếp tục làm việc với Sam và mở khóa toàn bộ ứng dụng EchoSEO.",
  "onboardingChat.gate.moneyBackGuarantee": "Bảo đảm hoàn tiền trong 30 ngày",

  "onboardingChat.composer.placeholder":
    "Hỏi Sam về chiến lược của bạn hoặc về EchoSEO…",
  "onboardingChat.composer.sendAriaLabel": "Gửi tin nhắn",
  "onboardingChat.composer.remainingHint":
    "Còn lại {remaining, plural, other {# câu hỏi miễn phí}}. <upgradeLink>Nâng cấp để có toàn quyền truy cập</upgradeLink>",

  "onboardingChat.reasoning.thinking": "Đang suy nghĩ…",
  "onboardingChat.reasoning.thoughtProcess": "Quá trình suy luận",

  "onboardingChat.tool.readWebsite.running": "Đang đọc website…",
  "onboardingChat.tool.readWebsite.done": "Đã đọc website",
  "onboardingChat.tool.seoMetrics.running": "Đang lấy chỉ số SEO…",
  "onboardingChat.tool.seoMetrics.done": "Chỉ số SEO",
  "onboardingChat.tool.researchKeywords.running": "Đang nghiên cứu từ khóa…",
  "onboardingChat.tool.researchKeywords.done": "Nghiên cứu từ khóa",
  "onboardingChat.tool.domainOverview.running": "Đang phân tích tên miền…",
  "onboardingChat.tool.domainOverview.done": "Tổng quan tên miền",
  "onboardingChat.tool.serpResults.running": "Đang kiểm tra kết quả tìm kiếm…",
  "onboardingChat.tool.serpResults.done": "Kết quả tìm kiếm",
  "onboardingChat.tool.competitors.running": "Đang tìm đối thủ cạnh tranh…",
  "onboardingChat.tool.competitors.done": "Đối thủ cạnh tranh",
  "onboardingChat.tool.competitorKeywords.running": "Đang phân tích đối thủ…",
  "onboardingChat.tool.competitorKeywords.done": "Từ khóa của đối thủ",
  "onboardingChat.tool.backlinksOverview.running": "Đang kiểm tra backlink…",
  "onboardingChat.tool.backlinksOverview.done": "Tổng quan backlink",

  "onboardingChat.suggestion.strategy": "Bạn đề xuất gì cho website của tôi?",
  "onboardingChat.suggestion.competitors":
    "So sánh với các đối thủ cạnh tranh của tôi",
  "onboardingChat.suggestion.traffic":
    "EchoSEO giúp tôi tăng lượng truy cập như thế nào?",
  "onboardingChat.suggestion.compareClaude": "So sánh EchoSEO và Claude",
  "onboardingChat.suggestion.afterUpgrade":
    "Tôi sẽ nhận được gì sau khi nâng cấp?",
  "onboardingChat.suggestion.gscIntegration":
    "Tích hợp Google Search Console hoạt động như thế nào?",
  "onboardingChat.suggestion.agencyFit":
    "Có phù hợp với các consultant và agency không?",

  "onboardingChat.conversation.checkoutErrorDefault":
    "Chúng tôi không thể bắt đầu thanh toán. Vui lòng tải lại trang và thử lại.",
  "onboardingChat.conversation.genericError":
    "Đã xảy ra lỗi. Vui lòng tải lại trang và thử lại.",
};
