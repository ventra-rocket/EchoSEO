import { createFileRoute, notFound } from "@tanstack/react-router";
import { LiteReportView } from "@/client/features/free-seo-check/LiteReportView";
import { isLocale, DEFAULT_LOCALE } from "@/client/i18n/config";
import { LITE_REPORT_FIXTURE } from "../../e2e/fixtures/lite-report-fixture";

/**
 * Renders the Lite result state from a fixture, for tests only.
 *
 * Running a real check requires a solved Turnstile challenge, which no
 * automated browser can produce — so the surface the checker is actually
 * judged on has never been screenshot-testable, and two rounds of review had
 * to reason about it from source rather than see it. This route closes that.
 *
 * Gated the same way the domain and keyword fixtures are
 * (`VITE_E2E_*_FIXTURES`): the flag is a build-time constant, so in any build
 * that does not set it the condition folds to `false` and the fixture data is
 * tree-shaken out of the bundle entirely — it is not a runtime toggle an
 * operator could switch on by accident. Verified on a flagless build: the
 * response is a 307 (`validateSearch` normalising the URL to `?locale=en`),
 * and following it gives a 404 carrying none of the fixture content.
 *
 * `?locale=vi` renders the Vietnamese result.
 */
function fixturesEnabled() {
  return import.meta.env.VITE_E2E_RESULT_FIXTURES === "1";
}

export const Route = createFileRoute("/dev-fixtures/lite-report")({
  beforeLoad: () => {
    if (!fixturesEnabled()) throw notFound();
  },
  validateSearch: (search: Record<string, unknown>) => ({
    locale: isLocale(search.locale) ? search.locale : DEFAULT_LOCALE,
  }),
  head: () => ({
    // Never indexable, even in a build where the flag is on.
    meta: [
      { title: "Lite report fixture" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FixturePage,
});

function FixturePage() {
  const { locale } = Route.useSearch();
  return (
    // The same scroll shell the landing uses, and it has to be: app.css sets
    // `html, body { height: 100%; overflow: hidden }` globally, so a route
    // without an inner scroller has everything below the first viewport
    // clipped and unreachable. Note the consequence for anything capturing
    // this page — Playwright's `fullPage` screenshots the document, which here
    // is one viewport tall, so a capture must target this container instead.
    <div className="h-full overflow-auto bg-base-200">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <LiteReportView
          report={LITE_REPORT_FIXTURE}
          deepAvailable
          locale={locale}
        />
      </div>
    </div>
  );
}
