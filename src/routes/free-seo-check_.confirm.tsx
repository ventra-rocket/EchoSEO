import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FREE_SEO_CHECK_CONFIRM_PATH } from "@/shared/free-seo-check";
import type { Locale } from "@/client/i18n/config";

// Trailing underscore on the file (free-seo-check_.confirm) keeps the URL
// /free-seo-check/confirm but opts OUT of nesting under the Lite checker route,
// which renders no <Outlet/> — otherwise this page would never appear.
export const Route = createFileRoute("/free-seo-check_/confirm")({
  // The confirmation email links here with ?token=... (&lang=vi for VN leads).
  validateSearch: (
    search: Record<string, unknown>,
  ): { token: string; lang: Locale } => ({
    token: typeof search.token === "string" ? search.token : "",
    // Locale rides on the emailed link so this page — reached only from it —
    // renders in the requester's language; anything else is English.
    lang: search.lang === "vi" ? "vi" : "en",
  }),
  head: () => ({
    meta: [
      { title: "Confirm your deep check — EchoSEO" },
      // Individual reports are private; keep this out of the index.
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmDeepCheckPage,
});

type Status = "idle" | "loading" | "confirmed" | "error";

interface ConfirmResponse {
  status: string;
  reportId: string | null;
}

interface ConfirmCopy {
  heading: string;
  confirmedThanks: string;
  openReport: string;
  bookmark: string;
  emailFallback: string;
  errorText: string;
  idlePrompt: string;
  confirmButton: string;
  confirmingButton: string;
}

/**
 * Per-locale copy. English is byte-identical to the strings this page shipped
 * before — a straight apostrophe renders the same as the previous `&apos;`.
 */
const CONFIRM_COPY: Record<Locale, ConfirmCopy> = {
  en: {
    heading: "Confirm your deep SEO check",
    confirmedThanks:
      "Thanks — your opt-in is confirmed and your deep check is running.",
    openReport: "Open my report",
    bookmark: "Bookmark this link — it's the only way back to your report.",
    emailFallback: "We'll email you a link to the full report when it's ready.",
    errorText:
      "This confirmation link is invalid or has expired. Please run the free check again to request a new one.",
    idlePrompt: "Click below to confirm and start your free deep SEO check.",
    confirmButton: "Confirm my deep check",
    confirmingButton: "Confirming…",
  },
  vi: {
    heading: "Xác nhận kiểm tra SEO chuyên sâu",
    confirmedThanks:
      "Cảm ơn — bạn đã xác nhận và bản kiểm tra chuyên sâu đang chạy.",
    openReport: "Mở báo cáo của tôi",
    bookmark:
      "Lưu lại liên kết này — đây là cách duy nhất để quay lại báo cáo của bạn.",
    emailFallback:
      "Chúng tôi sẽ gửi email liên kết tới báo cáo đầy đủ khi hoàn tất.",
    errorText:
      "Liên kết xác nhận không hợp lệ hoặc đã hết hạn. Vui lòng chạy lại bản kiểm tra để lấy liên kết mới.",
    idlePrompt:
      "Nhấn nút bên dưới để xác nhận và bắt đầu kiểm tra SEO chuyên sâu miễn phí.",
    confirmButton: "Xác nhận kiểm tra chuyên sâu",
    confirmingButton: "Đang xác nhận…",
  },
};

function ConfirmDeepCheckPage() {
  const { token, lang } = Route.useSearch();
  const copy = CONFIRM_COPY[lang];
  const [status, setStatus] = useState<Status>("idle");
  const [reportId, setReportId] = useState<string | null>(null);

  // Confirm on an explicit click (POST), never on the GET load — so email
  // security scanners that prefetch the link can't auto-confirm the opt-in.
  async function confirm() {
    if (!token) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch(FREE_SEO_CHECK_CONFIRM_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        setStatus("error");
        return;
      }
      const body: ConfirmResponse = await response.json();
      setReportId(body.reportId);
      setStatus("confirmed");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{copy.heading}</h1>

      {status === "confirmed" ? (
        // Hand over the link immediately: the browser is the primary delivery
        // channel. Never tell the visitor to go wait for an email — email is a
        // convenience, and a send can silently fail.
        <div className="space-y-4">
          <p className="text-base-content/80">{copy.confirmedThanks}</p>
          {reportId ? (
            <>
              <Link
                to="/r/$id"
                params={{ id: reportId }}
                className="btn btn-primary"
              >
                {copy.openReport}
              </Link>
              <p className="text-xs text-base-content/50">{copy.bookmark}</p>
            </>
          ) : (
            <p className="text-sm text-base-content/60">{copy.emailFallback}</p>
          )}
        </div>
      ) : status === "error" ? (
        <p className="text-error">{copy.errorText}</p>
      ) : (
        <>
          <p className="text-base-content/80">{copy.idlePrompt}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={confirm}
            disabled={status === "loading" || token.length === 0}
          >
            {status === "loading" ? copy.confirmingButton : copy.confirmButton}
          </button>
        </>
      )}
    </main>
  );
}
