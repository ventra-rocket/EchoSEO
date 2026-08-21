import type { audit as en } from "@/client/i18n/messages/en/audit";

// Audit — results, issues and competitors (src/client/features/audit/**).
export const audit: Record<keyof typeof en, string> = {
  // Audit — results (src/client/features/audit/results/**)
  "audit.results.tab.pages": "Trang ({count})",
  "audit.results.tab.performance": "Hiệu năng ({count})",
  "audit.results.tab.allIssues": "Tất cả lỗi",
  "audit.results.tab.search": "Tìm kiếm",

  "audit.results.search.consoleTitle": "Search Console",
  "audit.results.search.consoleTag": "chính chủ · miễn phí",
  "audit.results.search.referringDomainsTitle": "Off-page · Tên miền trỏ về",
  "audit.results.search.referringDomainsTag":
    "dữ liệu nhà cung cấp · dùng credit",

  "audit.results.truncatedNotice.title":
    "Lần crawl này dừng lại ở {limit} trang.",
  "audit.results.truncatedNotice.body":
    "Website của bạn có nhiều hơn thế, nên phần này chỉ gồm {limit} trang được crawl tới đầu tiên từ {startUrl}. Mọi số liệu hiển thị đều là đo thực tế; phần còn thiếu là phần còn lại của site, không phải một kết quả sạch cho phần đó.",
  "audit.results.truncatedNotice.note":
    "Kiểm tra trang mồ côi và độ phủ sitemap bị tắt khi crawl không đầy đủ: một trang tưởng như không có liên kết trỏ tới có thể chỉ đơn giản là chưa được crawl tới.",

  "audit.results.throttledNotice.title":
    "{count, plural, other {# trang}} không được đọc do trang web đã giới hạn tốc độ của lần crawl này.",
  "audit.results.throttledNotice.body":
    "Những trang đó nhận phản hồi <mono>429 Too Many Requests</mono> — phản ánh tốc độ chúng tôi yêu cầu, không phải lỗi của trang. Chúng bị loại khỏi số trang lỗi và khỏi mọi kiểm tra on-page, đồng thời được liệt kê trong bộ lọc trạng thái <em>Giới hạn tốc độ</em>.",
  "audit.results.throttledNotice.note":
    "Trình crawl sẽ tự giảm tốc độ và thử lại khi gặp tình huống này. Nếu vẫn liên tục xảy ra, hãy cho phép trình crawl của chúng tôi trong quy tắc giới hạn tốc độ của site để lần kiểm tra có thể phủ toàn bộ site.",

  "audit.results.stats.pagesCrawled": "Trang đã crawl",
  "audit.results.stats.totalUrls": "Tổng số URL",
  "audit.results.stats.lighthouseTests": "Lượt kiểm tra Lighthouse",
  "audit.results.stats.avgResponse": "Phản hồi trung bình",
  "audit.results.stats.avgLighthousePerf": "Lighthouse Perf trung bình",
  "audit.results.stats.avgLighthouseSeo": "Lighthouse SEO trung bình",
  "audit.results.stats.avgLighthouseA11y": "Lighthouse A11y trung bình",
  "audit.results.stats.lighthouseFailures": "Lỗi Lighthouse",

  "audit.results.columns.url": "URL",
  "audit.results.columns.status": "Trạng thái",
  "audit.results.columns.title": "Tiêu đề",
  "audit.results.columns.h1": "H1",
  "audit.results.columns.words": "Số từ",
  "audit.results.columns.images": "Hình ảnh",
  "audit.results.columns.speed": "Tốc độ",
  "audit.results.columns.device": "Thiết bị",
  "audit.results.columns.perf": "Perf",
  "audit.results.columns.a11y": "A11y",
  "audit.results.columns.seo": "SEO",
  "audit.results.columns.lcp": "LCP",
  "audit.results.columns.cls": "CLS",
  "audit.results.columns.inp": "INP",
  "audit.results.columns.ttfb": "TTFB",
  "audit.results.columns.issues": "Lỗi",

  "audit.results.pagesTable.missingTitle": "thiếu",
  "audit.results.pagesTable.emptyFiltered": "Không có trang nào khớp bộ lọc.",

  "audit.results.performanceTable.failed": "lỗi",
  "audit.results.performanceTable.ok": "ok",
  "audit.results.performanceTable.defaultFailureMessage":
    "Lighthouse không trả về điểm ở hạng mục nào",
  "audit.results.performanceTable.viewIssues": "Xem lỗi",
  "audit.results.performanceTable.emptyFiltered":
    "Không có kết quả hiệu năng nào khớp bộ lọc.",

  "audit.results.export.sheets": "Xuất ra Sheets",
  "audit.results.export.csv": "CSV",
  "audit.results.export.json": "JSON",
  "audit.results.export.trigger": "Xuất",

  "audit.results.filters.search": "Tìm kiếm",
  "audit.results.filters.searchPlaceholderPages": "URL, tiêu đề, meta",
  "audit.results.filters.searchPlaceholderUrl": "URL",
  "audit.results.filters.status": "Trạng thái",
  "audit.results.filters.altText": "Alt text",
  "audit.results.filters.words": "Số từ",
  "audit.results.filters.speedMs": "Tốc độ (ms)",
  "audit.results.filters.device": "Thiết bị",
  "audit.results.filters.maxLcpS": "LCP tối đa (s)",
  "audit.results.filters.perf": "Perf",
  "audit.results.filters.seo": "SEO",

  "audit.results.filters.option.all": "Tất cả",
  "audit.results.filters.option.status2xx": "2xx",
  "audit.results.filters.option.status3xx": "3xx",
  "audit.results.filters.option.status4xx5xx": "4xx/5xx",
  "audit.results.filters.option.throttled": "Giới hạn tốc độ",
  "audit.results.filters.option.missing": "Không có",
  "audit.results.filters.option.missingAlt": "Thiếu alt",
  "audit.results.filters.option.noMissingAlt": "Không thiếu alt",
  "audit.results.filters.option.desktop": "Desktop",
  "audit.results.filters.option.mobile": "Mobile",
  "audit.results.filters.option.perfOk": "OK",
  "audit.results.filters.option.perfFailed": "Lỗi",

  "audit.results.filters.toggleTitle": "Bật/tắt bộ lọc",
  "audit.results.filters.toggleLabel": "Bộ lọc",
  "audit.results.filters.resultCount": "{result}/{total}",
  "audit.results.filters.refineResults": "Tinh chỉnh kết quả",
  "audit.results.filters.activeCount": "{count} đang áp dụng",
  "audit.results.filters.clearAll": "Xóa hết",
  "audit.results.filters.min": "Từ",
  "audit.results.filters.max": "Đến",

  // Audit — issues (src/client/features/audit/issues/**)
  "audit.issues.group.indexability": "Khả năng lập chỉ mục",
  "audit.issues.group.links": "Liên kết",
  "audit.issues.group.redirects": "Chuyển hướng",
  "audit.issues.group.content": "Nội dung",
  "audit.issues.group.sitemaps": "Sitemap",
  "audit.issues.group.structuredData": "Dữ liệu có cấu trúc",
  "audit.issues.group.performance": "Hiệu năng",
  "audit.issues.group.aiGeo": "AI / GEO",

  "audit.issues.uncoveredNote":
    "Lần kiểm tra này chưa bao phủ: chuỗi chuyển hướng (crawl chỉ lưu URL cuối cùng), dữ liệu có cấu trúc (mục trong catalog chỉ mang tính hướng dẫn — chưa có gì đánh giá nó thành một phát hiện), và các kiểm tra AI/GEO (cần dữ liệu robots.txt và llms.txt mà crawl của audit không thu thập).",

  "audit.issues.loadError": "Không thể tải danh sách lỗi cho lần kiểm tra này.",

  "audit.issues.notMaterialized.waitingTitle":
    "Đang tổng hợp lỗi cho lần crawl này…",
  "audit.issues.notMaterialized.failedTitle":
    "Phân tích lỗi chưa hoàn tất cho lần crawl này.",
  "audit.issues.notMaterialized.waitingBody":
    "Các trang đã crawl xong; các kiểm tra biến chúng thành danh sách lỗi sẽ chạy ngay sau đó. Mục này sẽ tự cập nhật.",
  "audit.issues.notMaterialized.failedBody":
    "Các trang đã được crawl, nhưng các kiểm tra biến chúng thành danh sách lỗi đã không hoàn tất. Đây không phải một kết quả sạch — hãy chạy lại kiểm tra để có kết quả đó.",

  "audit.issues.none.title": "Không tìm thấy lỗi nào.",
  "audit.issues.none.body":
    "Mọi kiểm tra mà audit này chạy đều đạt trên toàn bộ trang đã crawl.",

  "audit.issues.groupList.emptyFiltered": "Không có lỗi nào khớp bộ lọc.",
  "audit.issues.groupList.summary":
    "{issueCount, plural, other {# lỗi}} · {urlCount, plural, other {# URL}}",
  "audit.issues.groupList.newSinceBaseline": "Mới so với baseline",
  "audit.issues.groupList.resolvedSinceBaseline": "Đã xử lý so với baseline",
  "audit.issues.groupList.allGroups": "Tất cả nhóm",
  "audit.issues.groupList.severity": "Mức độ",
  "audit.issues.groupList.anySeverity": "Bất kỳ",

  "audit.issues.detail.closeDetails": "Đóng chi tiết lỗi",
  "audit.issues.detail.affectedCount":
    "{count, plural, other {# URL bị ảnh hưởng}}",
  "audit.issues.detail.close": "Đóng",
  "audit.issues.detail.loadError": "Không thể tải danh sách URL bị ảnh hưởng.",
  "audit.issues.detail.howToFixIt": "Cách khắc phục",
  "audit.issues.detail.googleDocumentation": "Tài liệu của Google",
  "audit.issues.detail.sourceLastChecked":
    "Nguồn được kiểm tra lần cuối {date}",
  "audit.issues.detail.englishFallback": "(hướng dẫn hiển thị bằng tiếng Anh)",
  "audit.issues.detail.pageOf": "Trang {page}/{pageCount}",
  "audit.issues.detail.previous": "Trước",
  "audit.issues.detail.next": "Sau",

  "audit.issues.evidence.columnUrl": "URL",
  "audit.issues.evidence.columnStatus": "Trạng thái",
  "audit.issues.evidence.columnEvidence": "Bằng chứng",
  "audit.issues.evidence.hideEvidence": "Ẩn bằng chứng",
  "audit.issues.evidence.showEvidence": "Xem ảnh chụp bằng chứng",

  "audit.issues.screenshot.loading": "Đang tải bằng chứng…",
  "audit.issues.screenshot.loadError": "Không thể tải bằng chứng cho URL này.",
  "audit.issues.screenshot.alt": "Ảnh chụp render của {url}",
  "audit.issues.screenshot.caption":
    "Render từ trang trực tiếp qua PageSpeed · chụp lúc {date}",
  "audit.issues.screenshot.unavailable":
    "Không có ảnh chụp cho URL này — URL này không được crawl như một trang HTML trong lần kiểm tra này.",
  "audit.issues.screenshot.renderFailed":
    "Lần thử gần nhất không render được trang này.",
  "audit.issues.screenshot.tryAgain": "Thử lại",
  "audit.issues.screenshot.captureEvidence": "Chụp bằng chứng",
  "audit.issues.screenshot.noneCaptured":
    "Không thể chụp bằng chứng cho URL này.",
  "audit.issues.screenshot.notCapturedYet":
    "Chưa có bằng chứng nào được chụp cho URL này.",
  "audit.issues.screenshot.captureFailedDefault": "Không thể chụp bằng chứng",

  "audit.issues.ai.priorityNow": "Nên làm ngay",
  "audit.issues.ai.prioritySoon": "Nên làm sớm",
  "audit.issues.ai.priorityLater": "Có thể chờ",
  "audit.issues.ai.explainCta": "Giải thích cho site này",
  "audit.issues.ai.commentaryTitle": "Nhận xét từ AI",
  "audit.issues.ai.hide": "Ẩn",
  "audit.issues.ai.disclaimer":
    "Được viết bởi mô hình ngôn ngữ để tóm tắt các bước ở trên. Các bước khắc phục và đoạn trích dẫn đến từ tài liệu của Google; ghi chú này thì không.",

  // Audit — competitors (src/client/features/audit/competitors/**)
  "audit.competitors.card.title": "Đối thủ cạnh tranh",
  "audit.competitors.card.description":
    "Nêu tối đa {max} tên miền bạn cạnh tranh. Mỗi trang của bạn được ghép với trang tương ứng của họ và chấm theo cùng bộ quy tắc, nên đây là so sánh trang với trang chứ không phải tên miền với tên miền.",
  "audit.competitors.card.loading": "Đang tải danh sách đối thủ",
  "audit.competitors.card.remove": "Xóa {host}",
  "audit.competitors.card.limitReached":
    "Ba là giới hạn tối đa. Xóa bớt một để so sánh với tên miền khác — mỗi đối thủ nghĩa là phải crawl thêm trang của họ, và một bảng so sánh với mười site sẽ chẳng ai đọc.",
  "audit.competitors.card.domainPlaceholder": "competitor.com",
  "audit.competitors.card.namePlaceholder": "Tên (không bắt buộc)",
  "audit.competitors.card.add": "Thêm",
  "audit.competitors.card.addedToast": "Đang so sánh với {host}.",
  "audit.competitors.card.addErrorDefault": "Không thể thêm đối thủ đó.",
  "audit.competitors.card.removedToast": "Đã xóa đối thủ.",
  "audit.competitors.card.removeErrorDefault": "Không thể xóa đối thủ đó.",

  "audit.competitors.table.notMeasuredTitle": "Chưa đo cho trang này",
  "audit.competitors.table.notMeasuredLabel": "Chưa đo",
  "audit.competitors.table.passesLabel": "Đạt",
  "audit.competitors.table.warningLabel": "Cảnh báo",
  "audit.competitors.table.failsLabel": "Không đạt",
  "audit.competitors.table.loading": "Đang tải bảng so sánh",
  "audit.competitors.table.title": "So sánh từng trang",
  "audit.competitors.table.description":
    "Trang của bạn và của họ, được chấm theo cùng mười một quy tắc on-page và kỹ thuật. Core Web Vitals, sitemap và kiểm tra trang mồ côi không được so sánh: các số liệu này đến từ một lần crawl đầy đủ site của bạn, và chúng tôi không làm việc đó với site đối thủ.",
  "audit.competitors.table.runComparison": "Chạy so sánh",
  "audit.competitors.table.compareToastSuccess":
    "Đã so sánh với {count, plural, other {# đối thủ}}.",
  "audit.competitors.table.compareErrorDefault": "Không thể chạy so sánh.",
  "audit.competitors.table.pairingSaved":
    "Đã lưu ghép cặp. Chạy lại so sánh để chấm điểm.",
  "audit.competitors.table.saveUrlErrorDefault": "Không thể lưu URL đó.",
  "audit.competitors.table.noPagePairs":
    "Chưa có cặp trang nào. Chạy so sánh để ghép trang của bạn với trang của họ.",
  "audit.competitors.table.vs": "vs",
  "audit.competitors.table.pairedByHandBadge": "ghép thủ công",
  "audit.competitors.table.matchPercent": "khớp {percent}%",
  "audit.competitors.table.notScoredForPair": "Chưa có điểm nào cho cặp này.",
  "audit.competitors.table.notComparedYet": "Chưa được so sánh.",
  "audit.competitors.table.columnRule": "Quy tắc",
  "audit.competitors.table.columnYou": "Bạn",
  "audit.competitors.table.columnThem": "Họ",
  "audit.competitors.table.behind": "kém hơn",
  "audit.competitors.table.ahead": "vượt trội",
  "audit.competitors.table.savePairing": "Lưu ghép cặp",
  "audit.competitors.table.cancel": "Hủy",
  "audit.competitors.table.pairDifferentPage": "Ghép với trang khác",
  "audit.competitors.table.unpairedSummary":
    "{count} trang của bạn chưa có trang tương ứng trên {host} — hãy ghép thủ công",
  "audit.competitors.table.mustBeUrlOn": "Phải là URL thuộc {host}",
  "audit.competitors.table.pairByHand": "Ghép thủ công",
};
