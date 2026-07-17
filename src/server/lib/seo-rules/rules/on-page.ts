/**
 * On-page rule catalog: title/meta/headings/canonical/alt/word-count.
 *
 * Thresholds match Phase 1's original `evaluateSignals` logic in
 * `services/seo-check/lite.ts` — this is a refactor of where that logic
 * lives, not a behavior change.
 */
import type { OnPageSignals, Rule, RuleMeta } from "../types";

/** True if a heading level jumps by more than one from the highest seen so far. */
function hasHeadingLevelSkip(order: number[]): boolean {
  let maxSeen = 0;
  for (const level of order) {
    if (maxSeen > 0 && level > maxSeen + 1) return true;
    if (level > maxSeen) maxSeen = level;
  }
  return false;
}

export const ON_PAGE_RULES: Array<Rule<OnPageSignals>> = [
  {
    id: "meta-title",
    category: "meta",
    severity: "critical",
    label: "Title tag present, 10-60 characters",
    appliesWhen: (page) => {
      const len = page.title.length;
      if (len === 0) return "fail";
      if (len < 10 || len > 60) return "warn";
      return "pass";
    },
    problem:
      "The page's <title> tag is missing, or too short/long to display well in search results.",
    fixSteps: [
      "Add a unique, descriptive <title> tag to the page's <head>.",
      "Keep it to roughly 10-60 characters so it doesn't get truncated in search results.",
      'Front-load the page\'s main topic instead of a vague label like "Home".',
    ],
    googleSourceUrl:
      "https://developers.google.com/search/docs/appearance/title-link",
    guideQuote:
      'Write descriptive and concise text for your <title> elements. Avoid vague descriptors like "Home" for your home page, or "Profile" for a specific person\'s profile.',
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Có thẻ tiêu đề, 10–60 ký tự",
        problem:
          "Trang thiếu thẻ <title>, hoặc thẻ quá ngắn/quá dài nên hiển thị không tốt trong kết quả tìm kiếm.",
        fixSteps: [
          "Thêm một thẻ <title> duy nhất, mô tả rõ nội dung vào phần <head> của trang.",
          "Giữ độ dài khoảng 10–60 ký tự để tiêu đề không bị cắt cụt trong kết quả tìm kiếm.",
          'Đưa chủ đề chính của trang lên đầu tiêu đề, thay vì một nhãn mơ hồ như "Trang chủ".',
        ],
      },
    },
  },
  {
    id: "meta-description",
    category: "meta",
    severity: "high",
    label: "Meta description present, 50-160 characters",
    appliesWhen: (page) => {
      const len = page.metaDescription.length;
      if (len === 0) return "fail";
      if (len < 50 || len > 160) return "warn";
      return "pass";
    },
    problem:
      "The page's meta description is missing, or too short/long to make a good search-result snippet.",
    fixSteps: [
      'Add a unique <meta name="description"> summarizing the page\'s content.',
      "Aim for roughly 50-160 characters — Google truncates the displayed snippet to fit the device width.",
      "Write it for the searcher (why this page answers their query), not for keyword stuffing.",
    ],
    googleSourceUrl:
      "https://developers.google.com/search/docs/appearance/snippet",
    guideQuote:
      "There's no limit on how long a meta description can be, but the snippet is truncated in Google Search results as needed, typically to fit the device width.",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Có thẻ meta description, 50–160 ký tự",
        problem:
          "Trang thiếu thẻ meta description, hoặc thẻ quá ngắn/quá dài để tạo được đoạn trích tốt trong kết quả tìm kiếm.",
        fixSteps: [
          'Thêm một thẻ <meta name="description"> duy nhất, tóm tắt nội dung của trang.',
          "Nhắm tới khoảng 50–160 ký tự — Google cắt đoạn trích hiển thị cho vừa chiều rộng thiết bị.",
          "Viết cho người tìm kiếm (vì sao trang này trả lời đúng truy vấn của họ), đừng nhồi nhét từ khóa.",
        ],
      },
    },
  },
  {
    id: "meta-canonical",
    category: "meta",
    severity: "high",
    label: "Canonical link tag present",
    appliesWhen: (page) => (page.canonical ? "pass" : "fail"),
    problem:
      'The page has no rel="canonical" link, so Google must guess which URL is the authoritative version if duplicates exist.',
    fixSteps: [
      'Add a <link rel="canonical" href="..."> in the <head> pointing at the preferred URL.',
      "Point every duplicate/parameterized variant of a page at the same canonical URL.",
    ],
    googleSourceUrl:
      "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
    guideQuote:
      'A rel="canonical" link element (also known as a canonical element) is an element used in the head section of HTML to indicate that another page is representative of the content on the page.',
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Có thẻ link canonical",
        problem:
          'Trang không có thẻ rel="canonical", nên khi tồn tại nội dung trùng lặp, Google phải tự đoán URL nào là phiên bản chính thức.',
        fixSteps: [
          'Thêm thẻ <link rel="canonical" href="..."> vào phần <head>, trỏ tới URL ưu tiên.',
          "Trỏ mọi biến thể trùng lặp/có tham số của trang về cùng một URL canonical.",
        ],
      },
    },
  },
  {
    id: "structure-h1",
    category: "structure",
    severity: "high",
    label: "Exactly one H1 heading",
    appliesWhen: (page) => {
      const count = page.h1s.length;
      if (count === 1) return "pass";
      if (count === 0) return "fail";
      return "warn";
    },
    // Google's own SEO starter guide says there's no ideal heading count and
    // heading order doesn't affect Search ranking — this check is a content-
    // structure/accessibility best practice, not a Google ranking claim.
    problem:
      "The page has no H1, or more than one, which makes it harder for readers and assistive technology to identify the page's main heading.",
    fixSteps: [
      "Add exactly one <h1> that describes the page's main topic.",
      "If multiple H1s exist, demote the extras to <h2> or lower.",
    ],
    googleSourceUrl: "https://web.dev/articles/headings-and-landmarks",
    guideQuote:
      "A common practice is to use a single h1 for the primary headline or logo on a page, h2 elements to designate major sections, and h3 elements in supporting subsections",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Có đúng một thẻ heading H1",
        problem:
          "Trang không có H1, hoặc có nhiều hơn một, khiến người đọc và công nghệ hỗ trợ khó nhận ra đâu là tiêu đề chính của trang.",
        fixSteps: [
          "Thêm đúng một thẻ <h1> mô tả chủ đề chính của trang.",
          "Nếu có nhiều H1, hạ các thẻ thừa xuống <h2> hoặc thấp hơn.",
        ],
      },
    },
  },
  {
    id: "structure-heading-order",
    category: "structure",
    severity: "low",
    label: "Heading levels do not skip (e.g. H2 straight to H4)",
    appliesWhen: (page) =>
      hasHeadingLevelSkip(page.headingOrder) ? "warn" : "pass",
    // Google's own SEO starter guide explicitly says heading order doesn't
    // affect Search ranking — this check is an accessibility best practice
    // (screen readers rely on the outline), not a Google ranking claim.
    problem:
      "Heading levels skip a step (e.g. an H2 followed directly by an H4), which breaks the document outline for screen readers and makes the page's structure harder to parse.",
    fixSteps: [
      "Reorder headings so each level only appears under its immediate parent (H3 under H2, H4 under H3, etc).",
      "Use heading levels for document structure, not for visual font size — style with CSS instead.",
    ],
    googleSourceUrl: "https://web.dev/articles/headings-and-landmarks",
    guideQuote:
      "Developers often skip heading levels to use the browser's default styles that closely match their design. This is considered an anti-pattern because it breaks the outline model.",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Các cấp heading không nhảy bậc (vd H2 nhảy thẳng xuống H4)",
        problem:
          "Các cấp heading bị nhảy bậc (vd một H2 theo ngay sau là H4), làm hỏng dàn ý tài liệu đối với trình đọc màn hình và khiến cấu trúc trang khó nắm bắt hơn.",
        fixSteps: [
          "Sắp xếp lại heading để mỗi cấp chỉ nằm ngay dưới cấp cha liền kề (H3 dưới H2, H4 dưới H3, v.v.).",
          "Dùng cấp heading cho cấu trúc tài liệu, không phải để chỉnh cỡ chữ — hãy tạo kiểu bằng CSS.",
        ],
      },
    },
  },
  {
    id: "structure-image-alt",
    category: "structure",
    severity: "low",
    label: "Images have descriptive alt text",
    appliesWhen: (page) => {
      const imagesWithSrc = page.images.filter((img) => img.src);
      // alt="" is a valid, intentional "decorative image" marker (WCAG) — only
      // a truly absent alt attribute (null) counts as missing.
      const missingAlt = imagesWithSrc.filter((img) => img.alt === null).length;
      if (imagesWithSrc.length === 0 || missingAlt === 0) return "pass";
      if (missingAlt === imagesWithSrc.length) return "fail";
      return "warn";
    },
    problem:
      "Some images are missing alt text, so Google (and screen readers) have no description of what they show.",
    fixSteps: [
      "Add an alt attribute describing each meaningful image's content.",
      'Use alt="" only for purely decorative images, not as a placeholder for missing descriptions.',
    ],
    googleSourceUrl:
      "https://developers.google.com/search/docs/appearance/google-images",
    guideQuote:
      "The most important attribute when it comes to providing more metadata for an image is the alt text (text that describes an image), which also improves accessibility",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Hình ảnh có văn bản alt mô tả nội dung",
        problem:
          "Một số hình ảnh thiếu văn bản alt, nên Google (và trình đọc màn hình) không có mô tả nào về nội dung hình.",
        fixSteps: [
          "Thêm thuộc tính alt mô tả nội dung cho từng hình ảnh mang ý nghĩa.",
          'Chỉ dùng alt="" cho hình thuần trang trí, đừng dùng nó để thế chỗ phần mô tả còn thiếu.',
        ],
      },
    },
  },
  {
    id: "structure-word-count",
    category: "structure",
    severity: "low",
    label: "Enough indexable content (300+ words)",
    appliesWhen: (page) => {
      if (page.wordCount >= 600) return "pass";
      if (page.wordCount >= 300) return "warn";
      return "fail";
    },
    // Google has no published word-count minimum — this checks for thin
    // content as a proxy, not a documented Google threshold. See guideQuote.
    problem:
      "The page has very little visible text content, which can read as thin content with little value to searchers.",
    fixSteps: [
      "Expand the page with substantive, original content that helps the reader accomplish their task.",
      "Don't pad word count with filler — Google evaluates content quality, not length, per its own guidance.",
    ],
    googleSourceUrl:
      "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    guideQuote:
      "Google's automated ranking systems are designed to prioritize helpful, reliable information that's created to benefit people, and not content that's created to manipulate search engine rankings.",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Đủ nội dung để lập chỉ mục (300+ từ)",
        problem:
          "Trang có rất ít nội dung văn bản hiển thị, dễ bị xem là nội dung mỏng, ít giá trị với người tìm kiếm.",
        fixSteps: [
          "Bổ sung cho trang nội dung nguyên bản, có chiều sâu, giúp người đọc hoàn thành việc họ cần.",
          "Đừng độn chữ cho đủ số từ — theo chính hướng dẫn của Google, thứ được đánh giá là chất lượng nội dung, không phải độ dài.",
        ],
      },
    },
  },
];

/**
 * Structured data is only appropriate when the page qualifies for one of
 * Google's supported rich-result types. Lite does not know a page's content
 * type or whether existing markup is valid, so it must not turn missing
 * JSON-LD into a site-wide warning. P09 will evaluate this guidance with
 * type-aware validation and persisted evidence.
 */
export const STRUCTURED_DATA_GUIDANCE: RuleMeta = {
  id: "structure-structured-data",
  category: "structure",
  severity: "low",
  label: "Structured data guidance (when eligible)",
  problem:
    "Structured data is optional. Add it only when the page genuinely matches a Google-supported rich-result type and the markup represents visible page content.",
  fixSteps: [
    "Check whether this page's content type is eligible for a Google-supported rich result before adding markup.",
    "If eligible, add JSON-LD that matches the visible content and validate it with Google's Rich Results Test before publishing.",
  ],
  googleSourceUrl:
    "https://developers.google.com/search/docs/appearance/structured-data/sd-policies",
  guideQuote:
    "Google does not guarantee that your structured data will show up in search results, even if your page is marked up correctly according to the Rich Results Test.",
  lastReviewedDate: "2026-07-13",
};
