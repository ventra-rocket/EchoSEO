import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FREE_SEO_CHECK_CHECK_PATH,
  FREE_SEO_CHECK_LANDING_PATH,
  FREE_SEO_CHECK_VI_LANDING_PATH,
} from "@/shared/free-seo-check";
import {
  LEGAL_PRIVACY_PATH_BY_LOCALE,
  LEGAL_TERMS_PATH_BY_LOCALE,
} from "@/shared/legal";
// One source for the legal link labels and the home aria, shared with the
// landing and the legal pages so this chrome cannot drift from theirs.
import { LEGAL_CHROME_COPY } from "@/client/features/legal/legal-chrome-copy";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "@/client/features/free-seo-check/check-result-copy";
import { LiteReportView } from "@/client/features/free-seo-check/LiteReportView";
import { formatScanDate } from "@/client/features/free-seo-check/report-format";
import { EchoSeoLogo } from "@/client/components/EchoSeoLogo";
import {
  peekCheckView,
  takeCheckView,
  type CheckView,
} from "@/client/features/free-seo-check/check-view-cache";

// A check link is a bearer capability — anyone holding it sees the frozen
// result. The response also carries `Referrer-Policy: no-referrer` +
// `X-Robots-Tag: noindex` and the server-injected OG tags (server.ts,
// `fetchSharedCheckPage`); these metas are the in-document half of the same
// rule. Deliberately NOT in robots.txt — a Disallow would stop unfurl bots
// from reading the OG tags.
export const Route = createFileRoute("/c/$id")({
  head: () => ({
    meta: [
      // Deliberately English: head() runs before the snapshot (and its locale)
      // arrives, and this is only the tab title of a noindex page. The share
      // card title (score + domain) is injected server-side.
      { title: "SEO check result — EchoSEO" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: SharedCheckPage,
});

type PageState =
  | { kind: "loading" }
  | { kind: "view"; view: CheckView }
  // The raw API error code — mapped to a message at render time so it follows
  // the page's locale rather than freezing the language at fetch time.
  | { kind: "error"; code: string };

function SharedCheckPage() {
  const { id } = Route.useParams();
  // Seeded by the landing's hand-off? Render it on the first paint — no loading
  // flash and no re-fetch of a report the check just produced. `peek` (not
  // `take`) keeps this initializer pure; the effect below consumes the seed.
  const [state, setState] = useState<PageState>(() => {
    const seeded = peekCheckView(id);
    return seeded ? { kind: "view", view: seeded } : { kind: "loading" };
  });

  // The snapshot carries the requester's language; until it arrives (or when
  // the load failed) there is no locale to honor, so English is the transient
  // default.
  const locale: Locale = state.kind === "view" ? state.view.locale : "en";
  const copy = CHECK_RESULT_COPY[locale].reportPage;
  const chrome = LEGAL_CHROME_COPY[locale];
  const landingPath =
    locale === "vi"
      ? FREE_SEO_CHECK_VI_LANDING_PATH
      : FREE_SEO_CHECK_LANDING_PATH;

  // One fetch, no polling: unlike a Deep report, a snapshot either exists in
  // full or not at all — there is no pending state to wait out.
  useEffect(() => {
    // The landing seeded this id — the report is already in state, so consume
    // the hand-off and skip the fetch (and its loading flash). A missing seed
    // (direct visit, refresh, forwarded link, or an id change) falls through to
    // the authoritative fetch below.
    if (takeCheckView(id)) return;

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `${FREE_SEO_CHECK_CHECK_PATH}?id=${encodeURIComponent(id)}`,
        );
        if (cancelled) return;
        if (!response.ok) {
          const body = await response
            .json<{ error?: string }>()
            .catch(() => null);
          if (!cancelled) setState({ kind: "error", code: body?.error ?? "" });
          return;
        }
        const view: CheckView = await response.json();
        if (!cancelled) setState({ kind: "view", view });
      } catch {
        if (!cancelled) setState({ kind: "error", code: "" });
      }
    }

    setState({ kind: "loading" });
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // The same shell as `/r/{id}`: brand chrome above, legal links below, so a
  // forwarded link arrives with a mark of who made the report.
  return (
    <div className="fsc-root h-full overflow-auto bg-base-200">
      <div className="flex min-h-full flex-col">
        <header className="border-b border-base-300 bg-base-100">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
            <a href={landingPath} aria-label={chrome.homeAria}>
              <EchoSeoLogo variant="lockup" className="text-base" />
            </a>
            <a
              href={landingPath}
              className="btn btn-ghost btn-sm gap-1.5 font-mono text-xs font-normal"
            >
              {copy.headerCta}
            </a>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
          <CheckBody state={state} locale={locale} />
        </main>

        <footer className="border-t border-base-300 bg-base-100">
          <div className="mx-auto w-full max-w-5xl space-y-3 px-4 py-8 text-sm text-base-content/60">
            <p className="leading-relaxed">{copy.footerLine}</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <a
                href={LEGAL_TERMS_PATH_BY_LOCALE[locale]}
                className="underline underline-offset-2 hover:text-base-content"
              >
                {chrome.termsLinkLabel}
              </a>
              <a
                href={LEGAL_PRIVACY_PATH_BY_LOCALE[locale]}
                className="underline underline-offset-2 hover:text-base-content"
              >
                {chrome.privacyLinkLabel}
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function CheckBody({ state, locale }: { state: PageState; locale: Locale }) {
  const copy = CHECK_RESULT_COPY[locale];

  if (state.kind === "loading") {
    return (
      <p className="py-16 text-center text-base-content/60">
        {copy.reportPage.loading}
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="py-16 text-center">
        <p className="text-error">
          {copy.reportPage.errors[state.code] ?? copy.reportPage.errorDefault}
        </p>
      </div>
    );
  }

  const { view } = state;

  return (
    <div className="space-y-4">
      {/* When this check ran — the one fact that separates a frozen snapshot
          from a live re-check. */}
      <p className="font-mono text-xs text-base-content/60">
        {copy.reportBand.scanned(formatScanDate(view.createdAt, locale))}
      </p>
      {/* The exact component the landing renders inline — it neither knows nor
          cares whether the report came from the POST response or a snapshot.
          Includes the Deep form/pitch, driven by the per-read availability.
          Except: no eager dual capture mount here — every share-view would
          spend render-ceiling slots on a check its reader didn't run. */}
      <LiteReportView
        report={view.report}
        deepAvailable={view.deepAvailable}
        locale={locale}
        warmInactiveStrategy={false}
      />
    </div>
  );
}
