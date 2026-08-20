/**
 * The report document's own wording, in the languages the rule catalogue
 * supports.
 *
 * Separate from the template because it is data, not layout, and because a
 * translator should be able to find every string in one file. The rule prose
 * itself is not here — it comes from the bilingual catalogue through
 * `getIssueFixText`, and duplicating it would let the two drift.
 */
import type { ReportLocale } from "@/shared/audit-export-format";

/**
 * The document's own wording. The rule prose comes from the catalogue via
 * `getIssueFixText`, which is already bilingual; without translating the chrome
 * around it a Vietnamese report would be half English.
 */
export const REPORT_COPY: Record<ReportLocale, Record<string, string>> = {
  en: {
    title: "Technical SEO audit",
    startUrl: "Start URL",
    sealed: "Crawl sealed",
    generated: "Report generated",
    auditId: "Audit id",
    source: "Source",
    sourceValue:
      "Crawl of this site — every figure below is measured, not estimated",
    summary: "Executive summary",
    severity: "Severity",
    affected: "Affected URLs",
    noIssues: "This crawl raised no issues against the current rule set.",
    startHere: "Start here",
    nothingToPrioritise: "Nothing to prioritise: this crawl raised no issues.",
    findings: "Technical findings",
    howToFix: "How to fix",
    affectedPages: "Affected pages",
    group: "Group",
    rule: "Rule",
    noFixText: "No remediation text is registered for this rule id.",
    truncated:
      "This audit had more issues than one export carries, so the findings below cover the first rows only. The counts are of what is included, not of the whole site.",
    absentTitle: "What this report does not cover",
    absentBody:
      "These sections are deliberately absent rather than estimated. Performance and Core Web Vitals, competitor comparison, and Search Console click and impression data are held elsewhere in EchoSEO and are not collected by this export job. Commercial sections — timeline, pricing, team — are for a consultant to write; this tool does not generate them.",
    notRecorded: "not recorded",
    andMore: "more — the full list is in the issue data export.",
    urlsWord: "affected URLs",
    urlWord: "affected URL",
    englishFallback:
      "Some remediation text below is shown in English: the rule catalogue has no Vietnamese translation for it yet.",
  },
  vi: {
    title: "Kiểm định SEO kỹ thuật",
    startUrl: "URL bắt đầu",
    sealed: "Chốt dữ liệu crawl",
    generated: "Ngày tạo báo cáo",
    auditId: "Mã kiểm định",
    source: "Nguồn số liệu",
    sourceValue:
      "Crawl chính website này — mọi con số dưới đây là đo được, không ước lượng",
    summary: "Tóm tắt điều hành",
    severity: "Mức độ",
    affected: "URL bị ảnh hưởng",
    noIssues: "Lần crawl này không phát hiện lỗi nào theo bộ quy tắc hiện tại.",
    startHere: "Nên sửa trước",
    nothingToPrioritise:
      "Không có việc cần ưu tiên: lần crawl này không có lỗi.",
    findings: "Phát hiện kỹ thuật",
    howToFix: "Cách sửa",
    affectedPages: "Trang bị ảnh hưởng",
    group: "Nhóm",
    rule: "Quy tắc",
    noFixText: "Chưa có hướng dẫn khắc phục cho mã quy tắc này.",
    truncated:
      "Kiểm định này có nhiều lỗi hơn mức một lần xuất chứa được, nên phần dưới chỉ gồm các dòng đầu. Các con số là của phần được đưa vào, không phải của toàn site.",
    absentTitle: "Báo cáo này không bao gồm",
    absentBody:
      "Các phần sau được cố ý để trống thay vì ước lượng. Hiệu năng và Core Web Vitals, so sánh đối thủ, cùng số liệu click và hiển thị từ Search Console nằm ở nơi khác trong EchoSEO và không được thu thập bởi công việc xuất này. Các phần thương mại — tiến độ, báo giá, đội ngũ — do consultant tự viết; công cụ không sinh ra chúng.",
    notRecorded: "không ghi nhận",
    andMore: "nữa — danh sách đầy đủ nằm trong bản xuất dữ liệu lỗi.",
    urlsWord: "URL bị ảnh hưởng",
    urlWord: "URL bị ảnh hưởng",
    englishFallback:
      "Một số hướng dẫn khắc phục bên dưới hiển thị bằng tiếng Anh: bộ quy tắc chưa có bản dịch tiếng Việt cho phần đó.",
  },
};
