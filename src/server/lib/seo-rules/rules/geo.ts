/**
 * GEO / AI-search rule catalog (Phase 4).
 *
 * Anchored to Google's AI-features guide, whose honest through-line is that AI
 * features run on the same ranking/quality systems — so these rules reinforce
 * SEO fundamentals rather than sell AI-specific tricks. Every `guideQuote` here
 * is verbatim from that page (fetched 2026-07-20); nothing is invented, and
 * where the guide says a thing is optional the rule says so too.
 *
 * Scored separately from the on-page number (see deep.ts) and shown under a
 * "directional / emerging" disclaimer: these signals are eligibility hygiene,
 * not a guarantee of appearing in AI Overviews.
 */
import type { GeoSignals, Rule } from "../types";

const AI_GUIDE_URL =
  "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide";
const REVIEWED = "2026-07-20";

/** True when the page's robots meta contains the given directive token. */
function robotsHas(robotsMeta: string | null, directive: string): boolean {
  return (robotsMeta ?? "").toLowerCase().includes(directive);
}

export const GEO_RULES: Array<Rule<GeoSignals>> = [
  {
    id: "geo-crawlable",
    category: "geo",
    severity: "critical",
    label: "Crawlable by Google",
    appliesWhen: (geo) => (geo.botAccess.googlebot ? "pass" : "fail"),
    problem:
      "robots.txt blocks Googlebot from this page, so Google can't use it in AI features at all.",
    fixSteps: [
      "Remove the Disallow rule that blocks Googlebot from this path in robots.txt.",
      "Confirm the page is publicly reachable without a login or paywall.",
    ],
    googleSourceUrl: AI_GUIDE_URL,
    guideQuote:
      "ensure your content is crawlable, as Google Search generative AI models use publicly accessible, crawlable content to learn patterns",
    lastReviewedDate: REVIEWED,
    locales: {
      vi: {
        label: "Google có thể thu thập",
        problem:
          "robots.txt đang chặn Googlebot vào trang này, nên Google không thể dùng trang trong các tính năng AI.",
        fixSteps: [
          "Gỡ luật Disallow đang chặn Googlebot khỏi đường dẫn này trong robots.txt.",
          "Kiểm tra trang truy cập được công khai, không cần đăng nhập hay tường phí.",
        ],
      },
    },
  },
  {
    id: "geo-indexable",
    category: "geo",
    severity: "critical",
    label: "Eligible to be indexed",
    appliesWhen: (geo) =>
      robotsHas(geo.robotsMeta, "noindex") ? "fail" : "pass",
    // The directive as the page declared it. This section otherwise never
    // shows it, so a reader seeing "not eligible" has no way to learn why
    // without scrolling to the technical checks. Measured on this rule only:
    // the snippet rule below reads the same single string, and stating it
    // twice in one section would repeat a fact rather than add one.
    measure: (geo) =>
      geo.robotsMeta ? { kind: "text", value: geo.robotsMeta } : null,
    problem:
      "A noindex robots directive keeps this page out of Google's index, and only indexed pages can appear in AI features.",
    fixSteps: [
      'Remove the `noindex` value from the page\'s `<meta name="robots">` (or the X-Robots-Tag header).',
      "Keep it only on pages you genuinely never want in Search.",
    ],
    googleSourceUrl: AI_GUIDE_URL,
    guideQuote:
      "To be eligible to be shown in generative AI features on Google Search, a page must be indexed and eligible to be shown in Google Search with a snippet.",
    lastReviewedDate: REVIEWED,
    locales: {
      vi: {
        label: "Đủ điều kiện lập chỉ mục",
        problem:
          "Chỉ thị robots `noindex` giữ trang khỏi chỉ mục của Google, mà chỉ trang được lập chỉ mục mới xuất hiện trong tính năng AI.",
        fixSteps: [
          'Gỡ giá trị `noindex` khỏi `<meta name="robots">` của trang (hoặc header X-Robots-Tag).',
          "Chỉ giữ nó trên những trang bạn thật sự không bao giờ muốn có trong Tìm kiếm.",
        ],
      },
    },
  },
  {
    id: "geo-snippet-eligible",
    category: "geo",
    severity: "high",
    label: "Snippets allowed",
    appliesWhen: (geo) =>
      robotsHas(geo.robotsMeta, "nosnippet") ||
      robotsHas(geo.robotsMeta, "max-snippet:0")
        ? "warn"
        : "pass",
    problem:
      "A nosnippet (or max-snippet:0) directive stops Google showing a snippet, and AI eligibility requires snippet eligibility.",
    fixSteps: [
      "Remove `nosnippet` / `max-snippet:0` unless you deliberately want no snippet shown.",
      "Use `max-snippet:[n]` to cap length instead of blocking snippets entirely.",
    ],
    googleSourceUrl: AI_GUIDE_URL,
    guideQuote:
      "To be eligible to be shown in generative AI features on Google Search, a page must be indexed and eligible to be shown in Google Search with a snippet.",
    lastReviewedDate: REVIEWED,
    locales: {
      vi: {
        label: "Cho phép trích đoạn",
        problem:
          "Chỉ thị nosnippet (hoặc max-snippet:0) chặn Google hiển thị trích đoạn, trong khi đủ điều kiện AI đòi hỏi đủ điều kiện trích đoạn.",
        fixSteps: [
          "Gỡ `nosnippet` / `max-snippet:0` trừ khi bạn cố ý không muốn hiển thị trích đoạn.",
          "Dùng `max-snippet:[n]` để giới hạn độ dài thay vì chặn hẳn trích đoạn.",
        ],
      },
    },
  },
  {
    id: "geo-answerability",
    category: "geo",
    severity: "low",
    label: "Clear heading structure",
    appliesWhen: (geo) =>
      geo.hasSingleH1 && geo.hasHeadingHierarchy ? "pass" : "warn",
    problem:
      "The page lacks a single clear <h1> and a non-skipping heading hierarchy, making it harder for Google to parse and answer from.",
    fixSteps: [
      "Give the page exactly one <h1> stating its main topic.",
      "Nest headings in order (h1 → h2 → h3) without skipping levels.",
    ],
    googleSourceUrl: AI_GUIDE_URL,
    guideQuote:
      "People generally appreciate it when web pages are organized by paragraphs and sections, along with headings that provide a clear structure",
    lastReviewedDate: REVIEWED,
    locales: {
      vi: {
        label: "Cấu trúc tiêu đề rõ ràng",
        problem:
          "Trang thiếu một thẻ <h1> rõ ràng duy nhất và một cấu trúc tiêu đề không nhảy cấp, khiến Google khó phân tích và trả lời từ trang.",
        fixSteps: [
          "Cho trang đúng một thẻ <h1> nêu chủ đề chính.",
          "Lồng các tiêu đề theo thứ tự (h1 → h2 → h3), không nhảy cấp.",
        ],
      },
    },
  },
  {
    id: "geo-structured-data",
    category: "geo",
    severity: "low",
    label: "Structured data present (optional)",
    // Absent is a low warn, never a fail: the guide is explicit that schema is
    // not required for AI — the quote itself tells the reader so. Present earns
    // a pass because it still helps Search understand the page.
    appliesWhen: (geo) => (geo.schemaTypes.length > 0 ? "pass" : "warn"),
    // The types found, not how many: "Article, FAQPage" tells the reader what
    // Google will actually see on the page, which "pass" alone does not. Absent
    // when there are none — the warn verdict already says that.
    measure: (geo) =>
      geo.schemaTypes.length > 0
        ? { kind: "text", value: geo.schemaTypes.join(", ") }
        : null,
    problem:
      "This page has no JSON-LD structured data. It isn't required for AI features, but it helps Google understand your content.",
    fixSteps: [
      "Add JSON-LD schema.org markup matching the page type (Article, FAQPage, Product, Organization…).",
      "Validate it with Google's Rich Results Test.",
    ],
    googleSourceUrl: AI_GUIDE_URL,
    guideQuote:
      "Structured data isn't required for generative AI search, and there's no special schema.org markup you need to add.",
    lastReviewedDate: REVIEWED,
    locales: {
      vi: {
        label: "Có dữ liệu có cấu trúc (tùy chọn)",
        problem:
          "Trang này không có dữ liệu có cấu trúc JSON-LD. Nó không bắt buộc cho tính năng AI, nhưng giúp Google hiểu nội dung của bạn.",
        fixSteps: [
          "Thêm đánh dấu schema.org JSON-LD khớp loại trang (Article, FAQPage, Product, Organization…).",
          "Kiểm tra bằng công cụ Rich Results Test của Google.",
        ],
      },
    },
  },
];
