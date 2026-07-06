import type { Messages } from "./en";

// Vietnamese catalog — machine-translated seed, pending human review (see
// README.md). Typed as `Messages` so the compiler fails if any English key is
// missing or misspelled, guaranteeing catalog parity at build time.
export const vi: Messages = {
  "language.label": "Ngôn ngữ",
  "language.switchLabel": "Đổi ngôn ngữ",
  "language.english": "English",
  "language.vietnamese": "Tiếng Việt",

  "nav.keywordResearch": "Nghiên cứu từ khóa",
  "nav.savedKeywords": "Từ khóa đã lưu",
  "nav.rankTracking": "Theo dõi thứ hạng",
  "nav.searchPerformance": "Hiệu suất tìm kiếm",
  "nav.domainOverview": "Tổng quan tên miền",
  "nav.backlinks": "Liên kết trỏ về",
  "nav.siteAudit": "Kiểm tra website",
  "nav.brandLookup": "Tra cứu thương hiệu",
  "nav.promptExplorer": "Khám phá prompt",
  "nav.aiMcp": "AI & MCP",

  "nav.group.keywords": "Từ khóa",
  "nav.group.domain": "Tên miền",
  "nav.group.aiVisibility": "Hiện diện AI",

  "nav.toggleSidebar": "Bật/tắt thanh bên",
  "nav.closeSidebar": "Đóng thanh bên",

  "account.menuLabel": "Mở menu tài khoản",
  "account.help": "Trợ giúp & Cộng đồng",
  "account.billing": "Thanh toán",
  "account.settings": "Cài đặt",
  "account.signOut": "Đăng xuất",
};
