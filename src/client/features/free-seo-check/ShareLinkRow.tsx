import { useEffect, useState } from "react";
import { checkPagePath } from "@/shared/free-seo-check";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";

/**
 * The share URL for the check just run: the (already rewritten) address, with
 * a copy control beside it. Renders only after a successful check, so
 * `window` is always available. Clipboard access can be denied or absent —
 * the failed state points at the address bar, which now holds the same URL.
 */
export function ShareLinkRow({
  checkId,
  locale,
}: {
  checkId: string;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].share;
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  // The confirmation is transient; the control returns to a copyable state.
  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = setTimeout(() => setCopyState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [copyState]);

  const shareUrl = new URL(
    checkPagePath(checkId),
    window.location.origin,
  ).toString();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-box border border-base-300 bg-base-100 px-3 py-2">
      <span className="font-mono text-xs uppercase tracking-widest text-base-content/60">
        {copy.linkLabel}
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-base-content/80">
        {shareUrl}
      </code>
      <button
        type="button"
        className="btn btn-ghost btn-xs font-mono"
        onClick={() => void copyLink()}
      >
        {copyState === "copied" ? copy.copied : copy.copyButton}
      </button>
      {/* The visible confirmation is a button-label swap, which assistive
          tech does not announce — this mirror does. */}
      <span role="status" className="sr-only">
        {copyState === "copied" ? copy.copied : ""}
      </span>
      {copyState === "failed" ? (
        <p role="alert" className="w-full text-xs text-error">
          {copy.copyFailed}
        </p>
      ) : null}
    </div>
  );
}
