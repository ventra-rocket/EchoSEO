/**
 * Core Web Vitals rule catalog — schema and fix text only for now.
 *
 * Lite (Phase 1) doesn't crawl CWV data (no Lighthouse run), so these
 * rules are not wired into `evaluate()` for the Lite report. Phase 3
 * (Deep tier, via the Google PageSpeed Insights API) will call
 * `evaluate(CORE_WEB_VITALS_RULES, signals)` once real metrics exist.
 * `appliesWhen` uses Google's own published thresholds so the logic is
 * ready to use as soon as Phase 3 supplies `CoreWebVitalsSignals`.
 */
import type { Rule } from "../types";

export interface CoreWebVitalsSignals {
  lcpMs: number;
  inpMs: number;
  cls: number;
  ttfbMs: number;
}

export const CORE_WEB_VITALS_RULES: Array<Rule<CoreWebVitalsSignals>> = [
  {
    id: "cwv-lcp",
    category: "core-web-vitals",
    severity: "critical",
    label: "Largest Contentful Paint (LCP) at or under 2.5s",
    appliesWhen: (signals) => {
      if (signals.lcpMs <= 2500) return "pass";
      if (signals.lcpMs <= 4000) return "warn";
      return "fail";
    },
    problem:
      "The page's largest visible element (image, text block, or video) takes too long to render, making the page feel slow to load.",
    fixSteps: [
      "Optimize and preload the largest above-the-fold image or text block.",
      "Reduce render-blocking CSS/JS and server response time (TTFB) upstream of it.",
      "Use a CDN and modern image formats to cut load time.",
    ],
    googleSourceUrl: "https://web.dev/articles/lcp",
    guideQuote:
      "LCP reports the render time of the largest image, text block, or video visible in the viewport, relative to when the user first navigated to the page.",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Largest Contentful Paint (LCP) không quá 2.5s",
        problem:
          "Phần tử hiển thị lớn nhất của trang (hình ảnh, khối văn bản hoặc video) mất quá lâu để hiển thị, khiến trang có cảm giác tải chậm.",
        fixSteps: [
          "Tối ưu và tải trước (preload) hình ảnh hoặc khối văn bản lớn nhất trong màn hình đầu tiên.",
          "Giảm CSS/JS chặn hiển thị và rút ngắn thời gian phản hồi máy chủ (TTFB) ở khâu phía trước.",
          "Dùng CDN và các định dạng ảnh hiện đại để rút ngắn thời gian tải.",
        ],
      },
    },
  },
  {
    id: "cwv-inp",
    category: "core-web-vitals",
    severity: "critical",
    label: "Interaction to Next Paint (INP) at or under 200ms",
    appliesWhen: (signals) => {
      if (signals.inpMs <= 200) return "pass";
      if (signals.inpMs <= 500) return "warn";
      return "fail";
    },
    problem:
      "The page responds slowly to user interactions (clicks, taps, key presses), which reads as laggy or unresponsive.",
    fixSteps: [
      "Break up long JavaScript tasks so the main thread can respond to input sooner.",
      "Defer or remove non-essential scripts that run on interaction.",
      "Avoid layout thrashing in event handlers.",
    ],
    googleSourceUrl: "https://web.dev/articles/inp",
    guideQuote:
      "A low INP means the page was consistently able to respond quickly to all—or the vast majority—of user interactions.",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Interaction to Next Paint (INP) không quá 200ms",
        problem:
          "Trang phản hồi chậm với thao tác của người dùng (nhấp chuột, chạm, gõ phím), tạo cảm giác giật lag hoặc trang bị đơ.",
        fixSteps: [
          "Chia nhỏ các tác vụ JavaScript dài để luồng chính có thể phản hồi thao tác nhập sớm hơn.",
          "Trì hoãn hoặc loại bỏ các script không thiết yếu chạy khi người dùng tương tác.",
          "Tránh đọc-ghi layout liên tục (layout thrashing) trong các trình xử lý sự kiện.",
        ],
      },
    },
  },
  {
    id: "cwv-cls",
    category: "core-web-vitals",
    severity: "high",
    label: "Cumulative Layout Shift (CLS) at or under 0.1",
    appliesWhen: (signals) => {
      if (signals.cls <= 0.1) return "pass";
      if (signals.cls <= 0.25) return "warn";
      return "fail";
    },
    problem:
      "Page elements shift position unexpectedly as content loads, which can cause misclicks and a jarring reading experience.",
    fixSteps: [
      "Set explicit width/height (or aspect-ratio) on images, embeds, and ads so space is reserved before they load.",
      "Avoid inserting content above existing content unless triggered by user interaction.",
      "Preload fonts to avoid layout-shifting font swaps.",
    ],
    googleSourceUrl: "https://web.dev/articles/cls",
    guideQuote:
      "CLS is a measure of the largest burst of layout shift scores for every unexpected layout shift that occurs during the entire lifecycle of a page.",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Cumulative Layout Shift (CLS) không quá 0.1",
        problem:
          "Các phần tử trên trang bị xê dịch bất ngờ trong lúc nội dung tải, dễ gây bấm nhầm và trải nghiệm đọc khó chịu.",
        fixSteps: [
          "Khai báo rõ width/height (hoặc aspect-ratio) cho hình ảnh, nội dung nhúng và quảng cáo để chỗ trống được giữ sẵn trước khi chúng tải xong.",
          "Tránh chèn nội dung phía trên nội dung sẵn có, trừ khi do chính người dùng thao tác.",
          "Tải trước (preload) font chữ để tránh hiện tượng đổi font làm xô lệch bố cục.",
        ],
      },
    },
  },
  {
    id: "cwv-ttfb",
    category: "core-web-vitals",
    severity: "low",
    label: "Time to First Byte (TTFB) at or under 0.8s",
    appliesWhen: (signals) => {
      if (signals.ttfbMs <= 800) return "pass";
      if (signals.ttfbMs <= 1800) return "warn";
      return "fail";
    },
    // TTFB is a diagnostic/supporting metric, not one of Google's three
    // official Core Web Vitals (LCP, INP, CLS) — see guideQuote. It's
    // still reported alongside them because slow TTFB is a common root
    // cause of a poor LCP.
    problem:
      "The server takes too long to send the first byte of the response, which delays everything else the page needs to render.",
    fixSteps: [
      "Reduce server processing time (query/render time) for the initial HTML response.",
      "Use caching, a CDN, or edge rendering closer to the visitor.",
      "Avoid unnecessary redirect chains before the final response.",
    ],
    googleSourceUrl: "https://web.dev/articles/ttfb",
    guideQuote:
      "Because TTFB isn't a Core Web Vitals metric, it's not absolutely necessary that sites meet the 'good' TTFB threshold, provided that it doesn't impede their ability to score well on the metrics that matter.",
    lastReviewedDate: "2026-07-13",
    locales: {
      vi: {
        label: "Time to First Byte (TTFB) không quá 0.8s",
        problem:
          "Máy chủ mất quá lâu để gửi byte phản hồi đầu tiên, kéo theo mọi thứ trang cần để hiển thị đều bị chậm lại.",
        fixSteps: [
          "Giảm thời gian xử lý phía máy chủ (thời gian truy vấn/dựng trang) cho phản hồi HTML ban đầu.",
          "Dùng bộ nhớ đệm (cache), CDN, hoặc kết xuất tại edge gần người truy cập hơn.",
          "Tránh các chuỗi chuyển hướng không cần thiết trước phản hồi cuối cùng.",
        ],
      },
    },
  },
];
