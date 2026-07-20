/**
 * Per-locale copy for the check-result UI: the Lite report rendered on the
 * landing pages and the shareable Deep report page (`/r/{id}`).
 *
 * Same shape as `landing-copy.ts` — a plain locale-keyed object, not a
 * react-intl catalog — because these components render on public SSR routes
 * that have no IntlProvider. Strings with interpolation are functions so each
 * locale controls its own word order (and Vietnamese needs no plural forms).
 *
 * Only presentational CHROME lives here. Signal text (label/problem/fixSteps)
 * is localized server-side, and `signal.guideQuote` is always the verbatim
 * English Google quote.
 *
 * The EN strings must stay byte-identical to what the components rendered
 * before localization — existing English tests and e2e assertions depend on
 * them. Do not reword EN here without updating those.
 */
import type { Locale } from "@/client/i18n/config";
import type { RuleCategory } from "@/server/lib/seo-rules/types";
import type { SignalStatus } from "@/server/services/seo-check/types";

interface CheckResultCopy {
  /** ScoreGauge — the ring under the overall score. */
  gauge: {
    outOf100: string;
    gradeAria: (grade: string) => string;
  };
  /** Headline under the gauge, by score band (plus the zero-issue case). */
  headline: {
    none: string;
    good: (issueCount: number) => string;
    fair: (issueCount: number) => string;
    needsWork: (issueCount: number) => string;
  };
  /** Card label per rule category. "Meta"/"Core Web Vitals" stay untranslated. */
  categoryLabels: Record<RuleCategory, string>;
  /** SignalRow chrome around the server-localized signal text. */
  signal: {
    statusBadge: Record<SignalStatus, string>;
    howToFix: string;
    /** Trailing space included — the guidance link follows immediately. */
    guidancePrefix: string;
    guidanceLinkText: string;
    /** Trailing space included — the quoted (English) Google excerpt follows. */
    guidanceReviewed: (date: string) => string;
  };
  /** Source line next to the "Core Web Vitals" heading (heading stays as-is). */
  coreWebVitals: {
    sourceField: string;
    sourceLab: string;
  };
  /** Deep-report-only chrome (PSI cards, checks section, crawled pages). */
  deepReport: {
    psiLabels: Record<
      "performance" | "seo" | "accessibility" | "bestPractices",
      string
    >;
    checksHeading: string;
    primaryPageSuffix: string;
    otherPagesHeading: (count: number) => string;
    noIssues: string;
    issuesToFix: (count: number) => string;
  };
  /** The desktop page capture, shown on both the Lite result and Deep report. */
  screenshot: {
    label: string;
    alt: (host: string) => string;
    /** Shown in the frame when a capture could not be produced. */
    unavailable: string;
  };
  /** DeepTierPitch + the paused notice that stands in for the request form. */
  deepPitch: {
    unlockTitle: string;
    unlockBody: (metricCount: number) => string;
    pausedNotice: string;
  };
  /** DeepRequestForm — the email-gated Deep entry point. */
  deepForm: {
    /** API error code → message; falls back to `errorDefault`. */
    errors: Record<string, string>;
    errorDefault: string;
    sentTitle: string;
    /** Rendered as `{before} <email>{after}` around the mono email span. */
    sentBodyBefore: string;
    sentBodyAfter: string;
    sentSpamHint: string;
    emailLabel: string;
    emailPlaceholder: string;
    consentLabel: string;
    unconfigured: string;
    submitIdle: string;
    submitLoading: string;
  };
  /** The `/r/{id}` page shell around the Deep report. */
  reportPage: {
    /** API error code → message; falls back to `errorDefault`. */
    errors: Record<string, string>;
    errorDefault: string;
    loading: string;
    stalledBody: string;
    stalledRefresh: string;
    pendingTitle: string;
    pendingHint: string;
    /** Fallback title for an unrecognized failure. */
    failedTitle: string;
    /** Specific server failure strings (kill-switch, quota) → localized text;
     * an unrecognized message falls back to `failedTitle`. EN maps each to
     * itself so the page reads exactly as before. */
    failedMessages: Record<string, string>;
    failedHint: string;
    dedupedNotice: string;
    ctaHeading: string;
    ctaBody: string;
    ctaLink: string;
  };
}

const EN: CheckResultCopy = {
  gauge: {
    outOf100: "out of 100",
    gradeAria: (grade) => `Grade ${grade}`,
  },
  headline: {
    none: "No issues found — nicely done.",
    good: (n) => `Good — ${n} ${n === 1 ? "issue" : "issues"} to fix.`,
    fair: (n) => `Fair — ${n} ${n === 1 ? "issue" : "issues"} to fix.`,
    needsWork: (n) =>
      `Needs work — ${n} ${n === 1 ? "issue" : "issues"} to fix.`,
  },
  categoryLabels: {
    meta: "Meta",
    structure: "Page Structure",
    server: "Server",
    "core-web-vitals": "Core Web Vitals",
  },
  signal: {
    statusBadge: { pass: "pass", warn: "warn", fail: "fail" },
    howToFix: "How to fix this",
    guidancePrefix: "Per ",
    guidanceLinkText: "Google's guidance",
    guidanceReviewed: (date) => `, reviewed ${date}: `,
  },
  coreWebVitals: {
    sourceField: "Real Chrome user data (CrUX)",
    sourceLab: "Lab simulation (no field data yet)",
  },
  deepReport: {
    psiLabels: {
      performance: "Performance",
      seo: "SEO",
      accessibility: "Accessibility",
      bestPractices: "Best Practices",
    },
    checksHeading: "Checks",
    primaryPageSuffix: "(primary page)",
    otherPagesHeading: (count) => `Other pages crawled (${count})`,
    noIssues: "no issues",
    issuesToFix: (count) => `${count} to fix`,
  },
  screenshot: {
    label: "What we loaded",
    alt: (host) => `Screenshot of ${host} as our checker rendered it`,
    unavailable: "Preview unavailable",
  },
  deepPitch: {
    unlockTitle: "Unlock the Deep report",
    unlockBody: (metricCount) =>
      `Adds ${metricCount} Core Web Vitals metrics from real Chrome users, ` +
      "Google Lighthouse scores, and a crawl of your other pages — free.",
    pausedNotice:
      "Deep reports are paused while we finish setting up delivery — check " +
      "back soon.",
  },
  deepForm: {
    errors: {
      VALIDATION_ERROR:
        "Use a real email address — disposable inboxes aren't accepted.",
      CRAWL_TARGET_BLOCKED: "That URL can't be checked.",
      FORBIDDEN: "Verification failed — please retry the checkbox above.",
      RATE_LIMITED:
        "You've hit the free-check limit for now — try again later.",
      UPSTREAM_UNAVAILABLE:
        "Deep checks are paused right now — please try again later.",
    },
    errorDefault: "Something went wrong — please try again.",
    sentTitle: "Check your inbox",
    sentBodyBefore: "We sent a confirmation link to",
    sentBodyAfter:
      ". Click it and your deep check starts — you'll get a link to the full " +
      "report.",
    sentSpamHint:
      "Not there in a minute? Check your spam folder — we're a new sender, " +
      "so filters are still learning to trust us.",
    emailLabel: "Email address",
    emailPlaceholder: "you@company.com",
    consentLabel:
      "Email me my deep SEO report. We'll send a confirmation link first — " +
      "no marketing without your say-so.",
    unconfigured: "Deep checks aren't configured for this deployment yet.",
    submitIdle: "Email me the deep report",
    submitLoading: "Sending…",
  },
  reportPage: {
    errors: {
      NOT_FOUND: "This report link is invalid or has expired.",
      VALIDATION_ERROR: "This report link is invalid.",
      RATE_LIMITED: "Too many requests — wait a moment and refresh.",
    },
    errorDefault: "We couldn't load this report — please refresh.",
    loading: "Loading your report…",
    stalledBody:
      "This check is taking longer than usual. It's still running — refresh " +
      "this page in a minute.",
    stalledRefresh: "Refresh",
    pendingTitle:
      "Your deep check is running — crawling your pages and pulling Core Web " +
      "Vitals from Google.",
    pendingHint: "This page updates itself. It usually takes under a minute.",
    // The generic fallback — matches the server's GENERIC_FAILURE_MESSAGE, so an
    // unrecognized `view.message` still reads as before.
    failedTitle: "The deep check could not be completed.",
    // The two specific, actionable server messages (kill-switch, quota) mapped
    // to themselves in EN — so the page keeps showing them, byte-identical.
    failedMessages: {
      "Free deep checks are paused right now. Please try again later.":
        "Free deep checks are paused right now. Please try again later.",
      "Today's free deep-check limit has been reached. Please try again tomorrow.":
        "Today's free deep-check limit has been reached. Please try again tomorrow.",
    },
    failedHint:
      "Run the free check again — if it keeps failing, the site may be " +
      "blocking automated requests.",
    dedupedNotice:
      "This site was already checked today, so here are those results — " +
      "they cover the page shown below.",
    ctaHeading: "Want these fixes done for you?",
    ctaBody:
      "EchoSEO is an open, agent-native SEO platform — self-host it free " +
      "with your own keys, or let the agent layer apply the fixes and prove " +
      "the result against your own Search Console data.",
    ctaLink: "Check another page",
  },
};

const VI: CheckResultCopy = {
  gauge: {
    outOf100: "trên 100",
    gradeAria: (grade) => `Hạng ${grade}`,
  },
  headline: {
    // Vietnamese has no plural — "lỗi" covers every count.
    none: "Không phát hiện lỗi nào — tuyệt vời.",
    good: (n) => `Tốt — còn ${n} lỗi cần sửa.`,
    fair: (n) => `Khá — còn ${n} lỗi cần sửa.`,
    needsWork: (n) => `Cần cải thiện — còn ${n} lỗi cần sửa.`,
  },
  categoryLabels: {
    meta: "Meta",
    structure: "Cấu trúc trang",
    server: "Máy chủ",
    "core-web-vitals": "Core Web Vitals",
  },
  signal: {
    statusBadge: { pass: "đạt", warn: "cảnh báo", fail: "lỗi" },
    howToFix: "Cách khắc phục",
    // Reads "Theo hướng dẫn của Google, cập nhật {date}: “…”" — the quote
    // itself stays in English (it is Google's verbatim text).
    guidancePrefix: "Theo ",
    guidanceLinkText: "hướng dẫn của Google",
    guidanceReviewed: (date) => `, cập nhật ${date}: `,
  },
  coreWebVitals: {
    sourceField: "Dữ liệu người dùng Chrome thực (CrUX)",
    sourceLab: "Mô phỏng phòng lab (chưa có dữ liệu thực)",
  },
  deepReport: {
    psiLabels: {
      performance: "Hiệu năng",
      seo: "SEO",
      accessibility: "Khả năng tiếp cận",
      bestPractices: "Thực hành tốt nhất",
    },
    checksHeading: "Các mục kiểm tra",
    primaryPageSuffix: "(trang chính)",
    otherPagesHeading: (count) => `Các trang khác đã quét (${count})`,
    noIssues: "không lỗi",
    issuesToFix: (count) => `${count} cần sửa`,
  },
  screenshot: {
    label: "Trang chúng tôi đã tải",
    alt: (host) =>
      `Ảnh chụp màn hình ${host} khi trình kiểm tra của chúng tôi tải trang`,
    unavailable: "Không có ảnh xem trước",
  },
  deepPitch: {
    unlockTitle: "Mở khoá báo cáo chuyên sâu",
    unlockBody: (metricCount) =>
      `Bổ sung ${metricCount} chỉ số Core Web Vitals từ người dùng Chrome ` +
      "thực, điểm Google Lighthouse, và lượt quét các trang khác của bạn — " +
      "miễn phí.",
    pausedNotice:
      "Báo cáo chuyên sâu đang tạm dừng trong lúc chúng tôi hoàn thiện khâu " +
      "gửi báo cáo — vui lòng quay lại sau.",
  },
  deepForm: {
    errors: {
      VALIDATION_ERROR:
        "Hãy dùng địa chỉ email thật — hộp thư dùng một lần không được chấp " +
        "nhận.",
      CRAWL_TARGET_BLOCKED: "Không thể kiểm tra URL này.",
      FORBIDDEN: "Xác minh thất bại — vui lòng thử lại ô xác minh ở trên.",
      RATE_LIMITED:
        "Bạn đã dùng hết lượt kiểm tra miễn phí lúc này — vui lòng thử lại sau.",
      UPSTREAM_UNAVAILABLE:
        "Kiểm tra chuyên sâu đang tạm dừng — vui lòng thử lại sau.",
    },
    errorDefault: "Đã có lỗi xảy ra — vui lòng thử lại.",
    sentTitle: "Kiểm tra hộp thư của bạn",
    sentBodyBefore: "Chúng tôi đã gửi liên kết xác nhận tới",
    sentBodyAfter:
      ". Nhấp vào liên kết đó để bắt đầu bản kiểm tra chuyên sâu — bạn sẽ " +
      "nhận được liên kết tới báo cáo đầy đủ.",
    sentSpamHint:
      "Chưa thấy email sau một phút? Hãy kiểm tra thư mục spam — chúng tôi " +
      "là người gửi mới nên bộ lọc thư vẫn đang học cách tin tưởng chúng tôi.",
    emailLabel: "Địa chỉ email",
    emailPlaceholder: "ban@congty.com",
    consentLabel:
      "Gửi báo cáo SEO chuyên sâu qua email cho tôi. Chúng tôi sẽ gửi liên " +
      "kết xác nhận trước — không gửi email tiếp thị nếu bạn chưa đồng ý.",
    unconfigured:
      "Kiểm tra chuyên sâu chưa được cấu hình cho bản triển khai này.",
    submitIdle: "Gửi báo cáo chuyên sâu cho tôi",
    submitLoading: "Đang gửi…",
  },
  reportPage: {
    errors: {
      NOT_FOUND: "Liên kết báo cáo không hợp lệ hoặc đã hết hạn.",
      VALIDATION_ERROR: "Liên kết báo cáo không hợp lệ.",
      RATE_LIMITED: "Quá nhiều yêu cầu — vui lòng chờ chút rồi tải lại.",
    },
    errorDefault: "Không tải được báo cáo — vui lòng tải lại trang.",
    loading: "Đang tải báo cáo…",
    stalledBody:
      "Bản kiểm tra này lâu hơn thường lệ. Quá trình vẫn đang chạy — hãy tải " +
      "lại trang sau một phút.",
    stalledRefresh: "Tải lại",
    pendingTitle:
      "Bản kiểm tra chuyên sâu đang chạy — đang quét các trang của bạn và " +
      "lấy Core Web Vitals từ Google.",
    pendingHint: "Trang này tự cập nhật. Thường mất chưa tới một phút.",
    failedTitle: "Không hoàn tất được bản kiểm tra chuyên sâu.",
    failedMessages: {
      "Free deep checks are paused right now. Please try again later.":
        "Tính năng kiểm tra chuyên sâu đang tạm dừng. Vui lòng thử lại sau.",
      "Today's free deep-check limit has been reached. Please try again tomorrow.":
        "Đã hết lượt kiểm tra chuyên sâu miễn phí hôm nay. Vui lòng thử lại vào ngày mai.",
    },
    failedHint:
      "Chạy lại bản kiểm tra miễn phí — nếu vẫn lỗi, trang web có thể đang " +
      "chặn các truy cập tự động.",
    dedupedNotice:
      "Website này đã được kiểm tra trong hôm nay, nên đây là kết quả của " +
      "lần đó — áp dụng cho trang hiển thị bên dưới.",
    ctaHeading: "Muốn được sửa giúp những lỗi này?",
    ctaBody:
      "EchoSEO là nền tảng SEO mở, agent-native — tự host miễn phí với khoá " +
      "API của riêng bạn, hoặc để lớp agent tự áp dụng các sửa đổi và chứng " +
      "minh kết quả ngay trên dữ liệu Search Console của bạn.",
    ctaLink: "Kiểm tra trang khác",
  },
};

export const CHECK_RESULT_COPY: Record<Locale, CheckResultCopy> = {
  en: EN,
  vi: VI,
};
