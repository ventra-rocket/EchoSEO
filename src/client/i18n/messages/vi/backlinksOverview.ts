import type { backlinksOverview as en } from "../en/backlinksOverview";

// Backlinks shell: search card, overview panels, charts, provider/empty/error states, history section and the route heading. See en/backlinksOverview.ts for scope.
//
// "Backlinks" translates as "Liên kết trỏ về" throughout (matches the shipped
// nav.backlinks), shortened to "liên kết" mid-sentence for flow. "hosted" and
// "managed" stay as loanwords describing EchoSEO's deployment model, matching
// the shipped "gói hosted" in common.auth.redirectingBilling. DataForSEO,
// EchoSEO and Ahrefs/DR stay untranslated per the shipped brand/metric list.
export const backlinksOverview: Record<keyof typeof en, string> = {
  "backlinksOverview.route.subtitle":
    "Xem ai đang liên kết đến một site, những gì vừa thay đổi, và trang nào thu hút nhiều liên kết nhất.",

  "backlinksOverview.search.placeholder": "Nhập tên miền hoặc URL",
  "backlinksOverview.search.submit": "Tìm kiếm",
  "backlinksOverview.search.submitting": "Đang tải…",
  "backlinksOverview.search.validation.targetRequired":
    "Nhập tên miền hoặc URL để phân tích.",
  "backlinksOverview.search.validation.tabLimit":
    "Đóng bớt một tab để mở thêm tìm kiếm (tối đa {tabLimit, number}).",

  "backlinksOverview.scope.domain": "Toàn site",
  "backlinksOverview.scope.page": "Đúng trang",

  "backlinksOverview.nav.recentSearches": "Tìm kiếm gần đây",
  "backlinksOverview.overview.target": "Mục tiêu: {target}",
  "backlinksOverview.overview.updated": "Cập nhật {date}",
  "backlinksOverview.overview.updatedFallback": "gần đây",
  "backlinksOverview.overview.pageScopeNotice":
    "Đang hiển thị liên kết trỏ về cho đúng trang này. Nhập tên miền (không kèm đường dẫn) để xem kết quả toàn site. Biểu đồ xu hướng chỉ hiển thị khi tra cứu ở cấp tên miền.",

  "backlinksOverview.summary.backlinks.label": "Liên kết trỏ về",
  "backlinksOverview.summary.backlinks.description":
    "Tổng số liên kết trỏ đến site hoặc trang này.",
  "backlinksOverview.summary.referringDomains.label": "Tên miền trỏ về",
  "backlinksOverview.summary.referringDomains.description":
    "Số tên miền riêng biệt liên kết đến site hoặc trang này.",
  "backlinksOverview.summary.referringPages.label": "Trang trỏ về",
  "backlinksOverview.summary.referringPages.description":
    "Số trang riêng biệt liên kết đến site hoặc trang này.",
  "backlinksOverview.summary.rank.label": "Xếp hạng",
  "backlinksOverview.summary.rank.description":
    "Thang điểm uy tín từ 0-100 của DataForSEO.",
  "backlinksOverview.summary.backlinksSpamScore.label": "Điểm spam liên kết",
  "backlinksOverview.summary.backlinksSpamScore.description":
    "Ước tính mức độ rủi ro spam của các liên kết trỏ đến đây.",
  "backlinksOverview.summary.brokenBacklinks.label": "Liên kết hỏng",
  "backlinksOverview.summary.brokenBacklinks.description":
    "Liên kết trỏ đến các trang bị hỏng ở đây.",
  "backlinksOverview.summary.brokenPages.label": "Trang bị hỏng",
  "backlinksOverview.summary.brokenPages.description":
    "Trang bị hỏng ở đây nhưng vẫn còn liên kết trỏ về.",
  "backlinksOverview.summary.targetSpamScore.label": "Điểm spam mục tiêu",
  "backlinksOverview.summary.targetSpamScore.description":
    "Ước tính mức độ rủi ro spam của site hoặc trang này.",

  "backlinksOverview.chart.growth.title": "Tăng trưởng liên kết",
  "backlinksOverview.chart.growth.description":
    "Liên kết trỏ về và tên miền trỏ về trong năm qua",
  "backlinksOverview.chart.newVsLost.title": "Mới so với đã mất",
  "backlinksOverview.chart.newVsLost.description":
    "Liên kết mới có được và liên kết đã mất",

  "backlinksOverview.chart.trendAriaLabel": "Biểu đồ xu hướng liên kết trỏ về",
  "backlinksOverview.chart.newLostAriaLabel": "Biểu đồ liên kết mới và đã mất",
  "backlinksOverview.chart.empty": "Chưa đủ dữ liệu lịch sử.",
  "backlinksOverview.chart.legend.backlinks": "Liên kết trỏ về",
  "backlinksOverview.chart.legend.referringDomains": "Tên miền trỏ về",
  "backlinksOverview.chart.legend.lostBacklinks": "Liên kết đã mất",
  "backlinksOverview.chart.legend.newBacklinks": "Liên kết mới",

  "backlinksOverview.history.empty": "Nhập tên miền hoặc URL để bắt đầu",
  "backlinksOverview.history.count":
    "{count, plural, other {# tìm kiếm gần đây}}",

  "backlinksOverview.gate.title": "Bật tính năng Liên kết trỏ về",
  "backlinksOverview.gate.body":
    "Tài khoản DataForSEO của bạn chưa bật tính năng Liên kết trỏ về. Bạn có thể bật trong DataForSEO, hoặc dùng EchoSEO managed để truy cập dữ liệu liên kết trỏ về lâu dài với giá {price}/tháng.",
  "backlinksOverview.gate.helper":
    "Chúng tôi cũng đang lên kế hoạch cho một Backlinks API để các ứng dụng self-hosted có thể dùng trực tiếp dữ liệu liên kết trỏ về của EchoSEO. Trong lúc chờ, {link}.",
  "backlinksOverview.gate.helperLink": "dùng EchoSEO managed",
  "backlinksOverview.gate.confirmButton": "Xác nhận quyền truy cập DataForSEO",
  "backlinksOverview.gate.confirming": "Đang xác nhận…",
  "backlinksOverview.gate.externalLabel": "Mở Liên kết trỏ về trên DataForSEO",
  "backlinksOverview.state.errorTitle": "Không thể tải dữ liệu liên kết trỏ về",
  "backlinksOverview.state.errorFallback": "Vui lòng thử lại sau ít phút.",

  "backlinksOverview.error.overviewFallback":
    "Không thể tải dữ liệu liên kết trỏ về.",
  "backlinksOverview.error.invalidTarget":
    "Nhập một tên miền hoặc URL trang hợp lệ.",
  "backlinksOverview.error.tabFallback": "Không thể tải dữ liệu tab này.",
  "backlinksOverview.error.setupStatusFallback":
    "Không thể tải trạng thái thiết lập tính năng Liên kết trỏ về.",

  "backlinksOverview.ahrefs.loadError": "Không thể tải DR từ Ahrefs.",
};
