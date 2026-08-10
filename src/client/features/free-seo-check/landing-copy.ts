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

export type SampleSignalStatus = "pass" | "warn" | "fail";

interface SampleSignalRow {
  /** Machine rule id, rendered mono — mirrors the ids a real report shows. */
  id: string;
  label: string;
  /** Measured value with units — the instrument voice ("54 chars"). */
  detail: string;
  status: SampleSignalStatus;
}

/**
 * The illustrative "what you get" card. Self-contained sample strings by design:
 * they live here (not in the rules engine) so they stay translatable, at the
 * cosmetic cost of possibly drifting from real rule wording over time.
 */
export interface SampleReportCopy {
  /** Visible badge AND the section's accessible name — the honesty label. */
  label: string;
  heading: string;
  /** Under the sample gauge: how a real report's scoring relates to this card. */
  scoreCaption: string;
  /** Verdict words on the sample rows — kept aligned with the real report UI. */
  statusLabels: Record<SampleSignalStatus, string>;
  rows: readonly SampleSignalRow[];
  footnote: string;
}

export interface LandingCopy {
  /** <title> and meta description — localized so each URL reads natively. */
  metaTitle: string;
  metaDescription: string;
  /**
   * Mono line above the h1 — carries the teal accent so the h1 itself can
   * stay one contiguous keyword string for the SSR tripwire. A concrete scope
   * readout, not a slogan: three abstract verbs in a row is the stock
   * AI-landing register this page is trying to shed.
   */
  heroEyebrow: string;
  heroHeading: string;
  /**
   * The subtitle renders as before + accent + after (accent in teal). The three
   * parts concatenate to the exact sentence crawlers have already indexed — the
   * split exists only so a keyword can carry the brand color.
   */
  heroSubtitleBefore: string;
  heroSubtitleAccent: string;
  heroSubtitleAfter: string;
  /**
   * The cross-locale switch, written in the TARGET language: the visitor who
   * needs it cannot be assumed to read the page's current language.
   */
  languageSwitchLabel: string;
  languageSwitchAria: string;
  /** Short mono facts under the form. Every claim must stay true of the tool. */
  trustSignals: readonly string[];
  samplePreview: SampleReportCopy;
  urlLabel: string;
  urlPlaceholder: string;
  /**
   * Inline error under the URL field for input that cannot be a fetchable
   * site. Shown by the client-side pre-check that runs before the Turnstile
   * token is spent — see validate-check-url.ts.
   */
  urlInvalid: string;
  /**
   * Label over the Turnstile challenge, same tier as `urlLabel`: framed and
   * labelled like a form field, the widget reads as part of the form instead of
   * a stray grey iframe dropped between the input and the button.
   */
  challengeLabel: string;
  submitIdle: string;
  submitLoading: string;
  /** Shown when the visitor submitted before the bot check finished. */
  submitVerifying: string;
  /**
   * H2 over the rendered result — the accessible name of the report section
   * and the focus/scroll target after a successful check.
   */
  reportHeading: string;
  /**
   * H2 over the loading skeleton. Sits in the same slot the report heading will
   * occupy, so when the real report swaps in the heading doesn't move — only the
   * body firms up from ghost to result.
   */
  scanHeading: string;
  /** The keyboard user's first tab stop, pointing at the main content. */
  skipToContent: string;
  /** Footer: one line saying what EchoSEO is, beyond this single tool. */
  footerProductLine: string;
  footerHomeAria: string;
  turnstileUnconfigured: string;
  turnstileLoadError: string;
  /** API error code → message; falls back to `errorDefault`. */
  errors: Record<string, string>;
  errorDefault: string;
  /** Shown when the reply is not the JSON this API always answers with — the
   * request died before reaching any handler, so no error code exists. */
  errorUnfinished: string;
  intro: string;
  /**
   * Mono uppercase kickers over each editorial section heading — the h2 tier is
   * eyebrow + heading, so sections read as chapters rather than more cards.
   */
  whatWeCheckEyebrow: string;
  whatWeCheckHeading: string;
  whatWeCheck: readonly LandingFeature[];
  howItWorksEyebrow: string;
  howItWorksHeading: string;
  howItWorks: readonly LandingFeature[];
  faqEyebrow: string;
  faqHeading: string;
  faqs: readonly FaqEntry[];
}

const EN: LandingCopy = {
  metaTitle: "Free SEO Checker — EchoSEO",
  metaDescription:
    "Check any page's on-page SEO instantly and free — title, meta, headings, and technical basics, no signup required.",
  // NBSPs inside the last term so a narrow viewport wraps at a separator, not
  // inside "Core Web Vitals".
  heroEyebrow: "On-page · Technical · Core Web Vitals",
  heroHeading: "Free SEO Checker",
  // The differentiator leads. "Instant on-page SEO check" is the promise every
  // free checker makes; citing each fix to Google's own docs is the one thing
  // this tool does that the others do not, so it holds the accent position
  // rather than sitting third in a row of 12px chips.
  heroSubtitleBefore:
    "Instant on-page SEO check — every issue comes with a fix ",
  heroSubtitleAccent: "cited to Google's own documentation",
  heroSubtitleAfter: ", not a guess. No signup.",
  languageSwitchLabel: "Tiếng Việt",
  languageSwitchAria: "Xem trang này bằng tiếng Việt",
  // Each claim is checkable: the Lite rule set scores 12 signals (8 on-page +
  // 4 technical), every fix cites a Google doc, and Deep crawls internal
  // pages. CWV/Lighthouse are deliberately NOT the Deep chip anymore — the
  // free result shows them (homepage, lab), so the crawl is Deep's honest
  // headline.
  trustSignals: [
    "12 signals scored",
    "free — no signup",
    "every fix cites Google's docs",
    "deep check adds a multi-page crawl",
  ],
  samplePreview: {
    label: "Sample report",
    heading: "What your report shows",
    scoreCaption: "12 signals scored — 4 shown",
    statusLabels: { pass: "pass", warn: "warn", fail: "fail" },
    rows: [
      {
        id: "meta-title",
        label: "Title tag",
        detail: "54 chars",
        status: "pass",
      },
      {
        id: "meta-description",
        label: "Meta description",
        detail: "38 chars — too short",
        status: "warn",
      },
      {
        id: "structure-h1",
        label: "H1 heading",
        detail: "3 found — expected 1",
        status: "fail",
      },
      {
        id: "server-indexable",
        label: "Indexability",
        detail: "200 · index, follow",
        status: "pass",
      },
    ],
    footnote:
      "Illustrative numbers — run a check to see your page's real readout.",
  },
  urlLabel: "Website URL",
  urlPlaceholder: "example.com",
  urlInvalid: "Enter a valid domain, such as example.com.",
  challengeLabel: "Bot check",
  submitIdle: "Check my site",
  submitLoading: "Checking…",
  submitVerifying: "Starting your check…",
  reportHeading: "Your SEO Report",
  scanHeading: "Scanning your site",
  skipToContent: "Skip to main content",
  footerProductLine:
    "EchoSEO is an open, agent-native SEO platform. This checker is free — self-hostable, your data stays private, and reports auto-delete after 30 days.",
  footerHomeAria: "EchoSEO home",
  turnstileUnconfigured: "Turnstile is not configured for this deployment yet.",
  turnstileLoadError: "Couldn't load verification — please refresh the page.",
  errors: {
    VALIDATION_ERROR: "Enter a valid URL to check.",
    CRAWL_TARGET_BLOCKED: "That URL can't be checked.",
    // Says "we've reset it" because that is literally what happened: every
    // failure path renews the challenge before this message renders. The old
    // wording asked the visitor to "retry the checkbox above" — there is no
    // checkbox to retry, the widget solves itself, and it was sitting there
    // reading "Success!" while this told them verification had failed.
    FORBIDDEN: "Verification didn't go through — we've reset it, try again.",
    RATE_LIMITED: "You've hit the free-check limit for now — try again later.",
    // "Check the URL" was wrong advice: the client already validated the URL's
    // format before submitting, so a failure here is almost never the address —
    // it's a site that blocks automated checkers (bot protection) or that timed
    // out. Say that instead of implying the visitor typed it wrong.
    UPSTREAM_UNAVAILABLE:
      "We couldn't fetch that page. The site may block automated checkers or didn't respond in time — usually not your URL. Try another page.",
    TARGET_BEHIND_AUTH:
      "That site is behind a login, so we can't check its pages.",
  },
  errorDefault: "Something went wrong — please try again.",
  // Names both causes because this branch cannot tell them apart: the request
  // never reached our code, so there is no error code to read. A heavy page
  // fails this way on every attempt, but so does a brief edge outage that a
  // retry would clear — promising either outcome alone would be a guess, and
  // guessing "just try again" at a page that can never finish is the exact
  // dead end this message exists to avoid.
  errorUnfinished:
    "We couldn't finish checking that page. It may be too large for the free check, or the service may be briefly unavailable — try a lighter page, or try this one again shortly.",
  intro:
    "Paste a URL and get an instant, plain-language read on its on-page SEO — " +
    "then a fix for each issue that points at Google's own guidance, not a guess.",
  whatWeCheckEyebrow: "Coverage",
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
  howItWorksEyebrow: "Process",
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
        "Ask for the deep check and we crawl several of your internal pages, " +
        "list the concrete issues on each, score AI-search readiness, and " +
        "measure Core Web Vitals on the exact URL you checked — then email you " +
        "a shareable report when it is done. Also free — the email just lets " +
        "us reach you when the crawl finishes.",
    },
  ],
  faqEyebrow: "FAQ",
  faqHeading: "Frequently asked questions",
  faqs: [
    {
      question: "Is the SEO check really free?",
      answer:
        "Yes. The instant on-page check is free with no signup. The deeper check — " +
        "a multi-page crawl that lists concrete issues, plus an AI-search readiness " +
        "score — is free too; it only asks for an email so we can send the report " +
        "once the crawl finishes.",
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
        "headings, indexability — and shows your homepage's Lighthouse scores and " +
        "lab Core Web Vitals alongside, then explains how to fix what it finds " +
        "with a link to Google's own documentation for each issue.",
    },
    {
      question: "What does the deep check add?",
      answer:
        "A crawl of several of your internal pages with the concrete issues on " +
        "each, an AI-search readiness score, and Core Web Vitals for the exact " +
        "URL you checked — real Chrome user data where Google has it, not just " +
        "the homepage lab run. It runs in the background and arrives in your " +
        "inbox as a shareable report.",
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
  heroEyebrow: "On-page · Kỹ thuật · Core Web Vitals",
  heroHeading: "Kiểm tra SEO miễn phí",
  heroSubtitleBefore:
    "Kiểm tra SEO on-page tức thì — mỗi lỗi đều kèm cách sửa, ",
  heroSubtitleAccent: "dẫn nguồn tài liệu chính thức của Google",
  heroSubtitleAfter: ", không phỏng đoán. Không cần đăng ký.",
  languageSwitchLabel: "English",
  languageSwitchAria: "View this page in English",
  trustSignals: [
    "chấm điểm 12 tín hiệu",
    "miễn phí — không cần đăng ký",
    "mỗi cách sửa đều kèm tài liệu Google",
    "bản chuyên sâu quét thêm nhiều trang",
  ],
  samplePreview: {
    label: "Báo cáo mẫu",
    heading: "Báo cáo của bạn sẽ có gì",
    scoreCaption: "Chấm 12 tín hiệu — hiển thị 4",
    // Aligned with the real report UI's verdict words (check-result-copy).
    statusLabels: { pass: "đạt", warn: "cảnh báo", fail: "lỗi" },
    rows: [
      {
        id: "meta-title",
        label: "Thẻ tiêu đề",
        detail: "54 ký tự",
        status: "pass",
      },
      {
        id: "meta-description",
        label: "Thẻ mô tả",
        detail: "38 ký tự — quá ngắn",
        status: "warn",
      },
      {
        id: "structure-h1",
        label: "Thẻ H1",
        detail: "3 thẻ — chỉ nên có 1",
        status: "fail",
      },
      {
        id: "server-indexable",
        label: "Khả năng lập chỉ mục",
        detail: "200 · index, follow",
        status: "pass",
      },
    ],
    footnote:
      "Số liệu chỉ để minh họa — hãy chạy kiểm tra để xem chỉ số thật của trang bạn.",
  },
  urlLabel: "Địa chỉ website",
  urlPlaceholder: "example.com",
  urlInvalid: "Nhập tên miền hợp lệ, ví dụ example.com.",
  challengeLabel: "Xác minh",
  submitIdle: "Kiểm tra trang của tôi",
  submitLoading: "Đang kiểm tra…",
  submitVerifying: "Đang bắt đầu kiểm tra…",
  reportHeading: "Báo cáo SEO của bạn",
  scanHeading: "Đang quét trang của bạn",
  skipToContent: "Bỏ qua tới nội dung chính",
  footerProductLine:
    "EchoSEO là nền tảng SEO mở, thiết kế cho AI agent. Công cụ kiểm tra này miễn phí — bạn có thể tự triển khai, dữ liệu của bạn được bảo mật và báo cáo tự động xoá sau 30 ngày.",
  footerHomeAria: "Trang chủ EchoSEO",
  turnstileUnconfigured:
    "Xác minh Turnstile chưa được cấu hình cho bản triển khai này.",
  turnstileLoadError: "Không tải được phần xác minh — vui lòng tải lại trang.",
  errors: {
    VALIDATION_ERROR: "Nhập một URL hợp lệ để kiểm tra.",
    CRAWL_TARGET_BLOCKED: "Không thể kiểm tra URL này.",
    FORBIDDEN:
      "Xác minh chưa thành công — chúng tôi đã đặt lại, vui lòng thử lại.",
    RATE_LIMITED:
      "Bạn đã dùng hết lượt kiểm tra miễn phí lúc này — vui lòng thử lại sau.",
    UPSTREAM_UNAVAILABLE:
      "Không tải được trang đó. Site có thể chặn công cụ kiểm tra tự động hoặc phản hồi quá chậm — thường không phải do URL của bạn. Thử một trang khác.",
    TARGET_BEHIND_AUTH:
      "Trang đó nằm sau lớp đăng nhập nên chúng tôi không kiểm tra được.",
  },
  errorDefault: "Đã có lỗi xảy ra — vui lòng thử lại.",
  errorUnfinished:
    "Chúng tôi chưa kiểm tra xong trang này. Có thể trang quá lớn so với bản kiểm tra miễn phí, hoặc dịch vụ đang tạm gián đoạn — hãy thử một trang nhẹ hơn, hoặc thử lại trang này sau ít phút.",
  intro:
    "Dán một URL và nhận ngay đánh giá SEO on-page bằng ngôn ngữ dễ hiểu — kèm " +
    "cách khắc phục cho từng lỗi, dẫn thẳng tới tài liệu chính thức của Google " +
    "chứ không phải phỏng đoán.",
  whatWeCheckEyebrow: "Phạm vi",
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
  howItWorksEyebrow: "Quy trình",
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
        "Yêu cầu bản kiểm tra chuyên sâu, chúng tôi sẽ quét vài trang nội bộ " +
        "của bạn, liệt kê lỗi cụ thể trên từng trang, chấm mức sẵn sàng cho AI " +
        "Search và đo Core Web Vitals cho đúng URL bạn kiểm tra — rồi gửi email " +
        "một báo cáo có thể chia sẻ khi hoàn tất. Cũng miễn phí — email chỉ để " +
        "chúng tôi báo bạn khi quét xong.",
    },
  ],
  faqEyebrow: "Hỏi đáp",
  faqHeading: "Câu hỏi thường gặp",
  faqs: [
    {
      question: "Kiểm tra SEO này có thực sự miễn phí không?",
      answer:
        "Có. Bản kiểm tra on-page tức thì miễn phí và không cần đăng ký. Bản chuyên " +
        "sâu — quét nhiều trang kèm lỗi cụ thể, cùng điểm sẵn sàng cho AI Search — " +
        "cũng miễn phí; chỉ cần email để chúng tôi gửi báo cáo khi quét xong.",
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
        "heading, khả năng lập chỉ mục — và hiển thị kèm điểm Lighthouse cùng chỉ số " +
        "Core Web Vitals đo lab của trang chủ, rồi giải thích cách sửa từng lỗi kèm " +
        "liên kết tới tài liệu chính thức của Google.",
    },
    {
      question: "Bản kiểm tra chuyên sâu có thêm gì?",
      answer:
        "Lượt quét vài trang nội bộ kèm lỗi cụ thể trên từng trang, điểm sẵn sàng " +
        "cho AI Search, và Core Web Vitals cho đúng URL bạn kiểm tra — dữ liệu " +
        "người dùng Chrome thực khi Google có, không chỉ bản đo lab trên trang chủ. " +
        "Nó chạy nền và gửi tới hộp thư của bạn dưới dạng báo cáo có thể chia sẻ.",
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
