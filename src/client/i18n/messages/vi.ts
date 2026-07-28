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

  "account.menuLabel": "Mở menu tài khoản",
  "account.help": "Trợ giúp & Cộng đồng",
  "account.billing": "Thanh toán",
  "account.members": "Thành viên",
  "account.settings": "Cài đặt",
  "account.signOut": "Đăng xuất",
  "account.workspaces": "Workspace",
  "account.workspaceSwitchError": "Không thể chuyển workspace",

  "members.title": "Thành viên",
  "members.subtitle":
    "Mời đồng đội vào workspace và quản lý quyền truy cập của họ.",
  "members.hostedOnly": "Quản lý thành viên chỉ có ở gói hosted.",
  "members.noAccess":
    "Chỉ chủ sở hữu và quản trị viên mới quản lý được thành viên.",
  "members.you": "Bạn",

  "members.invite.title": "Mời đồng đội",
  "members.invite.emailLabel": "Địa chỉ email",
  "members.invite.roleLabel": "Vai trò",
  "members.invite.submit": "Mời",
  "members.invite.sent": "Đã gửi lời mời.",
  "members.invite.error": "Không thể gửi lời mời đó.",
  "members.invite.cancelError": "Không thể huỷ lời mời đó.",

  "members.list.title": "Thành viên",
  "members.list.error": "Không thể tải danh sách thành viên.",

  "members.role.owner": "Chủ sở hữu",
  "members.role.admin": "Quản trị viên",
  "members.role.editor": "Biên tập",
  "members.role.viewer": "Chỉ xem",
  "members.role.change": "Đổi vai trò",
  "members.role.error": "Không thể đổi vai trò đó.",

  "members.remove.label": "Xoá thành viên",
  "members.remove.done": "Đã xoá thành viên.",
  "members.remove.error": "Không thể xoá thành viên đó.",

  "members.invites.title": "Lời mời đang chờ",
  "members.invites.empty": "Không có lời mời đang chờ.",
  "members.invites.error": "Không thể tải danh sách lời mời.",
  "members.invites.cancel": "Huỷ",
  "members.invites.expired": "Hết hạn",

  "invite.title": "Lời mời vào workspace",
  "invite.body": "Bạn được mời tham gia {organization}.",
  "invite.aWorkspace": "một workspace",
  "invite.accept": "Chấp nhận",
  "invite.decline": "Từ chối",
  "invite.accepted": "Đã chấp nhận lời mời.",
  "invite.acceptError": "Không thể chấp nhận lời mời đó.",
  "invite.declineError": "Không thể từ chối lời mời đó.",
  "invite.unavailable": "Lời mời này không còn khả dụng.",
};
