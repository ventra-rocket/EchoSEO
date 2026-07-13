import { useEffect, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Terminal-style loading state (Concept B). The lines mirror the real steps the
 * server performs (fetch → parse → evaluate), revealed one at a time with a
 * blinking caret. Reduced-motion users see all lines at once.
 */
export function ScanLog({ url }: { url: string }) {
  const reduced = useReducedMotion();
  const lines = [
    `GET ${url.trim() || "…"}`,
    "fetching page",
    "parsing HTML",
    "evaluating on-page + technical signals",
  ];
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
      aria-label="Scanning your page"
    >
      {lines.slice(0, visible).map((line, index) => (
        <div key={index} className="flex gap-2">
          <span className="fsc-console-gutter select-none" aria-hidden="true">
            ›
          </span>
          <span>
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
