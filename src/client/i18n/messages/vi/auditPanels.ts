import type { auditPanels as en } from "@/client/i18n/messages/en/auditPanels";

export const auditPanels: Record<keyof typeof en, string> = {
  // Audit — progress (src/client/features/audit/progress/**)
  "audit.progress.phase.discovery": "Khám phá",
  "audit.progress.phase.crawling": "Đang crawl",
  "audit.progress.phase.lighthouse": "Lighthouse",
  "audit.progress.phase.finalizing": "Đang hoàn tất",
  "audit.progress.phase.running": "Đang chạy",
  "audit.progress.heading.lighthouse": "Đang chạy kiểm tra Lighthouse",
  "audit.progress.heading.crawling": "Đang crawl trang",
  "audit.progress.heading.discovery": "Đang đọc sitemap",
  "audit.progress.lighthouseCount": "{done} / {total} lượt kiểm tra",
  "audit.progress.lighthouseFailedSuffix": " ({failed} lỗi)",
  "audit.progress.pagesCount": "{crawled} / {total} trang",
  "audit.progress.discovery.readingSitemaps": "Đang đọc robots.txt và sitemap",
  "audit.progress.discovery.summary":
    "Tìm thấy {urlCount, plural, other {# URL}} trong {docCount, plural, other {# tài liệu sitemap}}",
  "audit.progress.eta.estimating": "Đang ước tính…",
  "audit.progress.eta.minutes": "~{minutes} phút còn lại",
  "audit.progress.eta.seconds": "~{seconds} giây còn lại",
  "audit.progress.queueStatus": "{queued} đang chờ · {visited} đã truy cập",
  "audit.progress.crawlRate": "Đang crawl với tốc độ {rate} trang/s",
  "audit.progress.refusedRequestsSuffix":
    "{count, plural, other { · site đã từ chối # yêu cầu cho đến nay}}",
  "audit.progress.crawledPagesHeading": "Trang đã crawl ({count})",
  "audit.progress.updated": "Cập nhật lúc {time}",

  // Audit — history (src/client/features/audit/history/**)
  "audit.history.baselineSelector.label": "So sánh với",
  "audit.history.baselineSelector.auto": "Lần crawl trước (tự động)",
  "audit.history.baselineSelector.option":
    "{date} · {count, plural, other {# trang}}",
  "audit.history.baselineSelector.analysisPending": " · đang chờ phân tích",
  "audit.history.sourceCrawl": "Nguồn: crawl",
  "audit.history.pageChanges.summaryNone":
    "Không có thông tin trang nào thay đổi kể từ lần crawl trước.",
  "audit.history.pageChanges.summaryChanged":
    "{count, plural, other {# trang}} đã thay đổi kể từ {date}.",
  "audit.history.pageChanges.highlightRemovedFromSitemap":
    "{count} bị xóa khỏi sitemap",
  "audit.history.pageChanges.highlightBecameNoindex": "{count} thành noindex",
  "audit.history.pageChanges.highlightStatusChanged":
    "{count} thay đổi trạng thái",
  "audit.history.pageChanges.truncated":
    "Đang hiển thị {shown} trang thay đổi đầu tiên trong tổng số {total}.",
  "audit.history.pageChanges.field.removedFromSitemap": "Xóa khỏi sitemap",
  "audit.history.pageChanges.field.becameNoindex": "Thành noindex",
  "audit.history.pageChanges.field.becameIndexable": "Thành có thể lập chỉ mục",
  "audit.history.pageChanges.field.added": "{field} được thêm",
  "audit.history.pageChanges.field.removed": "{field} bị xóa",
  "audit.history.pageChanges.field.changed": "{field} đã thay đổi",
  "audit.history.pageChanges.field.rangeChange": "{field} {from} → {to}",
  "audit.history.pageChanges.fieldLabel.title": "Tiêu đề",
  "audit.history.pageChanges.fieldLabel.metaDescription": "Mô tả meta",
  "audit.history.pageChanges.fieldLabel.canonicalUrl": "Canonical",
  "audit.history.pageChanges.fieldLabel.statusCode": "Trạng thái",
  "audit.history.pageChanges.fieldLabel.h1Count": "Số H1",
  "audit.history.pageChanges.fieldLabel.wordCount": "Số từ",
  "audit.history.pageChanges.fieldLabel.isIndexable": "Có thể lập chỉ mục",
  "audit.history.pageChanges.fieldLabel.inSitemap": "Sitemap",
  "audit.history.comparisonBar.loading": "Đang so sánh với lần crawl trước…",
  "audit.history.comparisonBar.compareError":
    "Không thể so sánh với lần crawl đã chọn. Các lỗi bên dưới vẫn là kết quả riêng của lần crawl này.",
  "audit.history.comparisonBar.singleSnapshot":
    "Chỉ gồm kết quả của lần crawl này. Đây là lần kiểm tra đầu tiên cho site này — lần kiểm tra thứ hai sẽ cho thấy điều gì mới và điều gì đã được khắc phục.",
  "audit.history.comparisonBar.notComparableBaselineNotMaterialized":
    "Chưa thể so sánh với lần crawl ngày {date} — phân tích lỗi của lần đó chưa hoàn tất, nên việc so sánh sẽ hiểu sai mọi lỗi trước đó là đã được xử lý.",
  "audit.history.comparisonBar.notComparableDefault":
    "Chưa thể so sánh — phân tích lỗi cho lần crawl này chưa hoàn tất.",
  "audit.history.comparisonBar.chipNew": "mới",
  "audit.history.comparisonBar.chipResolved": "đã xử lý",
  "audit.history.comparisonBar.chipStillPresent": "vẫn còn",
  "audit.history.comparisonBar.crawlLabelsLine":
    "Lần crawl này ({current}) so với {baseline} · Nguồn: crawl",
  "audit.history.comparisonBar.fixedSinceThen": "Đã khắc phục kể từ đó:",

  // Audit — cards (src/client/features/audit/cards/**)
  "audit.cards.currentBadge": "Hiện tại",
  "audit.cards.noDomainSet": "Chưa đặt domain",
  "audit.cards.reportLink": "Báo cáo",
  "audit.cards.counter.crawled": "Đã crawl",
  "audit.cards.counter.redirects": "Chuyển hướng",
  "audit.cards.counter.broken": "Lỗi",
  "audit.cards.counter.blocked": "Bị chặn",
  "audit.cards.notMeasuredTitle": "Chưa đo trong lần crawl này",
  "audit.cards.footer": "Crawler EchoSEO · crawl lúc {date}",
  "audit.cards.noindexSuffix": "{count, plural, other { · # trang noindex}}",
  "audit.cards.health.notAnalysed": "Lỗi chưa được phân tích cho lần crawl này",
  "audit.cards.health.scoreDescription":
    "{score}% số trang không có lỗi mức nghiêm trọng hoặc cao ({clean}/{crawled})",
  "audit.cards.health.critical": "{count} nghiêm trọng",
  "audit.cards.health.high": "{count} cao",
  "audit.cards.health.low": "{count} thấp",
  "audit.cards.emptyState.body":
    "Chưa có lần crawl nào hoàn tất, nên chưa có gì để hiển thị.",
  "audit.cards.emptyState.cta": "Chạy lần kiểm tra đầu tiên",
};
