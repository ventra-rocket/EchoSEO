/**
 * Technical rule catalog: HTTPS/status code/robots noindex/mixed content.
 *
 * Thresholds match Phase 1's original `evaluateSignals` logic in
 * `services/seo-check/lite.ts` — this is a refactor of where that logic
 * lives, not a behavior change.
 */
import type { OnPageSignals, Rule } from "../types";

export const TECHNICAL_RULES: Array<Rule<OnPageSignals>> = [
  {
    id: "server-https",
    category: "server",
    severity: "critical",
    label: "Served over HTTPS",
    appliesWhen: (page) => (page.url.startsWith("https:") ? "pass" : "fail"),
    problem:
      "The page is served over plain HTTP instead of HTTPS, which is a security risk and part of Google's page-experience assessment.",
    fixSteps: [
      "Install a TLS certificate and serve the site over HTTPS.",
      "Redirect all HTTP requests to the HTTPS equivalent (301).",
    ],
    googleSourceUrl:
      "https://developers.google.com/search/docs/appearance/page-experience",
    guideQuote: "Are your pages served in a secure fashion?",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Trang được phân phát qua HTTPS",
        problem:
          "Trang đang được phân phát qua HTTP thường thay vì HTTPS — vừa là rủi ro bảo mật, vừa nằm trong tiêu chí đánh giá trải nghiệm trang của Google.",
        fixSteps: [
          "Cài chứng chỉ TLS và phân phát website qua HTTPS.",
          "Chuyển hướng (301) mọi yêu cầu HTTP sang phiên bản HTTPS tương ứng.",
        ],
      },
    },
  },
  {
    id: "server-status",
    category: "server",
    severity: "critical",
    label: "Responds with a healthy status code",
    appliesWhen: (page) => {
      if (page.statusCode === 200) return "pass";
      if (page.statusCode < 400) return "warn";
      return "fail";
    },
    problem:
      "The page returned an error or redirect status code instead of 200 OK, which can keep it out of the index entirely.",
    fixSteps: [
      "Fix the server error, or update the link/sitemap entry if the URL has permanently moved.",
      "Make sure the final URL after any redirects returns 200 OK.",
    ],
    googleSourceUrl:
      "https://developers.google.com/crawling/docs/troubleshooting/http-status-codes",
    guideQuote:
      "Google doesn't use the content from URLs that return 4xx status codes.",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Trả về mã trạng thái hợp lệ",
        problem:
          "Trang trả về mã trạng thái lỗi hoặc chuyển hướng thay vì 200 OK, điều này có thể khiến trang hoàn toàn không được lập chỉ mục.",
        fixSteps: [
          "Sửa lỗi máy chủ, hoặc cập nhật liên kết/mục trong sitemap nếu URL đã chuyển hẳn sang địa chỉ mới.",
          "Đảm bảo URL cuối cùng sau mọi lượt chuyển hướng trả về 200 OK.",
        ],
      },
    },
  },
  {
    id: "server-indexable",
    category: "server",
    severity: "critical",
    label: "Not blocked from indexing via robots meta",
    appliesWhen: (page) => {
      const blocksIndex = (page.robotsMeta ?? "")
        .toLowerCase()
        .includes("noindex");
      return blocksIndex ? "fail" : "pass";
    },
    problem:
      'The page has a <meta name="robots" content="noindex"> tag, which tells Google not to show it in search results at all.',
    fixSteps: [
      "Remove the noindex directive from the robots meta tag (or X-Robots-Tag header) if the page should be searchable.",
      "Double-check this wasn't left over from staging/development.",
    ],
    googleSourceUrl:
      "https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag",
    guideQuote:
      "Do not show this page, media, or resource in search results. If you don't specify this rule, the page, media, or resource may be indexed and shown in search results.",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Không bị chặn lập chỉ mục qua thẻ meta robots",
        problem:
          'Trang có thẻ <meta name="robots" content="noindex">, tức là yêu cầu Google hoàn toàn không hiển thị trang trong kết quả tìm kiếm.',
        fixSteps: [
          "Gỡ chỉ thị noindex khỏi thẻ meta robots (hoặc header X-Robots-Tag) nếu trang cần xuất hiện trong tìm kiếm.",
          "Kiểm tra kỹ xem đây có phải cấu hình còn sót lại từ môi trường staging/phát triển không.",
        ],
      },
    },
  },
  {
    id: "server-mixed-content",
    category: "server",
    severity: "high",
    label: "No mixed HTTP content on an HTTPS page",
    appliesWhen: (page) => (page.hasMixedContent ? "fail" : "pass"),
    problem:
      "An HTTPS page is loading one or more sub-resources (images, scripts, stylesheets, iframes) over plain HTTP, which browsers flag as insecure.",
    fixSteps: [
      "Update every sub-resource URL (img/script/link/iframe src or href) to use https:// instead of http://.",
      "Use protocol-relative or root-relative URLs to avoid this recurring.",
    ],
    googleSourceUrl: "https://web.dev/articles/what-is-mixed-content",
    guideQuote:
      "A page has mixed content when its initial HTML is loaded over a secure HTTPS connection, but other resources (such as images, videos, stylesheets, and scripts) are loaded over an insecure HTTP connection.",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Không có nội dung hỗn hợp HTTP trên trang HTTPS",
        problem:
          "Trang HTTPS đang tải một hoặc nhiều tài nguyên con (hình ảnh, script, stylesheet, iframe) qua HTTP thường, và trình duyệt sẽ đánh dấu là không an toàn.",
        fixSteps: [
          "Cập nhật URL của mọi tài nguyên con (src hoặc href của img/script/link/iframe) sang https:// thay vì http://.",
          "Dùng URL tương đối theo giao thức hoặc tính từ thư mục gốc để lỗi này không tái diễn.",
        ],
      },
    },
  },
];
