import type { commandCenter as en } from "@/client/i18n/messages/en/commandCenter";

// Project command center — the overview page's freshness, next-action,
// signal, health and priority-queue cards.
export const commandCenter: Record<keyof typeof en, string> = {
  "commandCenter.eyebrow": "Tổng quan dự án",
  "commandCenter.noDomain": "Chưa cấu hình tên miền",
  "commandCenter.refresh": "Làm mới",
  "commandCenter.refreshAria": "Làm mới tổng quan dự án",
  "commandCenter.loadError": "Không thể tải tổng quan dự án này.",
  "commandCenter.retry": "Thử lại",
  "commandCenter.signalsLabel": "Tín hiệu dự án",

  "commandCenter.freshness.auditCompleted": "Kiểm tra hoàn tất gần nhất {date}",
  "commandCenter.freshness.auditCompletedUnknown":
    "Đã hoàn tất kiểm tra (không rõ thời điểm)",
  "commandCenter.freshness.auditRunning":
    "Đang kiểm tra · {crawled}/{total} trang",
  "commandCenter.freshness.auditQueued": "Kiểm tra đang chờ chạy",
  "commandCenter.freshness.auditFailed": "Lần kiểm tra gần nhất chưa hoàn tất",
  "commandCenter.freshness.auditNone": "Chưa chạy lần kiểm tra nào",
  "commandCenter.freshness.auditUnavailable": "Không có trạng thái kiểm tra",

  "commandCenter.nextAction.eyebrow": "Hành động tiếp theo",
  "commandCenter.nextAction.completeTitle": "Nền tảng đã kết nối",
  "commandCenter.nextAction.completeBody":
    "Các tín hiệu cốt lõi của dự án đã được kết nối. Dùng bằng chứng bên dưới để chọn việc SEO tiếp theo.",
  "commandCenter.nextAction.incompleteTitle": "Chưa đủ dữ liệu gợi ý",
  "commandCenter.nextAction.incompleteBody":
    "Một số tín hiệu của dự án hiện không khả dụng nên chưa thể xác nhận bước tiếp theo. Hãy làm mới để thử lại.",

  "commandCenter.action.addDomain.title": "Thêm tên miền website",
  "commandCenter.action.addDomain.body":
    "Gán tên miền cho dự án để mọi quy trình SEO có mục tiêu rõ ràng.",
  "commandCenter.action.connectGsc.title": "Kết nối Google Search Console",
  "commandCenter.action.connectGsc.body":
    "Đưa dữ liệu hiệu suất tìm kiếm chính chủ vào dự án này.",
  "commandCenter.action.runAudit.title": "Chạy lần kiểm tra website đầu tiên",
  "commandCenter.action.runAudit.body":
    "Tìm lỗi kỹ thuật và nội dung trước khi quyết định sửa gì.",
  "commandCenter.action.fixIssues.title": "Xem các lỗi kiểm tra ưu tiên",
  "commandCenter.action.fixIssues.body":
    "{critical} nhóm lỗi nghiêm trọng và {high} nhóm lỗi ưu tiên cao cần xử lý.",
  "commandCenter.action.addKeywords.title": "Bắt đầu theo dõi từ khóa ưu tiên",
  "commandCenter.action.addKeywords.body":
    "Thiết lập bộ từ khóa để theo dõi biến động thứ hạng theo thời gian.",

  "commandCenter.signal.auditEvidence": "Bằng chứng kiểm tra",
  "commandCenter.signal.priorityIssues": "Lỗi ưu tiên",
  "commandCenter.signal.trackedKeywords": "Từ khóa theo dõi",
  "commandCenter.signal.aiWorkspace": "Không gian AI",

  "commandCenter.value.unavailable": "Không khả dụng",
  "commandCenter.value.noAudit": "Chưa có kiểm tra",
  "commandCenter.value.auditFailed": "Kiểm tra thất bại",
  "commandCenter.value.auditQueued": "Đang chờ",
  "commandCenter.value.pages": "{crawled}/{total} trang",
  "commandCenter.value.waitingForAudit": "Chờ kiểm tra",
  "commandCenter.value.stillAnalyzing": "Đang phân tích",
  "commandCenter.value.issueGroups": "{count, plural, other {# nhóm lỗi}}",
  "commandCenter.value.notConfigured": "Chưa cấu hình",
  "commandCenter.value.assistedWorkflows": "Quy trình hỗ trợ",
  "commandCenter.value.viaMcpClient": "Qua MCP client của bạn",

  "commandCenter.detail.sourceCrawl": "Nguồn: crawl website",
  "commandCenter.detail.crawlInProgress": "Đang crawl",
  "commandCenter.detail.auditIncomplete": "Kiểm tra chưa hoàn tất",
  "commandCenter.detail.sourceAudit": "Nguồn: kiểm tra website",
  "commandCenter.detail.completedAudit":
    "Lần kiểm tra hoàn tất gần nhất {date}",
  "commandCenter.detail.fromLastCompletedAudit":
    "Từ lần kiểm tra hoàn tất gần nhất {date}",
  "commandCenter.detail.sourceRank": "Nguồn: theo dõi thứ hạng",
  "commandCenter.detail.rankNeverRun": "Chưa có lần chạy hoàn tất",
  "commandCenter.detail.rankSingle": "Cập nhật {date}",
  "commandCenter.detail.rankRange": "Cập nhật {oldest} – {newest}",
  "commandCenter.detail.rankMixed":
    "Thời điểm chạy khác nhau giữa các bộ theo dõi",
  "commandCenter.detail.aiWorkspace": "Lập kế hoạch và phân tích chỉ đọc",
  "commandCenter.detail.aiWorkspaceHosted":
    "Chat trong ứng dụng đang tắt; kết nối agent qua MCP",

  "commandCenter.health.title": "Tình trạng dữ liệu",
  "commandCenter.health.searchConsole": "Search Console",
  "commandCenter.health.siteAudit": "Kiểm tra website",
  "commandCenter.health.rankTracking": "Theo dõi thứ hạng",
  "commandCenter.health.connected": "Đã kết nối",
  "commandCenter.health.notConnected": "Chưa kết nối",
  "commandCenter.health.auditCompleted": "Hoàn tất · {crawled}/{total} trang",
  "commandCenter.health.auditRunning": "Đang chạy · {crawled}/{total} trang",
  "commandCenter.health.auditFailed": "Thất bại · {crawled}/{total} trang",
  "commandCenter.health.auditQueued": "Đang chờ",
  "commandCenter.health.rankSummary":
    "{keywords} từ khóa trên {trackers, plural, other {# bộ theo dõi}}",

  "commandCenter.priority.eyebrow": "Hàng đợi ưu tiên",
  "commandCenter.priority.heading": "Bằng chứng trước hành động",
  "commandCenter.priority.openAudit": "Mở kiểm tra",
  "commandCenter.priority.unavailable":
    "Dữ liệu kiểm tra tạm thời không khả dụng. Hãy tải lại trang để làm mới.",
  "commandCenter.priority.critical": "Nhóm lỗi nghiêm trọng",
  "commandCenter.priority.high": "Nhóm lỗi ưu tiên cao",
  "commandCenter.priority.source":
    "Nguồn: crawl đã hoàn tất. Mở kiểm tra để xem các URL bị ảnh hưởng và hướng dẫn khắc phục.",
  "commandCenter.priority.fromLastCompleted":
    "Các số liệu này phản ánh lần kiểm tra hoàn tất gần nhất, không phải lần đang chạy.",
  "commandCenter.priority.materializing":
    "Các lỗi vẫn đang được tổng hợp. EchoSEO sẽ không hiển thị kết quả sạch cho tới khi phân tích hoàn tất.",
  "commandCenter.priority.clean":
    "Không có nhóm lỗi nghiêm trọng hay ưu tiên cao trong lần kiểm tra hoàn tất gần nhất.",
  "commandCenter.priority.runAudit":
    "Chạy kiểm tra website để tạo danh sách ưu tiên có bằng chứng cho dự án này.",

  "commandCenter.provenance.title": "Nguồn dữ liệu",
  "commandCenter.provenance.body":
    "EchoSEO chỉ báo cáo các tín hiệu đã kết nối với dự án này. Trang này không kích hoạt bất kỳ yêu cầu dữ liệu bên ngoài nào.",
  "commandCenter.provenance.dataForSeoConfigured": "DataForSEO: đã cấu hình",
  "commandCenter.provenance.dataForSeoNotConfigured":
    "DataForSEO: chưa cấu hình",
};
