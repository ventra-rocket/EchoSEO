import type { Locale } from "@/server/lib/seo-rules";

/**
 * Bilingual copy for the periodic report emails.
 *
 * Kept apart from the builders because it is data, not logic: the wording gets
 * revised far more often than the layout, and a translator should not have to
 * read table-rendering code to change a sentence.
 *
 * The Vietnamese is not a literal translation. It keeps the same promise the
 * English makes — this mail leads with what broke and how to fix it — because
 * that promise is the reason the recipient opens it.
 */

export type Copy = {
  subjectClean: (site: string) => string;
  subjectIssues: (site: string, count: number) => string;
  subjectAlert: (site: string, count: number) => string;
  periodLine: (start: string, end: string) => string;
  comparedLine: (start: string, end: string) => string;
  greeting: (site: string) => string;

  newIssuesTitle: string;
  regressedTitle: string;
  regressedIntro: string;
  fixedTitle: string;
  fixedIntro: (count: number) => string;
  noIssuesTitle: string;
  noIssuesBody: string;
  firstCrawlNote: string;
  notComparableTitle: string;
  notComparableBody: string;
  noAuditTitle: string;
  noAuditBody: string;
  howToFix: string;
  googleSays: string;
  googleSourceLabel: string;
  moreIssues: (count: number) => string;
  affectedUrl: string;
  issueColumn: string;
  severityColumn: string;
  urlColumn: string;
  countColumn: string;
  ruleColumn: string;

  searchTitle: string;
  searchSourceNote: string;
  clicks: string;
  impressions: string;
  ctr: string;
  position: string;
  metricColumn: string;
  thisPeriod: string;
  previousPeriod: string;
  change: string;
  topPages: string;
  topQueries: string;
  devices: string;
  countries: string;
  searchNotConnectedTitle: string;
  searchNotConnectedBody: string;
  searchReconnectTitle: string;
  searchReconnectBody: string;
  searchErrorTitle: string;
  searchErrorBody: string;
  searchNoDataTitle: string;
  searchNoDataBody: string;

  alertTitle: string;
  alertLead: (site: string) => string;
  alertNote: string;

  ctaLabel: string;
  footerWhy: string;
  unsubscribe: string;
  severity: Record<string, string>;
  brandNew: string;
};

export const COPY: Record<Locale, Copy> = {
  en: {
    subjectClean: (site) => `${site}: no new SEO issues this week`,
    subjectIssues: (site, count) =>
      `${site}: ${count} new SEO ${count === 1 ? "issue" : "issues"} this week`,
    subjectAlert: (site, count) =>
      `${site}: ${count} critical SEO ${count === 1 ? "issue" : "issues"} found`,
    periodLine: (start, end) => `Reporting period: ${start} to ${end}`,
    comparedLine: (start, end) => `Compared with ${start} to ${end}`,
    greeting: (site) => `Here is this week's SEO report for ${site}.`,

    newIssuesTitle: "New issues found this week",
    regressedTitle: "Issues that came back",
    regressedIntro:
      "These were fixed in an earlier crawl and are present again.",
    fixedTitle: "Fixed since last week",
    fixedIntro: (count) =>
      `${count} ${count === 1 ? "issue is" : "issues are"} gone. Nice work.`,
    noIssuesTitle: "No new issues",
    noIssuesBody:
      "This crawl found nothing that the previous crawl did not already have.",
    firstCrawlNote:
      "This is the first completed crawl for this site, so everything below is listed as new. Next week's report will compare against it.",
    notComparableTitle: "Comparison unavailable",
    notComparableBody:
      "The latest crawl could not be compared with the previous one, so this report omits the new/fixed breakdown rather than guess at it. Open the audit in the app for the current issue list.",
    noAuditTitle: "No completed crawl yet",
    noAuditBody:
      "The scheduled crawl has not produced a completed snapshot yet. The next run will include the technical section.",
    howToFix: "How to fix it",
    googleSays: "Google's guidance",
    googleSourceLabel: "Read the Google documentation",
    moreIssues: (count) => `And ${count} more in the app.`,
    affectedUrl: "Affected URL",
    issueColumn: "Issue",
    severityColumn: "Severity",
    urlColumn: "URL",
    countColumn: "Pages",
    ruleColumn: "Check",

    searchTitle: "Search Console performance",
    searchSourceNote:
      "Source: Google Search Console. The window ends four days ago because Search Console finalises a day two to three days late; both periods carry the same lag, so the comparison is fair.",
    clicks: "Clicks",
    impressions: "Impressions",
    ctr: "CTR",
    position: "Avg. position",
    metricColumn: "Metric",
    thisPeriod: "This period",
    previousPeriod: "Previous",
    change: "Change",
    topPages: "Top pages",
    topQueries: "Top queries",
    devices: "Devices",
    countries: "Countries",
    searchNotConnectedTitle: "Search Console not connected",
    searchNotConnectedBody:
      "Connect a verified Search Console property to this project and the next report will include real click and impression data.",
    searchReconnectTitle: "Search Console needs reconnecting",
    searchReconnectBody:
      "Google rejected the stored authorisation, so no search data could be read this period. Reconnect Search Console in the app to restore it. No numbers are shown rather than zeros, because zeros here would look like a traffic collapse.",
    searchErrorTitle: "Search data unavailable",
    searchErrorBody:
      "Search Console could not be read this period. The technical section above is unaffected.",
    searchNoDataTitle: "No search data for this period",
    searchNoDataBody:
      "Search Console reported no clicks or impressions in this window. This is a real zero, not a failed read.",

    alertTitle: "Critical issues found",
    alertLead: (site) =>
      `A crawl of ${site} just finished and found critical issues that the previous crawl did not have. This is sent immediately rather than waiting for the weekly report.`,
    alertNote:
      "You get at most one of these per site per day. The weekly report still covers everything else.",

    ctaLabel: "Open the full report",
    footerWhy:
      "You are getting this because periodic reports are switched on for this site in EchoSEO.",
    unsubscribe: "Turn these emails off",
    severity: { critical: "Critical", high: "High", low: "Low" },
    brandNew: "new",
  },
  vi: {
    subjectClean: (site) => `${site}: tuần này không có lỗi SEO mới`,
    subjectIssues: (site, count) => `${site}: ${count} lỗi SEO mới trong tuần`,
    subjectAlert: (site, count) =>
      `${site}: phát hiện ${count} lỗi SEO nghiêm trọng`,
    periodLine: (start, end) => `Kỳ báo cáo: ${start} đến ${end}`,
    comparedLine: (start, end) => `So với ${start} đến ${end}`,
    greeting: (site) => `Đây là báo cáo SEO tuần này cho ${site}.`,

    newIssuesTitle: "Lỗi mới phát hiện trong tuần",
    regressedTitle: "Lỗi tái phát",
    regressedIntro:
      "Những lỗi này đã được sửa ở lần quét trước đó và nay xuất hiện lại.",
    fixedTitle: "Đã sửa được so với tuần trước",
    fixedIntro: (count) => `${count} lỗi đã biến mất.`,
    noIssuesTitle: "Không có lỗi mới",
    noIssuesBody:
      "Lần quét này không tìm thấy lỗi nào mà lần quét trước chưa có.",
    firstCrawlNote:
      "Đây là lần quét hoàn tất đầu tiên của site, nên mọi lỗi bên dưới đều tính là mới. Báo cáo tuần sau sẽ so với lần này.",
    notComparableTitle: "Chưa so sánh được",
    notComparableBody:
      "Lần quét mới nhất chưa so sánh được với lần trước, nên báo cáo này bỏ phần lỗi mới/đã sửa thay vì đoán. Mở phần audit trong ứng dụng để xem danh sách lỗi hiện tại.",
    noAuditTitle: "Chưa có lần quét nào hoàn tất",
    noAuditBody:
      "Lần quét theo lịch chưa tạo ra bản chụp hoàn chỉnh. Lần chạy tới sẽ có phần kỹ thuật.",
    howToFix: "Cách sửa",
    googleSays: "Hướng dẫn của Google",
    googleSourceLabel: "Đọc tài liệu Google",
    moreIssues: (count) => `Và ${count} lỗi nữa trong ứng dụng.`,
    affectedUrl: "URL bị ảnh hưởng",
    issueColumn: "Lỗi",
    severityColumn: "Mức độ",
    urlColumn: "URL",
    countColumn: "Số trang",
    ruleColumn: "Tiêu chí",

    searchTitle: "Hiệu suất tìm kiếm (Search Console)",
    searchSourceNote:
      "Nguồn: Google Search Console. Cửa sổ báo cáo kết thúc cách đây bốn ngày vì Search Console chốt số liệu chậm hai đến ba ngày; cả hai kỳ đều lùi cùng một khoảng nên so sánh là công bằng.",
    clicks: "Lượt nhấp",
    impressions: "Lượt hiển thị",
    ctr: "CTR",
    position: "Vị trí TB",
    metricColumn: "Chỉ số",
    thisPeriod: "Kỳ này",
    previousPeriod: "Kỳ trước",
    change: "Thay đổi",
    topPages: "Trang nhiều nhấp nhất",
    topQueries: "Truy vấn nhiều nhấp nhất",
    devices: "Thiết bị",
    countries: "Quốc gia",
    searchNotConnectedTitle: "Chưa kết nối Search Console",
    searchNotConnectedBody:
      "Kết nối một property đã xác minh của Search Console vào dự án này, báo cáo tới sẽ có số liệu nhấp và hiển thị thật.",
    searchReconnectTitle: "Cần kết nối lại Search Console",
    searchReconnectBody:
      "Google từ chối uỷ quyền đang lưu nên kỳ này không đọc được số liệu tìm kiếm. Hãy kết nối lại trong ứng dụng. Chúng tôi không hiển thị số 0 vì số 0 ở đây trông như traffic sụp đổ.",
    searchErrorTitle: "Không lấy được số liệu tìm kiếm",
    searchErrorBody:
      "Kỳ này không đọc được Search Console. Phần kỹ thuật ở trên không bị ảnh hưởng.",
    searchNoDataTitle: "Kỳ này không có dữ liệu tìm kiếm",
    searchNoDataBody:
      "Search Console báo không có lượt nhấp hay hiển thị nào trong khoảng này. Đây là số 0 thật, không phải lỗi đọc dữ liệu.",

    alertTitle: "Phát hiện lỗi nghiêm trọng",
    alertLead: (site) =>
      `Một lần quét ${site} vừa xong và phát hiện lỗi nghiêm trọng mà lần quét trước không có. Email này gửi ngay, không đợi tới kỳ báo cáo tuần.`,
    alertNote:
      "Mỗi site nhận tối đa một cảnh báo như thế này mỗi ngày. Báo cáo tuần vẫn bao quát phần còn lại.",

    ctaLabel: "Mở báo cáo đầy đủ",
    footerWhy:
      "Bạn nhận email này vì báo cáo định kỳ đang được bật cho site này trong EchoSEO.",
    unsubscribe: "Tắt nhận email này",
    severity: { critical: "Nghiêm trọng", high: "Cao", low: "Thấp" },
    brandNew: "mới",
  },
};

export const SEVERITY_TONE: Record<
  string,
  "critical" | "warning" | "neutral" | "positive"
> = {
  critical: "critical",
  high: "warning",
  low: "neutral",
};

/** Localized severity name, falling back to the raw value for unknown rules. */
export function severityLabel(severity: string, copy: Copy): string {
  return copy.severity[severity] ?? severity;
}
