import type { aiWorkspace as en } from "../en/aiWorkspace";

// The AI & MCP page (routes/_app/ai.tsx) and the assistant workspace shell +
// conversation (features/assistant-workspace/). See en/aiWorkspace.ts for
// scope.
//
// Client and product names stay untranslated (Claude, Claude Code, Claude
// Desktop, Codex, Codex Desktop, EchoSEO, MCP, Discord, GitHub), matching the
// shipped convention. Literal UI labels the reader has to find inside those
// external apps' own (English) interfaces — "Settings", "Connectors", "Add
// custom connector", "Configure", "Always Approved", "Add your own",
// "Integrations & MCP" — stay in English too, the same way DATAFORSEO_API_KEY
// and env var names stay verbatim elsewhere: translating the label would make
// it harder, not easier, to find on screen. "agent", "editor", "client",
// "workspace", "crawl", "credit", "deployment", "job" and "framework" stay as
// the loanwords already used throughout the app (see gsc.ts, auditChrome.ts,
// members.ts).
export const aiWorkspace: Record<keyof typeof en, string> = {
  "aiWorkspace.page.subtitle":
    "Kết nối AI agent của bạn với EchoSEO. Chạy nghiên cứu từ khóa, phân tích SERP, tra cứu tên miền và rà soát backlink ngay từ editor hoặc client chat của bạn.",

  "aiWorkspace.mcpUrl.label": "URL máy chủ MCP",
  "aiWorkspace.mcpUrl.copied": "Đã sao chép URL MCP",
  "aiWorkspace.mcpUrl.description":
    "Dán URL này vào bất kỳ MCP client nào. URL này trỏ đến phiên bản EchoSEO bạn đang dùng, cho dù là bản hosted, self-hosted hay local. Đăng nhập bằng tài khoản EchoSEO khi được yêu cầu.",

  "aiWorkspace.setupGuides.heading": "Hướng dẫn thiết lập",
  "aiWorkspace.setupGuides.subtitle": "Chọn agent của bạn.",
  "aiWorkspace.setupGuides.addWithCli": "Thêm bằng CLI",
  "aiWorkspace.setupGuides.runInTerminal":
    "Chạy lệnh này trong terminal của bạn:",
  "aiWorkspace.setupGuides.approveLogin":
    "Chấp thuận đăng nhập khi được yêu cầu.",
  "aiWorkspace.setupGuides.approveEchoseoLogin":
    "Chấp thuận đăng nhập EchoSEO khi được yêu cầu.",

  "aiWorkspace.setupGuides.claudeCode.title": "Claude Code",
  "aiWorkspace.setupGuides.claudeDesktop.title": "Claude Desktop",
  "aiWorkspace.setupGuides.claudeDesktop.subtitle": "Thêm connector tùy chỉnh",
  "aiWorkspace.setupGuides.claudeDesktop.step1":
    "Mở <settings>Settings</settings> → <connectors>Connectors</connectors>.",
  "aiWorkspace.setupGuides.claudeDesktop.step2":
    "Nhấp <b>Add custom connector</b>.",
  "aiWorkspace.setupGuides.claudeDesktop.step3":
    "Dán URL MCP ở trên rồi nhấp Add.",
  "aiWorkspace.setupGuides.claudeDesktop.step5":
    "Không bắt buộc: sau khi EchoSEO kết nối, nhấp <configure>Configure</configure>, rồi chọn <alwaysApproved>Always Approved</alwaysApproved>, trừ những tool nào bạn muốn Claude hỏi trước khi dùng.",
  "aiWorkspace.setupGuides.claudeDesktop.requiresPlan":
    "Yêu cầu gói Claude Pro, Max, Team hoặc Enterprise.",

  "aiWorkspace.setupGuides.codex.title": "Codex",
  "aiWorkspace.setupGuides.codexDesktop.title": "Codex Desktop",
  "aiWorkspace.setupGuides.codexDesktop.subtitle":
    "Settings → Integrations & MCP",
  "aiWorkspace.setupGuides.codexDesktop.step1":
    "Mở <path>Settings → Integrations & MCP</path>.",
  "aiWorkspace.setupGuides.codexDesktop.step2": "Nhấp <b>Add your own</b>.",
  "aiWorkspace.setupGuides.codexDesktop.step3": "Dán URL MCP ở trên.",

  "aiWorkspace.skills.heading": "EchoSEO Skills",
  "aiWorkspace.skills.subtitle":
    "Skill giúp Codex và Claude Code có sẵn các workflow SEO tái sử dụng được, có thể gọi tool MCP của EchoSEO khi cần dữ liệu SERP, từ khóa, backlink hoặc tên miền theo thời gian thực.",
  "aiWorkspace.skills.installViaSkillsAdd.title": "Cài đặt bằng skills add",
  "aiWorkspace.skills.installViaSkillsAdd.subtitle":
    "Trình cài đặt được khuyên dùng cho mọi agent",
  "aiWorkspace.skills.autoAccept":
    "Bạn cũng có thể tự động chấp nhận từng skill của EchoSEO:",
  "aiWorkspace.skills.claudeCodeInstall.title": "Cài đặt cho Claude Code",
  "aiWorkspace.skills.claudeCodeInstall.subtitle":
    "Chỉ áp dụng cho Claude Code",
  "aiWorkspace.skills.codexInstall.title": "Cài đặt cho Codex",
  "aiWorkspace.skills.codexInstall.subtitle": "Chỉ áp dụng cho OpenAI Codex",
  "aiWorkspace.skills.manualInstall.title": "Cài đặt thủ công từ GitHub",
  "aiWorkspace.skills.manualInstall.subtitle": "Clone repo và copy các skill",
  "aiWorkspace.skills.startWith":
    "Bắt đầu với <cmd>/seo-project-setup</cmd>. Lệnh này sẽ hỏi về dự án của bạn và giúp cấu hình workspace.",
  "aiWorkspace.skills.availableHeading": "Các skill có sẵn",

  "aiWorkspace.availableTools.heading": "Các tool có sẵn",

  "aiWorkspace.openSource.heading": "Tham khảo workflow mã nguồn mở",
  "aiWorkspace.openSource.body":
    "Sam là một thử nghiệm upstream riêng biệt cho các workflow nội dung. EchoSEO vẫn ghi nhận nguồn tại đây trong khi không gian làm việc hỗ trợ AI riêng trong ứng dụng được phát triển độc lập.",
  "aiWorkspace.openSource.link": "Xem tham chiếu upstream",

  "aiWorkspace.roadmap.heading": "Lộ trình",
  "aiWorkspace.roadmap.researchAgent.title":
    "Agent nghiên cứu SEO trong ứng dụng",
  "aiWorkspace.roadmap.researchAgent.description":
    "Đặt câu hỏi và thực hiện nghiên cứu mà không cần rời khỏi EchoSEO",
  "aiWorkspace.roadmap.contentAssistant.title": "Trợ lý nội dung",
  "aiWorkspace.roadmap.contentAssistant.description":
    "Tạo bản nháp dựa trên từ khóa đã lưu và bối cảnh doanh nghiệp",

  "aiWorkspace.footer.feedback":
    "Có góp ý? Liên hệ qua <discordLink>Discord</discordLink> hoặc email tới <emailLink>{email}</emailLink>.",

  "aiWorkspace.workspace.unavailable":
    "Chúng tôi không thể mở không gian làm việc trợ lý riêng tư này.",
  "aiWorkspace.workspace.title": "Quy trình SEO có hỗ trợ AI",
  "aiWorkspace.workspace.privateTo":
    "Chỉ dành riêng cho bạn trong {projectName}.",
  "aiWorkspace.workspace.mcpSetupLink": "Thiết lập MCP",
  "aiWorkspace.workspace.setupRequired.title": "Cần thiết lập AI",
  "aiWorkspace.workspace.setupRequired.hostedReason":
    "Không gian làm việc AI trên bản hosted chưa khả dụng.",
  "aiWorkspace.workspace.setupRequired.missingKeyReason":
    "Thêm OPENROUTER_API_KEY để bật không gian làm việc AI riêng tư.",
  "aiWorkspace.workspace.setupRequired.openLink": "Mở phần thiết lập MCP và AI",

  "aiWorkspace.conversation.suggestion.workflow":
    "Tạo một workflow SEO 30 ngày tập trung cho dự án này.",
  "aiWorkspace.conversation.suggestion.evidence":
    "Tôi nên xem xét bằng chứng nào trước khi chọn từ khóa mới?",
  "aiWorkspace.conversation.suggestion.remediation":
    "Biến một phát hiện từ audit thành workflow khắc phục an toàn.",
  "aiWorkspace.conversation.disclaimer":
    "<b>Chỉ hỗ trợ và chỉ đọc.</b> Không có gì ở đây xuất bản nội dung, thay đổi cài đặt, khởi chạy job, hay tiêu tốn credit của nhà cung cấp dữ liệu.",
  "aiWorkspace.conversation.emptyState.title":
    "Xây dựng workflow SEO an toàn hơn",
  "aiWorkspace.conversation.emptyState.body":
    "Hãy hỏi về một kế hoạch, một framework ra quyết định, hoặc cách diễn giải bằng chứng sẵn có trong EchoSEO. Bạn vẫn luôn kiểm soát mọi hành động.",
  "aiWorkspace.conversation.preparing": "Đang chuẩn bị workflow…",
  "aiWorkspace.conversation.connectionError":
    "Kết nối tới trợ lý đã thất bại. Hãy tải lại trang và thử lại.",
  "aiWorkspace.conversation.composer.label": "Hỏi trợ lý workflow",
  "aiWorkspace.conversation.composer.placeholder": "Hỏi về một workflow SEO…",
  "aiWorkspace.conversation.composer.send": "Gửi",
  // See en/aiWorkspace.ts: the shared copy control's copy.
  "aiWorkspace.copy.action": "Sao chép",
  "aiWorkspace.copy.ariaLabel": "Sao chép",
  "aiWorkspace.copy.copiedToClipboard": "Đã sao chép vào clipboard",
  "aiWorkspace.copy.clipboardUnavailable": "Clipboard không khả dụng",
  "aiWorkspace.copy.failed": "Không thể sao chép vào clipboard",
} as const;
