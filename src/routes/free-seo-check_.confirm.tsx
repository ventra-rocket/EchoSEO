import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FREE_SEO_CHECK_CONFIRM_PATH } from "@/shared/free-seo-check";

// Trailing underscore on the file (free-seo-check_.confirm) keeps the URL
// /free-seo-check/confirm but opts OUT of nesting under the Lite checker route,
// which renders no <Outlet/> — otherwise this page would never appear.
export const Route = createFileRoute("/free-seo-check_/confirm")({
  // The confirmation email links here with ?token=...
  validateSearch: (search: Record<string, unknown>): { token: string } => ({
    token: typeof search.token === "string" ? search.token : "",
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

function ConfirmDeepCheckPage() {
  const { token } = Route.useSearch();
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
      <h1 className="text-2xl font-semibold">Confirm your deep SEO check</h1>

      {status === "confirmed" ? (
        // Hand over the link immediately: the browser is the primary delivery
        // channel. Never tell the visitor to go wait for an email — email is a
        // convenience, and a send can silently fail.
        <div className="space-y-4">
          <p className="text-base-content/80">
            Thanks — your opt-in is confirmed and your deep check is running.
          </p>
          {reportId ? (
            <>
              <Link
                to="/r/$id"
                params={{ id: reportId }}
                className="btn btn-primary"
              >
                Open my report
              </Link>
              <p className="text-xs text-base-content/50">
                Bookmark this link — it&apos;s the only way back to your report.
              </p>
            </>
          ) : (
            <p className="text-sm text-base-content/60">
              We&apos;ll email you a link to the full report when it&apos;s
              ready.
            </p>
          )}
        </div>
      ) : status === "error" ? (
        <p className="text-error">
          This confirmation link is invalid or has expired. Please run the free
          check again to request a new one.
        </p>
      ) : (
        <>
          <p className="text-base-content/80">
            Click below to confirm and start your free deep SEO check.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={confirm}
            disabled={status === "loading" || token.length === 0}
          >
            {status === "loading" ? "Confirming…" : "Confirm my deep check"}
          </button>
        </>
      )}
    </main>
  );
}
