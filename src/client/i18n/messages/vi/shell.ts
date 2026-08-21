import type { shell as en } from "@/client/i18n/messages/en/shell";

// App chrome — top nav, sidebar, project switcher, account menu.
export const shell: Record<keyof typeof en, string> = {
  "language.label": "Ngôn ngữ",
  "language.switchLabel": "Đổi ngôn ngữ",
  "language.english": "English",
  "language.vietnamese": "Tiếng Việt",

  "nav.keywordResearch": "Nghiên cứu từ khóa",
  "nav.overview": "Tổng quan",
  "nav.savedKeywords": "Từ khóa đã lưu",
  "nav.rankTracking": "Theo dõi thứ hạng",
  "nav.searchPerformance": "Hiệu suất tìm kiếm",
  "nav.domainOverview": "Tổng quan tên miền",
  "nav.backlinks": "Liên kết trỏ về",
  "nav.siteAudit": "Kiểm tra website",
  "nav.brandLookup": "Tra cứu thương hiệu",
  "nav.promptExplorer": "Khám phá prompt",
  "nav.aiMcp": "AI & MCP",
  "nav.assistantWorkspace": "Không gian AI",

  "nav.group.keywords": "Từ khóa",
  "nav.group.domain": "Tên miền",
  "nav.group.aiVisibility": "Hiện diện AI",

  "nav.toggleSidebar": "Bật/tắt thanh bên",
  "nav.closeSidebar": "Đóng thanh bên",

  "shell.skipToContent": "Bỏ qua tới nội dung chính",
  "shell.primaryNavigation": "Điều hướng chính",
  "shell.navigationMenu": "Menu điều hướng",
  "shell.expandNavigation": "Mở rộng điều hướng",

  "projectSwitcher.switch": "Đổi dự án",
  "projectSwitcher.select": "Chọn dự án",
  "projectSwitcher.manage": "Quản lý dự án",

  "account.menuLabel": "Mở menu tài khoản",
  "account.help": "Trợ giúp & Cộng đồng",
  "account.billing": "Thanh toán",
  "account.members": "Thành viên",
  "account.settings": "Cài đặt",
  "account.signOut": "Đăng xuất",
  "account.workspaces": "Workspace",
  "account.workspaceSwitchError": "Không thể chuyển workspace",

  "shell.setupNeeded.warning":
    "Cần thiết lập: hãy thêm khóa API DataForSEO để dùng các tính năng của EchoSEO. Xem các bước nhanh trên <helpLink>trang trợ giúp</helpLink>.",
  "shell.setupNeeded.verifyError":
    "Chúng tôi không thể xác minh thiết lập DataForSEO của bạn. Nếu tính năng không hoạt động, hãy kiểm tra các bước thiết lập trên <helpLink>trang trợ giúp</helpLink>.",

  "shell.setupModal.title": "Chỉ còn một bước thiết lập",
  "shell.setupModal.body":
    "Hãy thêm khóa API DataForSEO để bắt đầu dùng EchoSEO.",
  "shell.setupModal.dismiss": "Bỏ qua",
  "shell.setupModal.openGuide": "Mở hướng dẫn thiết lập",
};
