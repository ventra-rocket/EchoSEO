import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReportView } from "@/server/services/seo-check/report-view";
import { FREE_SEO_CHECK_REPORT_PATH } from "@/shared/free-seo-check";
import { DeepReportView } from "@/client/features/free-seo-check/DeepReportView";

// A report link is a bearer capability — anyone holding it can read the report.
// The response also carries `Referrer-Policy: no-referrer` + `X-Robots-Tag:
// noindex` (server.ts) and robots.txt disallows /r/; these metas are the
// in-document half of the same rule.
export const Route = createFileRoute("/r/$id")({
  head: () => ({
    meta: [
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
  | { kind: "error"; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "This report link is invalid or has expired.",
  VALIDATION_ERROR: "This report link is invalid.",
  RATE_LIMITED: "Too many requests — wait a moment and refresh.",
};
const DEFAULT_ERROR_MESSAGE = "We couldn't load this report — please refresh.";

function SharedReportPage() {
  const { id } = Route.useParams();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const pollCountRef = useRef(0);

  const load = useCallback(async (): Promise<ReportView | null> => {
    try {
      const response = await fetch(
        `${FREE_SEO_CHECK_REPORT_PATH}?id=${encodeURIComponent(id)}`,
      );
      if (!response.ok) {
        const body = await response
          .json<{ error?: string }>()
          .catch(() => null);
        setState({
          kind: "error",
          message: ERROR_MESSAGES[body?.error ?? ""] ?? DEFAULT_ERROR_MESSAGE,
        });
        return null;
      }
      const view: ReportView = await response.json();
      setState({ kind: "view", view });
      return view;
    } catch {
      setState({ kind: "error", message: DEFAULT_ERROR_MESSAGE });
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
      <ReportBody state={state} />

      <div className="mt-10 rounded-box border border-primary/30 bg-primary/5 p-5 text-center">
        <p className="font-medium">Want these fixes done for you?</p>
        <p className="mt-1 text-sm text-base-content/70">
          EchoSEO is an open, agent-native SEO platform — self-host it free with
          your own keys, or let the agent layer apply the fixes and prove the
          result against your own Search Console data.
        </p>
        <Link to="/free-seo-check" className="btn btn-primary btn-sm mt-4">
          Check another page
        </Link>
      </div>
    </main>
  );
}

function ReportBody({ state }: { state: PageState }) {
  if (state.kind === "loading") {
    return (
      <p className="py-16 text-center text-base-content/60">
        Loading your report…
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="py-16 text-center">
        <p className="text-error">{state.message}</p>
      </div>
    );
  }

  if (state.kind === "stalled") {
    return (
      <div className="py-16 text-center">
        <p className="text-base-content/80">
          This check is taking longer than usual. It&apos;s still running —
          refresh this page in a minute.
        </p>
        <button
          type="button"
          className="btn btn-sm mt-4"
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
    );
  }

  const { view } = state;

  if (view.status === "pending") {
    return (
      <div className="py-16 text-center">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="mt-4 text-base-content/80">
          Your deep check is running — crawling your pages and pulling Core Web
          Vitals from Google.
        </p>
        <p className="mt-1 text-sm text-base-content/50">
          This page updates itself. It usually takes under a minute.
        </p>
      </div>
    );
  }

  if (view.status === "failed") {
    return (
      <div className="py-16 text-center">
        <p className="text-error">{view.message}</p>
        <p className="mt-2 text-sm text-base-content/60">
          Run the free check again — if it keeps failing, the site may be
          blocking automated requests.
        </p>
      </div>
    );
  }

  return (
    <>
      {view.deduped ? (
        // The (domain, day) dedupe can resolve to another page of the same
        // site. Say so rather than passing it off as the exact page requested.
        <p className="mb-6 rounded-box border border-base-300 bg-base-200 px-4 py-3 text-sm text-base-content/70">
          This site was already checked today, so here are those results — they
          cover the page shown below.
        </p>
      ) : null}
      <DeepReportView report={view.report} />
    </>
  );
}
