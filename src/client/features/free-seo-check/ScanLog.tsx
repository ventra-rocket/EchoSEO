import { useEffect, useState } from "react";
import type { Locale } from "@/client/i18n/config";
import { useReducedMotion } from "./use-reduced-motion";

/** The terminal step lines + the status aria-label, per locale. The `GET {url}`
 * line and "HTML" are code tokens and stay verbatim in both. */
const SCAN_LOG_COPY: Record<
  Locale,
  { steps: readonly string[]; aria: string }
> = {
  en: {
    steps: [
      "fetching page",
      "parsing HTML",
      "evaluating on-page + technical signals",
    ],
    aria: "Scanning your page",
  },
  vi: {
    steps: [
      "đang tải trang",
      "đang phân tích HTML",
      "đang đánh giá tín hiệu on-page + kỹ thuật",
    ],
    aria: "Đang quét trang của bạn",
  },
};

/**
 * Terminal-style loading state (Concept B). The lines mirror the real steps the
 * server performs (fetch → parse → evaluate), revealed one at a time with a
 * blinking caret. Reduced-motion users see all lines at once.
 */
export function ScanLog({ url, locale }: { url: string; locale: Locale }) {
  const reduced = useReducedMotion();
  const copy = SCAN_LOG_COPY[locale];
  const lines = [`GET ${url.trim() || "…"}`, ...copy.steps];
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    if (reduced) {
      setVisible(lines.length);
      return;
    }
    if (visible >= lines.length) return;
    const timer = setTimeout(() => setVisible((count) => count + 1), 420);
    return () => clearTimeout(timer);
  }, [visible, reduced, lines.length]);

  return (
    <div
      className="fsc-console rounded-box p-4 font-mono text-xs leading-relaxed"
      role="status"
      aria-live="polite"
      aria-label={copy.aria}
    >
      {lines.slice(0, visible).map((line, index) => (
        <div key={index} className="flex gap-2">
          <span className="fsc-console-gutter select-none" aria-hidden="true">
            ›
          </span>
          {/* `min-w-0` lets the flex child shrink below its content width and
              `break-all` wraps inside the URL, which has no spaces to break on.
              Without both, a long address widens the console past the viewport
              and the page scrolls sideways. */}
          <span className="min-w-0 break-all">
            {line}
            {index === visible - 1 ? (
              <span className="fsc-caret ml-1" aria-hidden="true">
                ▋
              </span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
