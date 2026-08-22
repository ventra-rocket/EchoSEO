import type { onboarding as en } from "../en/onboarding";

// Post-signup onboarding form: interest/work/source steps, the Search Console connect step, and the account menu. See en/onboarding.ts for scope.
//
// Brand/product nouns stay untranslated (EchoSEO, Google, Google Search
// Console, Claude, Codex, MCP), matching the shipped convention. "startup",
// "property" and "agent" stay as loanwords already used throughout the app
// (see gsc.ts, rankConfig.ts). The 1–3/4–10/11–25/25+ range labels carry no
// words to translate, matching rank.charts.band.top4to10.
export const onboarding: Record<keyof typeof en, string> = {
  "onboarding.progress.step": "Bước {step, number}/{total, number}",
  "onboarding.welcome.title": "Chào mừng đến với EchoSEO!",
  "onboarding.welcome.namedTitle": "Chào mừng đến với EchoSEO, {firstName}!",
  "onboarding.welcome.helper":
    "Trả lời nhanh vài câu để chúng tôi thiết lập mọi thứ.",

  "onboarding.upgrade.title": "Bạn đã tham gia thành công! 🎉",
  "onboarding.upgrade.subtitle": "Gói đăng ký của bạn đã được kích hoạt.",
  "onboarding.upgrade.cardTitle": "Hoàn tất thiết lập tài khoản của bạn",
  "onboarding.upgrade.cardBody":
    "Còn hai bước nhanh nữa — kết nối Google Search Console, sau đó thiết lập MCP cho agent của bạn.",

  "onboarding.action.back": "Quay lại",
  "onboarding.action.skip": "Bỏ qua",
  "onboarding.action.continue": "Tiếp tục",

  "onboarding.step.interests.title": "Công việc nào quan trọng nhất với bạn?",
  "onboarding.step.interests.description": "Chọn tối đa {max, number}.",
  "onboarding.step.workFor.title": "Bạn làm SEO cho ai?",
  "onboarding.step.workFor.clientCountLabel":
    "Bạn đang làm việc trên khoảng bao nhiêu site của khách hàng?",
  "onboarding.step.source.title": "Bạn biết đến EchoSEO qua đâu?",

  "onboarding.otherInput.placeholderMultiple": "Còn điều gì khác...",
  "onboarding.otherInput.placeholderSingle": "Cho chúng tôi biết thêm...",

  "onboarding.option.other": "Khác",
  "onboarding.option.aiWorkflows": "Quy trình AI với Claude hoặc Codex (MCP)",
  "onboarding.option.keywordResearch": "Nghiên cứu từ khóa",
  "onboarding.option.competitorResearch": "Nghiên cứu đối thủ",
  "onboarding.option.backlinkAnalysis": "Phân tích liên kết trỏ về",
  "onboarding.option.siteAudits": "Kiểm tra website",
  "onboarding.option.rankTracking": "Theo dõi thứ hạng",
  "onboarding.option.ownBusiness": "Startup hoặc doanh nghiệp của riêng tôi",
  "onboarding.option.clients": "Khách hàng của tôi",
  "onboarding.option.employer": "Website của công ty nơi tôi làm việc",
  "onboarding.option.sideProject": "Dự án cá nhân của tôi",
  "onboarding.option.exploring": "Tôi đang tìm hiểu trước khi chọn một dự án",
  "onboarding.option.websiteCount1to3": "1–3",
  "onboarding.option.websiteCount4to10": "4–10",
  "onboarding.option.websiteCount11to25": "11–25",
  "onboarding.option.websiteCount25plus": "25+",
  "onboarding.option.sourceGoogle": "Google",
  "onboarding.option.sourceReddit": "Reddit",
  "onboarding.option.sourceTwitter": "X / Twitter",
  "onboarding.option.sourceGithub": "GitHub",
  "onboarding.option.sourceChatgpt": "ChatGPT",
  "onboarding.option.sourceClaude": "Claude",
  "onboarding.option.sourceFriend": "Bạn bè hoặc đồng nghiệp",

  "onboarding.mcp.title": "Thiết lập EchoSEO MCP?",
  "onboarding.mcp.pitch":
    "Cách mạnh mẽ nhất để dùng EchoSEO — dùng AI để nâng tầm kỹ năng SEO của bạn.",
  "onboarding.mcp.capability.linkProspecting": "Tìm kiếm cơ hội liên kết",
  "onboarding.mcp.setup": "Có, thiết lập MCP",
  "onboarding.mcp.notNow": "Để sau",

  "onboarding.gscStep.title": "Kết nối Google Search Console ngay bây giờ?",
  "onboarding.gscStep.disclaimer":
    "Hiện tại, dữ liệu Search Console được truyền qua EchoSEO MCP. Chúng tôi cũng sắp tích hợp việc này trực tiếp vào ứng dụng EchoSEO.",
  "onboarding.gscStep.connected": "Đã kết nối với <mono>{siteUrl}</mono>.",
  "onboarding.gscStep.saveError": "Không thể lưu property đó.",
};
