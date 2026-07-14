import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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

function ConfirmDeepCheckPage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<Status>("idle");

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
      setStatus(response.ok ? "confirmed" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Confirm your deep SEO check</h1>

      {status === "confirmed" ? (
        <p className="text-base-content/80">
          Thanks — your opt-in is confirmed. We&apos;ll email your full deep SEO
          report shortly.
        </p>
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
