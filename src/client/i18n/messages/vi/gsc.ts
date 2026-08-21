import type { gsc as en } from "../en/gsc";

// Google Search Console connect surfaces — see en/gsc.ts for scope.
//
// "Search Console"/"Google Search Console" stay untranslated (shipped
// convention). "Domain property" and "URL-prefix property" also stay in
// English inside Vietnamese sentences, matching the shipped
// audit.chrome.launch.verificationGateMismatch and
// audit.search.signals.propertyMismatch precedent: these are Search
// Console's own property-type names, not generic English words, and
// "property" itself stays untranslated the same way. "crawl", "workspace",
// "credit" and "deployment" stay as the loanwords already used throughout
// this catalog (see auditPanels.ts, auditChrome.ts, members.ts).
export const gsc: Record<keyof typeof en, string> = {
  "gsc.connectWithGoogle": "Kết nối với Google",
  "gsc.reconnectWithGoogle": "Kết nối lại với Google",
  "gsc.disconnect": "Ngắt kết nối",
  "gsc.cancel": "Hủy",
  "gsc.tryAgain": "Thử lại",

  "gsc.card.title": "Google Search Console",
  "gsc.card.subtitle": "Dữ liệu tìm kiếm của bạn, lấy trực tiếp từ Google.",
  "gsc.card.checking": "Đang kiểm tra…",
  "gsc.card.pitch":
    "Lượt nhấp, lượt hiển thị và thứ hạng thật. Không tốn credit.",
  "gsc.card.status.connected": "Đã kết nối",
  "gsc.card.status.setupRequired": "Cần thiết lập",
  "gsc.card.status.notConnected": "Chưa kết nối",
  "gsc.card.connectedToast": "Đã kết nối Search Console",
  "gsc.card.disconnectedToast": "Đã ngắt kết nối Search Console",
  "gsc.connectedState.connectedBy": "Kết nối bởi {email}",
  "gsc.connectedState.changeProperty": "Đổi property",

  "gsc.sitePicker.loading": "Đang tải danh sách property…",
  "gsc.sitePicker.propertyLabel": "Property",
  "gsc.sitePicker.selectPlaceholder": "Chọn một property…",
  "gsc.sitePicker.noAccessSuffix": "  (không có quyền truy cập)",
  "gsc.sitePicker.saving": "Đang lưu…",
  "gsc.sitePicker.saveProperty": "Lưu property",
  "gsc.failure.notConnected":
    "Chưa có tài khoản Google nào được kết nối. Hãy kết nối một tài khoản để chọn property Search Console.",
  "gsc.failure.consentBlocked":
    "Google đã từ chối quyền truy cập Search Console cho tài khoản này. Nếu tổ chức của bạn quản lý tài khoản này, cần một quản trị viên cho phép ứng dụng này; nếu không, hãy kết nối lại và chấp nhận quyền Search Console.",
  "gsc.failure.grantExpired":
    "Kết nối đã hết hạn. Hãy kết nối lại để tiếp tục.",
  "gsc.failure.providerError":
    "Search Console không phản hồi. Đây thường là giới hạn tốc độ tạm thời — hãy thử lại sau một phút.",

  "gsc.import.title": "Nhập từ Search Console",
  "gsc.import.description":
    "Mỗi property trở thành một dự án riêng, được kết nối với property đó — nhờ vậy số liệu Search Console, các lần kiểm tra và báo cáo của dự án chỉ nói về một site duy nhất.",
  "gsc.import.loadError":
    "Không thể đọc danh sách property Search Console của bạn.",
  "gsc.import.empty":
    "Tài khoản Google này không có property Search Console nào.",
  "gsc.import.clearSelection": "Bỏ chọn",
  "gsc.import.selectAll": "Chọn tất cả {count}",
  "gsc.import.selectedCount": "Đã chọn {count}",
  "gsc.import.block.alreadyImported": "Đã nhập",
  "gsc.import.block.unverified": "Chưa xác minh cho bạn",
  "gsc.import.block.unsupported": "Không thể crawl",
  "gsc.import.block.pathScoped": "Giới hạn theo path",
  "gsc.import.candidate.kind.domain": "Domain property",
  "gsc.import.candidate.kind.urlPrefix": "URL-prefix property",
  "gsc.import.candidate.propertyMeta": "{kind} · dự án {host}",
  "gsc.import.candidate.pathScopedReason":
    "Search Console chỉ báo cáo dữ liệu trong đúng path mà property này bao phủ — hãy kết nối một Domain property, hoặc một property URL-prefix trỏ đúng gốc site, để nhập được site này.",
  "gsc.import.candidate.notCrawlable":
    "Không phải site mà ứng dụng này có thể crawl",
  "gsc.import.startAudits.label":
    "Chạy lần crawl đầu tiên cho từng site đã nhập",
  "gsc.import.startAudits.hint":
    "Các lượt crawl bắt đầu lần lượt từng site một. Khi vượt giới hạn khởi chạy theo giờ, các site còn lại vẫn được nhập và sẽ báo rõ điều đó.",
  "gsc.import.submitError": "Không thể nhập các property đó.",
  "gsc.import.submitButton": "Nhập",
  "gsc.import.submitButtonCount": "Nhập {count}",
  "gsc.import.outcome.title": "Kết quả nhập",
  "gsc.import.outcome.created": "Đã tạo dự án {host}",
  "gsc.import.outcome.duplicate": "Đã nhập trước đó — giữ nguyên",
  "gsc.import.outcome.failedDefault": "Không thể nhập",
  "gsc.import.outcome.auditStarted": " · đang chạy crawl đầu tiên",
  "gsc.import.outcome.auditThrottled":
    " · chưa chạy crawl: đã đạt giới hạn theo giờ",
  "gsc.import.outcome.auditUnavailable": " · chưa chạy crawl cho workspace này",
  "gsc.import.outcome.done": "Xong",
  "gsc.import.reconnectPrompt.body":
    "Kết nối Google của bạn không còn truy cập được Search Console. Hãy kết nối lại để danh sách property hiện ra trở lại.",
  "gsc.import.reconnectPrompt.button": "Kết nối lại Google",

  "gsc.reEngagement.title": "Mới: Kết nối Google Search Console",
  "gsc.reEngagement.body":
    "Đưa lượt nhấp, lượt hiển thị và thứ hạng thật của bạn vào EchoSEO, rồi truy vấn qua Claude hoặc Codex bằng MCP. Việc này không bao giờ tốn credit.",
  "gsc.reEngagement.maybeLater": "Để sau",

  "gsc.selfHosted.title": "Chưa cấu hình Google OAuth client",
  "gsc.selfHosted.body":
    "Hãy thêm Google client ID và client secret vào deployment EchoSEO này trước khi kết nối Search Console.",
  "gsc.selfHosted.setupGuideLabel": "Mở hướng dẫn thiết lập",

  "gsc.startLink.error": "Không thể bắt đầu đăng nhập Google",
};
