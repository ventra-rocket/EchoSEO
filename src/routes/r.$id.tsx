import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReportView } from "@/server/services/seo-check/report-view";
import { FREE_SEO_CHECK_REPORT_PATH } from "@/shared/free-seo-check";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "@/client/features/free-seo-check/check-result-copy";
import { DeepReportView } from "@/client/features/free-seo-check/DeepReportView";

// A report link is a bearer capability — anyone holding it can read the report.
// The response also carries `Referrer-Policy: no-referrer` + `X-Robots-Tag:
// noindex` (server.ts) and robots.txt disallows /r/; these metas are the
// in-document half of the same rule.
export const Route = createFileRoute("/r/$id")({
  head: () => ({
    meta: [
      // Deliberately English: head() runs before the report (and its locale)
      // is fetched, and this is only the tab title of a noindex page.
      { title: "Your deep SEO report — EchoSEO" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: SharedReportPage,
});

/** Matches the report's own ~8s runtime without hammering the read budget. */
const POLL_INTERVAL_MS = 5_000;
/** Stop after ~2 min and hand the visitor a manual refresh instead. */
const MAX_POLLS = 24;

type PageState =
  | { kind: "loading" }
  | { kind: "view"; view: ReportView }
  | { kind: "stalled" }
  // The raw API error code — mapped to a message at render time so it follows
  // the page's locale rather than freezing the language at fetch time.
  | { kind: "error"; code: string };

function SharedReportPage() {
  const { id } = Route.useParams();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const pollCountRef = useRef(0);

  // The report row carries the requester's language; until it arrives (or when
  // the load failed) there is no locale to honor, so English is the transient
  // default.
  const locale: Locale = state.kind === "view" ? state.view.locale : "en";
  const copy = CHECK_RESULT_COPY[locale].reportPage;

  const load = useCallback(async (): Promise<ReportView | null> => {
    try {
      const response = await fetch(
        `${FREE_SEO_CHECK_REPORT_PATH}?id=${encodeURIComponent(id)}`,
      );
      if (!response.ok) {
        const body = await response
          .json<{ error?: string }>()
          .catch(() => null);
        setState({ kind: "error", code: body?.error ?? "" });
        return null;
      }
      const view: ReportView = await response.json();
      setState({ kind: "view", view });
      return view;
    } catch {
      setState({ kind: "error", code: "" });
      return null;
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Each report gets its own poll budget — navigating to a second link must
    // not inherit the first one's spent count and stall immediately.
    pollCountRef.current = 0;

    async function poll() {
      const view = await load();
      if (cancelled || !view || view.status !== "pending") return;

      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_POLLS) {
        setState({ kind: "stalled" });
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <ReportBody reportId={id} state={state} locale={locale} />

      <div className="mt-10 rounded-box border border-primary/30 bg-primary/5 p-5 text-center">
        <p className="font-medium">{copy.ctaHeading}</p>
        <p className="mt-1 text-sm text-base-content/70">{copy.ctaBody}</p>
        <Link to="/free-seo-check" className="btn btn-primary btn-sm mt-4">
          {copy.ctaLink}
        </Link>
      </div>
    </main>
  );
}

function ReportBody({
  reportId,
  state,
  locale,
}: {
  reportId: string;
  state: PageState;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].reportPage;

  if (state.kind === "loading") {
    return (
      <p className="py-16 text-center text-base-content/60">{copy.loading}</p>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="py-16 text-center">
        <p className="text-error">
          {copy.errors[state.code] ?? copy.errorDefault}
        </p>
      </div>
    );
  }

  if (state.kind === "stalled") {
    return (
      <div className="py-16 text-center">
        <p className="text-base-content/80">{copy.stalledBody}</p>
        <button
          type="button"
          className="btn btn-sm mt-4"
          onClick={() => window.location.reload()}
        >
          {copy.stalledRefresh}
        </button>
      </div>
    );
  }

  const { view } = state;

  if (view.status === "pending") {
    return (
      <div className="py-16 text-center">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="mt-4 text-base-content/80">{copy.pendingTitle}</p>
        <p className="mt-1 text-sm text-base-content/50">{copy.pendingHint}</p>
      </div>
    );
  }

  if (view.status === "failed") {
    return (
      <div className="py-16 text-center">
        {/* Translate the specific server message (kill-switch/quota) when we
            recognize it — those carry actionable guidance ("try again
            tomorrow") — and fall back to the generic line otherwise. */}
        <p className="text-error">
          {copy.failedMessages[view.message] ?? copy.failedTitle}
        </p>
        <p className="mt-2 text-sm text-base-content/60">{copy.failedHint}</p>
      </div>
    );
  }

  return (
    <>
      {view.deduped ? (
        // The (domain, day) dedupe can resolve to another page of the same
        // site. Say so rather than passing it off as the exact page requested.
        <p className="mb-6 rounded-box border border-base-300 bg-base-200 px-4 py-3 text-sm text-base-content/70">
          {copy.dedupedNotice}
        </p>
      ) : null}
      <DeepReportView
        reportId={reportId}
        report={view.report}
        locale={locale}
      />
    </>
  );
}
