/**
 * Vietnamese locale for the check-result UI. Split from
 * `check-result-copy.ts` purely for the file-size lint cap — the shape,
 * conventions, and the "chrome only, signal text is server-localized" rule
 * in that file's header apply here verbatim.
 */
import type { CheckResultCopy } from "./check-result-copy-types";

export const CHECK_RESULT_COPY_VI: CheckResultCopy = {
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
  pageRead: {
    heading: "Những gì chúng tôi đọc được trên trang của bạn",
    title: "Tiêu đề",
    metaDescription: "Thẻ meta description",
    h1: "Thẻ H1",
    words: "Số từ",
    missing: "không tìm thấy",
  },
  measurement: {
    chars: (count) => `${count} ký tự`,
    count: (value) => `${value}`,
    ratio: (value, of) => `${value}/${of}`,
  },
  headingOutline: {
    headingCount: (count) => `${count} thẻ heading`,
    firstSkip: (from, to) => `nhảy bậc đầu tiên: H${from} → H${to}`,
    viewFullOutline: "Xem toàn bộ dàn ý heading",
  },
  triage: {
    failing: (n) => `${n} lỗi`,
    warnings: (n) => `${n} cảnh báo`,
    passed: (n) => `${n} đạt`,
    passedToggle: (n) => `${n} mục kiểm tra đã đạt`,
    allClear: "Mọi mục kiểm tra đều đạt — không có gì cần sửa.",
    checksHeading: "Những mục cần xử lý",
  },
  categoryLabels: {
    meta: "Meta",
    structure: "Cấu trúc trang",
    server: "Máy chủ",
    "core-web-vitals": "Core Web Vitals",
    geo: "AI Search",
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
    categoriesGroupLabel: "Điểm theo nhóm",
  },
  reportBand: {
    scanned: (date) => `Quét ngày ${date}`,
    pagesCrawled: (count) => `${count} trang đã quét`,
  },
  screenshot: {
    label: "Trang chúng tôi đã tải",
    alt: (host) =>
      `Ảnh chụp màn hình ${host} khi trình kiểm tra của chúng tôi tải trang`,
    unavailable: "Không có ảnh xem trước",
    loadingHint: "Đang dựng ảnh chụp trực tiếp — có thể mất tới 30 giây.",
    retry: "Thử lại",
  },
  geoSection: {
    heading: "Mức sẵn sàng cho AI Search",
    disclaimer:
      "Mang tính định hướng — tính năng AI của Google chạy trên cùng hệ thống xếp hạng như Tìm kiếm, nên các mục này củng cố nền tảng SEO. Chúng không đảm bảo trang sẽ xuất hiện trong câu trả lời AI.",
    scoreLabel: "Sẵn sàng cho AI",
    policyHeading: "Chính sách với trình thu thập AI",
    botAllowed: "cho phép",
    botBlocked: "chặn",
    googleExtendedLabel: "Google-Extended (Gemini, Vertex)",
    gptbotLabel: "GPTBot (OpenAI)",
    llmsTxtLabel: "llms.txt",
    llmsTxtFound: "có",
    llmsTxtMissing: "không có",
    llmsTxtNote: "thử nghiệm — không phải chuẩn của Google, tùy chọn",
  },
  deepPitch: {
    unlockTitle: "Mở khoá báo cáo chuyên sâu",
    // Re-anchored cùng lúc với panel lab miễn phí — xem ghi chú ở bản EN.
    unlockBody: () =>
      "Quét thêm các trang khác của bạn và liệt kê lỗi cụ thể trên từng " +
      "trang, chấm mức sẵn sàng cho AI Search, và đo Core Web Vitals cho " +
      "đúng URL bạn kiểm tra — kèm dữ liệu người dùng Chrome thực khi Google " +
      "có — miễn phí.",
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
      FORBIDDEN:
        "Xác minh chưa thành công — chúng tôi đã đặt lại, vui lòng thử lại.",
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
    challengeLoadError: "Không tải được phần xác minh.",
    challengeRetry: "Thử lại",
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
    ctaPrimary: "Xem EchoSEO có thể làm gì",
    ctaLink: "Kiểm tra trang khác",
    headerCta: "Kiểm tra website của bạn",
    footerLine:
      "EchoSEO là nền tảng SEO mở, thiết kế cho AI agent. Công cụ kiểm tra " +
      "này miễn phí — bạn có thể tự triển khai, dữ liệu của bạn được bảo " +
      "mật và báo cáo tự động xoá sau 30 ngày.",
  },
  /* ——— share URL (/c/{id}) block — appended; keep at the end. ——— */
  share: {
    linkLabel: "Chia sẻ kết quả này",
    copyButton: "Sao chép liên kết",
    copied: "Đã sao chép liên kết",
    copyFailed: "Không sao chép được — hãy tự sao chép URL trên thanh địa chỉ.",
  },
  strategyTabs: {
    ariaLabel: "Loại thiết bị",
    mobileTab: "Di động",
    desktopTab: "Máy tính",
    desktopComparativeNote:
      "Chỉ để so sánh — điểm số dùng dữ liệu di động, đúng theo cách Google " +
      "lập chỉ mục ưu tiên thiết bị di động.",
    desktopNotCaptured:
      "Báo cáo này chưa đo số liệu trên máy tính — các lần kiểm tra mới hơn " +
      "sẽ có số liệu này.",
    noStrategyData: "Chưa có số liệu lab cho loại thiết bị này.",
  },
  /* ——— visual filmstrip block — appended; keep at the end. ——— */
  filmstrip: {
    ariaLabel: "Tiến trình tải trang",
    frameAlt: (timing) => `Khung hình tải trang tại ${timing}`,
    // Vietnamese decimal separator is a comma; the unit stays the SI "s".
    timing: (ms) => `${(ms / 1000).toFixed(1).replace(".", ",")} s`,
  },
  /* ——— free lab panel block — appended; keep at the end. ——— */
  labPanel: {
    ariaLabel: "Điểm Lighthouse và Core Web Vitals đo lab",
    // "lab" giữ nguyên — thuật ngữ Lighthouse/PSI quen thuộc, khớp bản EN.
    caption: "trang chủ · lab",
    tbtNote:
      "TBT thay cho INP — bản đo lab không ghi nhận được tương tác của " +
      "người dùng thực.",
    sourceLine:
      "Kết quả đo lab Lighthouse trên trang chủ — không phải dữ liệu thực " +
      "tế từ người dùng.",
    capturedAt: (date) => `Đo ngày ${date}`,
  },
  /* ——— provenance block — appended; keep at the end. ——— */
  provenance: {
    ownCrawler: "Crawler EchoSEO · tải trực tiếp trang này",
    // "mobile throttle" giữ nguyên — thuật ngữ PSI, khớp bản EN.
    psiMobile: "PageSpeed Insights API · máy chủ Google · mobile throttle",
    psiDesktop: "PageSpeed Insights API · máy chủ Google · desktop throttle",
    measuredAt: (date) => `đo ngày ${date}`,
    localRunDiffers:
      "Số này có thể khác Lighthouse chạy trên máy bạn. Tiện ích trình duyệt, " +
      "cache và dữ liệu đã lưu (IndexedDB) làm sai lệch kết quả chạy local — " +
      "chính Lighthouse cũng cảnh báo khi phát hiện. Bản đo này chạy trên máy " +
      "chủ Google với cấu hình throttle chuẩn. Hai lần chạy sạch vẫn lệch được " +
      "vài điểm.",
  },
};
