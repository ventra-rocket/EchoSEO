/**
 * Per-locale copy for the public checker landing (EN `/free-seo-check`, VI
 * `/vi/kiem-tra-seo`). One structured object per locale rather than the flat
 * react-intl catalog the authenticated shell uses: the editorial here is a
 * cohesive page — feature lists and an FAQ array that must feed BOTH the rendered
 * accordion and the FAQPage structured data — which a flat string map cannot hold
 * without splitting the FAQ apart and risking drift.
 *
 * Both routes render the same component with a `locale`; the locale comes from
 * the URL, so it is a valid, crawlable per-language signal (unlike the shell's
 * cookie). Every claim is grounded in what the checker actually does.
 *
 * NOTE: the Vietnamese copy is a first draft pending a native review before it is
 * treated as final — it is the SEO asset for the `.vn` audience.
 */
import type { Locale } from "@/client/i18n/config";

export interface LandingFeature {
  title: string;
  body: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface LandingCopy {
  /** <title> and meta description — localized so each URL reads natively. */
  metaTitle: string;
  metaDescription: string;
  heroHeading: string;
  heroSubtitle: string;
  urlLabel: string;
  urlPlaceholder: string;
  submitIdle: string;
  submitLoading: string;
  turnstileUnconfigured: string;
  turnstileLoadError: string;
  /** API error code → message; falls back to `errorDefault`. */
  errors: Record<string, string>;
  errorDefault: string;
  intro: string;
  whatWeCheckHeading: string;
  whatWeCheck: readonly LandingFeature[];
  howItWorksHeading: string;
  howItWorks: readonly LandingFeature[];
  faqHeading: string;
  faqs: readonly FaqEntry[];
}

const EN: LandingCopy = {
  metaTitle: "Free SEO Checker — EchoSEO",
  metaDescription:
    "Check any page's on-page SEO instantly and free — title, meta, headings, and technical basics, no signup required.",
  heroHeading: "Free SEO Checker",
  heroSubtitle:
    "Instant on-page SEO check — title, meta, headings, and technical basics. No signup required.",
  urlLabel: "Website URL",
  urlPlaceholder: "example.com",
  submitIdle: "Check my site",
  submitLoading: "Checking…",
  turnstileUnconfigured: "Turnstile is not configured for this deployment yet.",
  turnstileLoadError: "Couldn't load verification — please refresh the page.",
  errors: {
    VALIDATION_ERROR: "Enter a valid URL to check.",
    CRAWL_TARGET_BLOCKED: "That URL can't be checked.",
    FORBIDDEN: "Verification failed — please retry the checkbox above.",
    RATE_LIMITED: "You've hit the free-check limit for now — try again later.",
    UPSTREAM_UNAVAILABLE:
      "We couldn't reach that site. Check the URL and try again.",
  },
  errorDefault: "Something went wrong — please try again.",
  intro:
    "Paste a URL and get an instant, plain-language read on its on-page SEO — " +
    "then a fix for each issue that points at Google's own guidance, not a guess.",
  whatWeCheckHeading: "What the free check looks at",
  whatWeCheck: [
    {
      title: "Title & meta",
      body:
        "Whether the page states a clear title and meta description — the text " +
        "Google shows in results and the first thing a searcher reads.",
    },
    {
      title: "Heading structure",
      body:
        "Whether the page has one clear H1 and a sensible heading outline, so " +
        "both readers and crawlers can tell what it is about.",
    },
    {
      title: "Technical basics",
      body:
        "Status codes, redirects, and indexability signals — the plumbing that " +
        "decides whether a page can rank at all before content ever matters.",
    },
  ],
  howItWorksHeading: "How it works",
  howItWorks: [
    {
      title: "Instant on-page check",
      body:
        "Results appear in your browser moments after you submit — no signup, no " +
        "wait. Each issue comes with steps to fix it and the Google page that " +
        "backs the advice.",
    },
    {
      title: "Free deep check by email",
      body:
        "Ask for the deep check and we run Core Web Vitals through Google " +
        "PageSpeed Insights and crawl several of your internal pages, then email " +
        "you a shareable report when it is done. Also free — the email just lets " +
        "us reach you when the crawl finishes.",
    },
  ],
  faqHeading: "Frequently asked questions",
  faqs: [
    {
      question: "Is the SEO check really free?",
      answer:
        "Yes. The instant on-page check is free with no signup. The deeper check — " +
        "Core Web Vitals plus a multi-page crawl — is free too; it only asks for an " +
        "email so we can send the report once the crawl finishes.",
    },
    {
      question: "Do I need to sign up or install anything?",
      answer:
        "No. Paste a URL, pass the bot check, and read the result in your browser.",
    },
    {
      question: "How is this different from PageSpeed Insights?",
      answer:
        "PageSpeed scores loading performance. This checks on-page SEO — titles, " +
        "headings, indexability — and, in the deep check, pulls Core Web Vitals from " +
        "PageSpeed too, then explains how to fix what it finds with a link to Google's " +
        "own documentation for each issue.",
    },
    {
      question: "What does the deep check add?",
      answer:
        "Core Web Vitals (LCP, INP, CLS) plus TTFB, measured through Google " +
        "PageSpeed Insights, plus a crawl of several of your internal pages. It " +
        "runs in the background and arrives in your inbox as a shareable report.",
    },
    {
      question: "Is my report private?",
      answer:
        "The report link is unlisted and set to no-index, so it never shows up in " +
        "search results — only someone with the link can open it.",
    },
  ],
};

const VI: LandingCopy = {
  metaTitle: "Kiểm tra SEO miễn phí — EchoSEO",
  metaDescription:
    "Kiểm tra SEO on-page cho bất kỳ trang nào, ngay lập tức và miễn phí — tiêu đề, thẻ meta, heading và các yếu tố kỹ thuật, không cần đăng ký.",
  heroHeading: "Kiểm tra SEO miễn phí",
  heroSubtitle:
    "Kiểm tra SEO on-page tức thì — tiêu đề, thẻ meta, heading và các yếu tố kỹ thuật cơ bản. Không cần đăng ký.",
  urlLabel: "Địa chỉ website",
  urlPlaceholder: "example.com",
  submitIdle: "Kiểm tra trang của tôi",
  submitLoading: "Đang kiểm tra…",
  turnstileUnconfigured:
    "Xác minh Turnstile chưa được cấu hình cho bản triển khai này.",
  turnstileLoadError: "Không tải được phần xác minh — vui lòng tải lại trang.",
  errors: {
    VALIDATION_ERROR: "Nhập một URL hợp lệ để kiểm tra.",
    CRAWL_TARGET_BLOCKED: "Không thể kiểm tra URL này.",
    FORBIDDEN: "Xác minh thất bại — vui lòng thử lại ô xác minh ở trên.",
    RATE_LIMITED:
      "Bạn đã dùng hết lượt kiểm tra miễn phí lúc này — vui lòng thử lại sau.",
    UPSTREAM_UNAVAILABLE:
      "Chúng tôi không truy cập được trang đó. Kiểm tra lại URL rồi thử lần nữa.",
  },
  errorDefault: "Đã có lỗi xảy ra — vui lòng thử lại.",
  intro:
    "Dán một URL và nhận ngay đánh giá SEO on-page bằng ngôn ngữ dễ hiểu — kèm " +
    "cách khắc phục cho từng lỗi, dẫn thẳng tới tài liệu chính thức của Google " +
    "chứ không phải phỏng đoán.",
  whatWeCheckHeading: "Bản kiểm tra miễn phí xem xét những gì?",
  whatWeCheck: [
    {
      title: "Tiêu đề & thẻ meta",
      body:
        "Trang đã có tiêu đề và thẻ mô tả rõ ràng chưa — đây là phần Google hiển " +
        "thị trong kết quả tìm kiếm và là thứ người dùng đọc đầu tiên.",
    },
    {
      title: "Cấu trúc heading",
      body:
        "Trang có một thẻ H1 rõ ràng và cấu trúc heading hợp lý không, để cả người " +
        "đọc lẫn công cụ tìm kiếm hiểu trang nói về điều gì.",
    },
    {
      title: "Yếu tố kỹ thuật cơ bản",
      body:
        "Mã trạng thái, chuyển hướng và các tín hiệu cho phép lập chỉ mục — nền " +
        "móng kỹ thuật quyết định một trang có thể xếp hạng hay không, trước cả khi xét nội dung.",
    },
  ],
  howItWorksHeading: "Cách hoạt động",
  howItWorks: [
    {
      title: "Kiểm tra on-page tức thì",
      body:
        "Kết quả hiện ngay trên trình duyệt vài giây sau khi bạn gửi — không đăng " +
        "ký, không chờ đợi. Mỗi lỗi đều kèm các bước khắc phục và trang tài liệu " +
        "Google làm căn cứ.",
    },
    {
      title: "Kiểm tra chuyên sâu miễn phí qua email",
      body:
        "Yêu cầu bản kiểm tra chuyên sâu, chúng tôi sẽ đo Core Web Vitals qua " +
        "Google PageSpeed Insights và quét vài trang nội bộ của bạn, rồi gửi email " +
        "một báo cáo có thể chia sẻ khi hoàn tất. Cũng miễn phí — email chỉ để chúng " +
        "tôi báo bạn khi quét xong.",
    },
  ],
  faqHeading: "Câu hỏi thường gặp",
  faqs: [
    {
      question: "Kiểm tra SEO này có thực sự miễn phí không?",
      answer:
        "Có. Bản kiểm tra on-page tức thì miễn phí và không cần đăng ký. Bản chuyên " +
        "sâu — gồm Core Web Vitals và quét nhiều trang — cũng miễn phí; chỉ cần email " +
        "để chúng tôi gửi báo cáo khi quét xong.",
    },
    {
      question: "Tôi có cần đăng ký hay cài đặt gì không?",
      answer:
        "Không. Dán URL, vượt qua bước xác minh, và xem kết quả ngay trên trình duyệt.",
    },
    {
      question: "Công cụ này khác PageSpeed Insights ở điểm nào?",
      answer:
        "PageSpeed chấm điểm tốc độ tải. Công cụ này kiểm tra SEO on-page — tiêu đề, " +
        "heading, khả năng lập chỉ mục — và ở bản chuyên sâu cũng lấy Core Web Vitals " +
        "từ PageSpeed, rồi giải thích cách sửa từng lỗi kèm liên kết tới tài liệu chính " +
        "thức của Google.",
    },
    {
      question: "Bản kiểm tra chuyên sâu có thêm gì?",
      answer:
        "Core Web Vitals (LCP, INP, CLS) cùng TTFB, đo qua Google PageSpeed Insights, " +
        "và quét vài trang nội bộ của bạn. Nó chạy nền và gửi tới hộp thư của bạn dưới " +
        "dạng báo cáo có thể chia sẻ.",
    },
    {
      question: "Báo cáo của tôi có riêng tư không?",
      answer:
        "Liên kết báo cáo không công khai và được đặt no-index, nên không bao giờ " +
        "xuất hiện trong kết quả tìm kiếm — chỉ người có liên kết mới mở được.",
    },
  ],
};

export const LANDING_COPY: Record<Locale, LandingCopy> = { en: EN, vi: VI };
