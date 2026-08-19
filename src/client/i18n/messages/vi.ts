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

  "seoProvider.section": "Nhà cung cấp dữ liệu SEO",
  "seoProvider.description":
    "Dùng tài khoản DataForSEO của riêng bạn cho dữ liệu từ khóa, thứ hạng, backlink và tên miền. DataForSEO tính phí trực tiếp cho bạn; EchoSEO chỉ chi trả cho các tính năng AI.",
  "seoProvider.platformDefault":
    "Để trống nếu bạn muốn dùng khóa mặc định của nền tảng.",
  "seoProvider.getKey": "Lấy khóa tại dataforseo.com",
  "seoProvider.inputLabel": "Khóa API (base64 của login:password)",
  "seoProvider.placeholder": "Dán khóa API DataForSEO của bạn",
  "seoProvider.checking": "Đang kiểm tra…",
  "seoProvider.loadError": "Không tải được trạng thái khóa DataForSEO.",
  "seoProvider.save": "Lưu khóa",
  "seoProvider.saving": "Đang lưu…",
  "seoProvider.remove": "Xóa",
  "seoProvider.removing": "Đang xóa…",
  "seoProvider.badge.org": "Khóa của bạn",
  "seoProvider.badge.global": "Mặc định nền tảng",
  "seoProvider.badge.none": "Chưa đặt",
  "seoProvider.toast.saved":
    "Đã lưu khóa DataForSEO. Tài khoản của bạn đã trả lời một yêu cầu dữ liệu, sẵn sàng dùng.",
  "seoProvider.toast.savedNotServing":
    "Đã lưu khóa, nhưng DataForSEO chưa trả dữ liệu cho tài khoản này.",
  "seoProvider.toast.savedReadinessUnknown":
    "Đã lưu khóa. Chưa kiểm tra được tài khoản DataForSEO của bạn có lấy được dữ liệu hay không.",
  "seoProvider.notice.notServing":
    "DataForSEO chấp nhận khóa này nhưng từ chối một yêu cầu dữ liệu cho tài khoản đứng sau nó. Điều này xảy ra khi tài khoản mới tinh chưa bắt đầu trả lời, khi số dư đã cạn, hoặc khi tài khoản bị đình chỉ hay bị giới hạn theo địa chỉ IP. Chỉ trường hợp đầu tiên tự hết — mở dashboard DataForSEO để biết bạn đang ở trường hợp nào.",
  "seoProvider.notice.readinessUnknown":
    "Không kết nối được tới DataForSEO để kiểm tra tài khoản này có lấy được dữ liệu hay không, nên khóa được lưu mà chưa xác minh. Mở một trang dùng dữ liệu nhà cung cấp để biết kết quả.",
  "seoProvider.notice.helpLink":
    "Tìm hiểu thêm về tình trạng tài khoản DataForSEO",
  "seoProvider.toast.removed": "Đã xóa khóa DataForSEO.",
  "seoProvider.toast.invalidKey":
    "Khóa DataForSEO bị từ chối. Kiểm tra lại base64 của login:password rồi thử lại.",
  "seoProvider.toast.authFailed":
    "DataForSEO từ chối khóa này. Hoặc khóa sai, hoặc tài khoản đứng sau nó đang bị đình chỉ hay bị giới hạn theo địa chỉ IP.",
  "seoProvider.toast.forbidden":
    "Chỉ chủ sở hữu và quản trị viên workspace mới được đổi khóa DataForSEO.",
  "seoProvider.toast.error": "Không lưu được khóa DataForSEO.",
};
