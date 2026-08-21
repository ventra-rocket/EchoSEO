import type { auditOps as en } from "@/client/i18n/messages/en/auditOps";

export const auditOps: Record<keyof typeof en, string> = {
  // Audit — exports (src/client/features/audit/exports/**)
  "audit.exports.heading": "Xuất",
  "audit.exports.subheading": "chế độ xem hiện tại · mỗi lần chỉ xuất một bản",
  "audit.exports.reportLanguageLabel": "Ngôn ngữ báo cáo",
  "audit.exports.startError": "Không thể bắt đầu xuất",
  "audit.exports.format.zip": "Dữ liệu lỗi (CSV + JSON)",
  "audit.exports.format.pdf": "Báo cáo (PDF)",
  "audit.exports.format.doc": "Báo cáo (có thể chỉnh sửa)",
  "audit.exports.download": "Tải xuống",
  "audit.exports.status.building": "Đang tạo…",
  "audit.exports.status.failedDefault": "Thất bại",
  "audit.exports.status.expired": "Đã hết hạn",
  "audit.exports.status.issueCount": "{count, plural, other {# lỗi}}",

  // Audit — indexnow (src/client/features/audit/indexnow/**)
  "audit.indexnow.heading": "IndexNow",
  "audit.indexnow.description":
    "Thông báo cho các công cụ tìm kiếm tham gia (Bing, Yandex và các công cụ khác — không gồm Google) rằng các trang có thể lập chỉ mục của bạn đã thay đổi. Biên nhận nghĩa là đã được chấp nhận, không phải đã lập chỉ mục.",
  "audit.indexnow.setupButton": "Thiết lập IndexNow",
  "audit.indexnow.setupError": "Không thể thiết lập IndexNow.",
  "audit.indexnow.hostFileInstructions":
    "Đặt file này tại thư mục gốc domain của bạn, sau đó xác minh:",
  "audit.indexnow.fileContentsLabel": "Nội dung file:",
  "audit.indexnow.checkVerificationButton": "Kiểm tra xác minh",
  "audit.indexnow.verifiedToast": "Đã xác minh file khóa IndexNow.",
  "audit.indexnow.notReachableToast": "Chưa truy cập được file khóa tại host.",
  "audit.indexnow.verificationFailedError": "Xác minh thất bại.",
  "audit.indexnow.submitButton": "{count, plural, other {Gửi # URL}}",
  "audit.indexnow.notVerifiedToast":
    "Hãy đặt file khóa IndexNow tại host của bạn và xác minh trước khi gửi.",
  "audit.indexnow.noUrlsToast":
    "Không có URL nào có thể lập chỉ mục để gửi cho lần kiểm tra này.",
  "audit.indexnow.submittedToast":
    "{count, plural, other {Đã gửi # URL tới IndexNow.}}",
  "audit.indexnow.returnedError": "IndexNow trả về {status}.",
  "audit.indexnow.genericError": "một lỗi",
  "audit.indexnow.submissionFailedError": "Gửi thất bại.",
  "audit.indexnow.notReachableNotice":
    "Chưa truy cập được file khóa — hãy đặt file tại host rồi kiểm tra lại.",
  "audit.indexnow.recentSubmissionsHeading": "Các lượt gửi gần đây",
  "audit.indexnow.actionSubmittedCount": "{count, plural, other {# URL}}",
  "audit.indexnow.action.succeeded": "thành công",
  "audit.indexnow.action.failed": "thất bại",

  // Audit — reports (src/client/features/audit/reports/**)
  "audit.reports.heading": "Báo cáo hàng tuần",
  "audit.reports.description":
    "Mỗi thứ Hai lúc 08:00 (UTC+7), chúng tôi crawl lại site này rồi gửi email những gì đã thay đổi — lỗi mới kèm đúng các bước khắc phục ở trên cùng, số liệu Search Console ở phía dưới. Các vấn đề nghiêm trọng được gửi email ngay khi một lần crawl phát hiện ra, tối đa một lần mỗi ngày.",
  "audit.reports.recipientLabel": "Gửi báo cáo tới",
  "audit.reports.emailPlaceholder": "seo@example.com",
  "audit.reports.askAgainButton": "Hỏi lại",
  "audit.reports.saveButton": "Lưu",
  "audit.reports.turnOnButton": "Bật báo cáo hàng tuần",
  "audit.reports.pauseButton": "Tạm dừng",
  "audit.reports.resumeButton": "Tiếp tục",
  "audit.reports.enabledToast":
    "Đã bật báo cáo hàng tuần. Báo cáo đầu tiên sẽ gửi vào thứ Hai.",
  "audit.reports.saveError": "Không thể lưu cài đặt báo cáo.",
  "audit.reports.resumedToast": "Đã tiếp tục báo cáo hàng tuần.",
  "audit.reports.pausedToast": "Đã tạm dừng báo cáo hàng tuần.",
  "audit.reports.scheduleError": "Không thể thay đổi lịch.",
  "audit.reports.unsubscribedStatus":
    "{email} đã hủy đăng ký vào {date} · nhập lại địa chỉ ở trên và lưu để hỏi lại",
  "audit.reports.activeStatus":
    "Đang bật · crawl tối đa {maxPages} trang mỗi lần",
  "audit.reports.pausedStatus":
    "Đã tạm dừng · không crawl và không gửi email cho đến khi bạn tiếp tục",
  "audit.reports.lastSentSuffix": " · lần gửi gần nhất {date}",
};
