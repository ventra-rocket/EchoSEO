import type { auditChrome as en } from "@/client/i18n/messages/en/auditChrome";

// Audit — chrome (route shell, launch, verification, search)
export const auditChrome: Record<keyof typeof en, string> = {
  "audit.chrome.heading": "Kiểm tra website",
  "audit.chrome.allAudits": "← Tất cả lượt kiểm tra",
  "audit.chrome.backToAudits": "← Quay lại danh sách kiểm tra",
  "audit.chrome.loadError":
    "Không thể tải lần kiểm tra này. Có thể lần kiểm tra đã bị xóa.",
  "audit.chrome.startedAt": "{hostname} · Bắt đầu {startedAt}",

  "audit.chrome.failed.title": "Lần kiểm tra này đã dừng trước khi hoàn tất.",
  "audit.chrome.failed.reported": "Thông báo lỗi: <mono>{errorMessage}</mono>",
  "audit.chrome.failed.noReason":
    "Không có lý do nào được ghi nhận cho lần chạy này.",
  "audit.chrome.failed.retry":
    "Hãy chạy lại; nếu vẫn dừng theo cách tương tự, hãy báo cho chúng tôi qua <support>trang hỗ trợ</support> kèm thông báo ở trên.",

  "audit.chrome.thinCrawl.noPages": "Không đọc được trang nào trên site này.",
  "audit.chrome.thinCrawl.onlyFirstPage": "Chỉ đọc được trang đầu tiên.",
  "audit.chrome.thinCrawl.body":
    "Có thể site này chặn truy cập tự động, hoặc URL bắt đầu không liên kết tới trang nào khác mà chúng tôi được phép theo dõi. Hãy kiểm tra xem <mono>{hostname}/robots.txt</mono> có cho phép crawl không, rồi thử lại — <support>trang hỗ trợ</support> có thể giúp nếu tình trạng này vẫn tiếp diễn.",

  "audit.chrome.status.running": "Đang chạy",
  "audit.chrome.status.done": "Hoàn tất",
  "audit.chrome.status.failed": "Thất bại",

  "audit.chrome.launch.title": "Bắt đầu kiểm tra mới",
  "audit.chrome.launch.readOnlyNotice":
    "Bạn chỉ có quyền xem trong workspace này, nên có thể xem lại các lần kiểm tra hiện có nhưng không thể bắt đầu lần kiểm tra mới.",
  "audit.chrome.launch.submitStarting": "Đang bắt đầu…",
  "audit.chrome.launch.submit": "Bắt đầu kiểm tra",
  "audit.chrome.launch.crawlLimitLabel": "Giới hạn crawl",
  "audit.chrome.launch.maxPagesLabel": "Số trang tối đa",
  "audit.chrome.launch.pagesRangeHint":
    "Nhập một giá trị bất kỳ từ {min} đến {max}.",
  "audit.chrome.launch.lighthouseTooltip":
    "Lighthouse đo hiệu năng các trang của bạn và phát hiện vấn đề.",
  "audit.chrome.launch.includeLighthouse": "Bao gồm Lighthouse",
  "audit.chrome.launch.lighthouseSampleNote":
    "Chúng tôi chọn mẫu 20 trang để kiểm tra, loại bỏ các trang trùng template.",
  "audit.chrome.launch.lighthouseNeedsKey":
    "Lighthouse cần một khóa DataForSEO — hãy thêm khóa trong phần Cài đặt.",
  "audit.chrome.launch.verificationConnected":
    "Đã kết nối property Search Console ({url}). Được phép crawl trên {threshold} trang trên các domain mà property này xác thực — tức host đó và mọi subdomain của nó.",
  "audit.chrome.launch.verificationRequired":
    "Crawl trên {threshold} trang yêu cầu một property Search Console đã xác thực khớp với domain.",
  "audit.chrome.launch.verificationGateMismatch":
    "{domain} chưa được xác thực bởi property Search Console đang kết nối ({url}), nên chỉ có thể crawl tối đa {limit} trang. Hãy kết nối một property bao phủ {domain} — một Domain property sẽ bao phủ mọi subdomain — để crawl nhiều hơn.",
  "audit.chrome.launch.verificationGateNone":
    "Chưa có property Search Console nào được kết nối, nên {domain} chỉ có thể crawl tối đa {limit} trang. Hãy kết nối một property phù hợp trong phần Cài đặt để crawl nhiều hơn.",
  "audit.chrome.launch.crawlLimitButton": "Crawl {limit} trang",
  "audit.chrome.launch.urlRequired": "Vui lòng nhập URL.",
  "audit.chrome.launch.startedToast": "Đã bắt đầu kiểm tra!",
  "audit.chrome.launch.startError": "Không thể bắt đầu kiểm tra",
  "audit.chrome.launch.deletedToast": "Đã xóa lần kiểm tra",
  "audit.chrome.launch.confirmTitle": "Crawl tối đa {maxPages} trang?",
  "audit.chrome.launch.confirmBody":
    "{startUrl} — crawl với quy mô này vẫn ổn, chỉ là sẽ mất một chút thời gian. Việc này chạy nền, nên bạn có thể rời khỏi trang này và quay lại sau.",
  "audit.chrome.launch.cancel": "Hủy",
  "audit.chrome.launch.confirmStart": "Bắt đầu crawl",

  "audit.chrome.history.empty": "Chưa có lần kiểm tra nào",
  "audit.chrome.history.title": "Các lần kiểm tra trước",
  "audit.chrome.history.columnDate": "Ngày",
  "audit.chrome.history.columnUrl": "URL",
  "audit.chrome.history.columnStatus": "Trạng thái",
  "audit.chrome.history.columnPages": "Số trang",
  "audit.chrome.history.columnLighthouse": "Lighthouse",
  "audit.chrome.history.yes": "Có",
  "audit.chrome.history.view": "Xem",
  "audit.chrome.history.actionsLabel": "Thao tác kiểm tra",
  "audit.chrome.history.delete": "Xóa lần kiểm tra",

  // Audit — verification (src/client/features/audit/verification/**)
  "audit.verification.recrawlStarted":
    "Đã bắt đầu crawl lại — đang xác minh các bản sửa của bạn.",
  "audit.verification.recrawlError": "Không thể bắt đầu crawl lại.",
  "audit.verification.recrawlButton": "Crawl lại để xác minh",
  "audit.verification.pending":
    "Kết quả xác minh sẽ hiển thị khi lần crawl lại này xử lý xong các lỗi.",
  "audit.verification.baselineUnavailable":
    "Lần crawl baseline không còn để đối chiếu các bản sửa này nữa.",
  "audit.verification.title": "Xác minh bản sửa",
  "audit.verification.baselineDate": "so với lần crawl baseline ngày {date}",
  "audit.verification.stats.resolved": "Đã xử lý",
  "audit.verification.stats.stillPresent": "Vẫn còn",
  "audit.verification.stats.inconclusive": "Chưa xác định",
  "audit.verification.stats.regressions": "Hồi quy",
  "audit.verification.inconclusiveNote":
    "Chưa được crawl lại nên chưa thể xác nhận bản sửa",
  "audit.verification.inconclusiveTruncated": "(chỉ hiển thị 200 mục đầu)",

  // Audit — search (src/client/features/audit/search/**)
  "audit.search.referring.loadError":
    "Không thể tải dữ liệu off-page cho lần kiểm tra này.",
  "audit.search.referring.accessCheckFailed":
    "Chúng tôi không thể kiểm tra xem có thể lấy dữ liệu off-page cho site này hay không.",
  "audit.search.referring.tryAgainShortly": "Hãy thử lại sau ít phút.",
  "audit.search.referring.cannotTrigger":
    "Hãy nhờ biên tập viên hoặc chủ sở hữu workspace lấy dữ liệu off-page cho site này.",
  "audit.search.referring.refreshError": "Không thể lấy dữ liệu off-page",
  "audit.search.referring.noSnapshot":
    "Chưa có lần đọc off-page nào được lấy cho site này. Việc lấy dữ liệu sẽ kéo số tên miền trỏ về hiện tại từ DataForSEO và lưu lại, nên xem lại sau đó không tốn gì và một xu hướng sẽ dần hình thành theo thời gian.",
  "audit.search.referring.metricDomains": "Tên miền trỏ về",
  "audit.search.referring.metricNew": "Mới (theo kỳ nhà cung cấp)",
  "audit.search.referring.metricLost": "Mất (theo kỳ nhà cung cấp)",
  "audit.search.referring.trendLabel":
    "tên miền trỏ về so với lần đọc trước ({from} → {to})",
  "audit.search.referring.sourceLine":
    "Nguồn: {provider} · {target} · {coverage} · truy vấn lúc {date}",
  "audit.search.referring.providerDisabled":
    "Nhà cung cấp dữ liệu backlink chưa được bật cho deployment này.",
  "audit.search.referring.fetchLabel": "Lấy dữ liệu off-page",
  "audit.search.referring.refreshLabel": "Làm mới dữ liệu off-page",
  "audit.search.referring.confirmSpend":
    "Thao tác này sẽ dùng một credit. Tiếp tục?",
  "audit.search.referring.confirm": "Xác nhận",
  "audit.search.referring.cancel": "Hủy",
  "audit.search.referring.actionUsesCredits": "{label} · dùng credit",

  "audit.search.signals.loadError":
    "Không thể tải dữ liệu Search Console cho lần kiểm tra này.",
  "audit.search.signals.notConnected":
    "Hãy kết nối Google Search Console cho dự án này để xem lưu lượng organic và thay đổi thứ hạng của site.",
  "audit.search.signals.propertyMismatch":
    "Property Search Console đang kết nối (<mono>{property}</mono>) không bao phủ domain của lần kiểm tra này, nên dữ liệu tìm kiếm không hiển thị ở đây. Hãy kết nối property khớp với site này.",
  "audit.search.signals.noData": "Chưa có dữ liệu Search Console cho {window}.",
  "audit.search.signals.metricClicks": "Lượt click organic",
  "audit.search.signals.metricImpressions": "Lượt hiển thị",
  "audit.search.signals.vsPrevious": "so với trước đó ({previous})",
  "audit.search.signals.top10Empty":
    "Không có trang nào rớt khỏi top 10 trong khoảng thời gian này.",
  "audit.search.signals.top10Header":
    "{count, plural, other {# trang}} rớt khỏi top 10",
  "audit.search.signals.notInResults": "không có trong kết quả",
  "audit.search.signals.positionChange": "TB {from} → {to}",
  "audit.search.signals.sourceLine":
    "Nguồn: GSC · {property} · {current} so với {previous}",
  "audit.search.signals.windowRange": "{from} đến {to}",

  // Audit — indexing (src/client/features/audit/indexing/**)
  "audit.indexing.heading": "Google Search Console",
  "audit.indexing.description":
    "Kiểm tra cách Google nhìn nhận các trang của bạn. Việc kiểm tra này chỉ đọc dữ liệu — yêu cầu lập chỉ mục hoặc gửi sitemap được thực hiện trong Search Console.",
  "audit.indexing.notConnected":
    "Hãy kết nối Google Search Console cho dự án này để kiểm tra trạng thái lập chỉ mục.",
  "audit.indexing.propertyMismatch":
    "Property đang kết nối (<mono>{property}</mono>) không bao phủ site này, nên không thể hiển thị dữ liệu lập chỉ mục ở đây.",
  "audit.indexing.propertyLabel": "Property: <mono>{property}</mono>",
  "audit.indexing.urlInputLabel": "URL cần kiểm tra",
  "audit.indexing.checkButton": "Kiểm tra trạng thái lập chỉ mục",
  "audit.indexing.inspectError":
    "Không thể kiểm tra URL này. Hãy thử lại sau ít phút.",
  "audit.indexing.manageSitemaps": "Quản lý sitemap trong Search Console",
  "audit.indexing.missingFromSitemap":
    "{count} trang đã crawl bị thiếu trong sitemap của bạn (xem All Issues).",
  "audit.indexing.invalidUrl": "Nhập một URL thuộc site này để kiểm tra.",
  "audit.indexing.inspectNotConnected":
    "Đã mất quyền truy cập Search Console — hãy kết nối lại để kiểm tra URL.",
  "audit.indexing.inspectPropertyMismatch":
    "Property đang kết nối không còn bao phủ site này nữa.",
  "audit.indexing.inspectFailed":
    "Google hiện không thể kiểm tra URL này — có thể do bị giới hạn tốc độ hoặc quyền truy cập của property đã thay đổi. Hãy thử lại sau ít phút.",
  "audit.indexing.rowCoverage": "Phạm vi",
  "audit.indexing.rowVerdict": "Kết luận",
  "audit.indexing.rowIndexing": "Lập chỉ mục",
  "audit.indexing.rowLastCrawl": "Lần crawl gần nhất",
  "audit.indexing.openInSearchConsole": "Mở trong Search Console",
};
