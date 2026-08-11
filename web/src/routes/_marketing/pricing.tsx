import { createFileRoute } from "@tanstack/react-router";
import { buildPageSeo } from "@/lib/seo";

/**
 * What this page may claim is bounded by what the deployment actually does.
 * EchoSEO runs with no paywall today, and the paid data features are reached
 * with the customer's OWN DataForSEO key — so there is no subscription, no
 * usage credit, and no refund window to describe. A price here before billing
 * exists would be a promise the product cannot keep, and this page inherited
 * exactly that from the upstream project it was forked from.
 */
export const Route = createFileRoute("/_marketing/pricing")({
  head: () =>
    buildPageSeo({
      title: "Pricing",
      description:
        "EchoSEO is free to use and free to self-host. Paid SEO data runs on your own DataForSEO key, billed by them at cost.",
      path: "/pricing",
      titleSuffix: "EchoSEO",
    }),
  component: Pricing,
});

/**
 * Each list below is what a BRAND-NEW hosted account can actually run today —
 * not what the product contains. Three server functions still refuse an org
 * that is neither allowlisted nor on a paid plan (`startAudit`,
 * `triggerRankCheck`, and the AI Visibility handlers), and `HOSTED_ACCESS_OPEN`
 * does not reach them, so advertising those as free would send a new signup
 * into a paywall that cannot be cleared while billing is deferred. Move them up
 * here the day those gates honour the flag — not before.
 */
const FREE_FEATURES = [
  "Free SEO checker — on-page, technical, and Core Web Vitals, no account",
  "Keyword research and search volume",
  "Backlinks and referring domains",
  "Google Search Console integration and MCP server",
  "Agent skills for Claude, Cursor, and Codex",
];

/** Self-hosting gates nothing: every check above is `authMode === "hosted"`. */
const SELF_HOST_FEATURES = [
  "Professional site audit and AI-search readiness",
  "Rank tracking and scheduled checks",
  "AI brand visibility and the search-prompt explorer",
  "IndexNow submission",
];

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm text-neutral-700">
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand-accent)]">
        <span className="sr-only">Included:</span>
      </span>
      {children}
    </li>
  );
}

function Pricing() {
  return (
    <article className="mx-auto max-w-5xl">
      <p className="text-sm font-medium text-[var(--color-brand-accent)]">
        Pricing
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-neutral-950 md:text-6xl">
        Free to use. Free to own.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--color-brand-muted)]">
        EchoSEO costs nothing to use and nothing to self-host. The features that
        need paid search data run on your own provider key, so you pay the
        provider directly — at their price, with no markup from us.
      </p>

      {/* Free */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
          Free
        </h2>
        <div className="mt-6 overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-white">
          <div className="p-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-semibold text-neutral-950">Everything below</p>
              <p className="text-xl font-semibold tabular-nums text-neutral-950">
                $0
              </p>
            </div>
            <ul className="mt-3 space-y-2">
              {FREE_FEATURES.map((item) => (
                <Bullet key={item}>{item}</Bullet>
              ))}
            </ul>
          </div>
        </div>
        <a
          href="https://app.echoseo.ventrarocket.vn/sign-up"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          Get started{" "}
          <span aria-hidden="true" className="ml-1.5">
            &rarr;
          </span>
        </a>
        <p className="mt-3 text-xs text-neutral-500">
          No card, and no trial clock — there is nothing to bill yet.
        </p>
      </section>

      {/* Bring your own key */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
          Bring your own SEO data key
        </h2>
        <div className="mt-6 rounded-xl border border-[var(--color-border-subtle)] bg-white p-6">
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-brand-muted)]">
            Competitive data has to come from somewhere, and nobody but Google
            and the big aggregators holds that index. Add your own DataForSEO
            key and the research features run on it. DataForSEO bills you at
            their rates — we do not resell it, and there is no credit system in
            between.
          </p>
        </div>
      </section>

      {/* What the hosted app does not open yet */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
          Self-host to unlock the rest
        </h2>
        <div className="mt-6 rounded-xl border border-[var(--color-border-subtle)] bg-white p-6">
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-brand-muted)]">
            These run today on a deployment you own. On our hosted app they are
            still limited to invited workspaces while billing is being sorted
            out — we would rather say so here than let you sign up and hit a
            wall.
          </p>
          <ul className="mt-4 space-y-2">
            {SELF_HOST_FEATURES.map((item) => (
              <Bullet key={item}>{item}</Bullet>
            ))}
          </ul>
        </div>
      </section>

      {/* Self-hosted */}
      <section className="mt-12 rounded-xl border border-[var(--color-border-subtle)] bg-white p-6">
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
          Self-hosted
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-brand-muted)]">
          Deploy EchoSEO yourself on Cloudflare Workers or Docker. Bring your
          own API keys, keep your data on your own infrastructure, and pay every
          provider directly. The source is MIT-licensed.
        </p>
        <a
          href="https://github.com/ventra-rocket/EchoSEO"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-950 transition-colors hover:text-[var(--color-brand-accent)]"
        >
          View on GitHub
          <span aria-hidden="true">&rarr;</span>
        </a>
      </section>

      {/* FAQ */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
          FAQ
        </h2>
        <dl className="mt-5 divide-y divide-[var(--color-border-subtle)] rounded-xl border border-[var(--color-border-subtle)] bg-white">
          <div className="p-5">
            <dt className="text-sm font-medium text-neutral-950">
              What does EchoSEO cost?
            </dt>
            <dd className="mt-1.5 text-sm leading-6 text-[var(--color-brand-muted)]">
              Nothing — there is no subscription to buy. The only money involved
              is what you choose to spend with a data provider such as
              DataForSEO, and they bill you for it, not us. Some features are
              not open on the hosted app yet; that is a launch limit, not a
              price. Self-hosting has no limits at all.
            </dd>
          </div>
          <div className="p-5">
            <dt className="text-sm font-medium text-neutral-950">
              Which features need my own key?
            </dt>
            <dd className="mt-1.5 text-sm leading-6 text-[var(--color-brand-muted)]">
              The ones that query a search index: keyword research, backlinks,
              referring domains, and rank tracking. The free SEO checker, the
              site audit, AI-search readiness, IndexNow, and the Search Console
              integration and MCP server need no provider key at all.
            </dd>
          </div>
          <div className="p-5">
            <dt className="text-sm font-medium text-neutral-950">
              Can EchoSEO charge me unexpectedly?
            </dt>
            <dd className="mt-1.5 text-sm leading-6 text-[var(--color-brand-muted)]">
              No, because EchoSEO never charges you at all. Provider spend sits
              in your own DataForSEO account, where you set the limits and can
              see every call.
            </dd>
          </div>
          <div className="p-5">
            <dt className="text-sm font-medium text-neutral-950">
              Will there be a paid plan?
            </dt>
            <dd className="mt-1.5 text-sm leading-6 text-[var(--color-brand-muted)]">
              A managed tier is planned, for teams that would rather not hold
              their own provider keys. It does not exist yet, and this page will
              say so plainly on the day it does. Self-hosting stays free.
            </dd>
          </div>
          <div className="p-5">
            <dt className="text-sm font-medium text-neutral-950">
              Is it really open source?
            </dt>
            <dd className="mt-1.5 text-sm leading-6 text-[var(--color-brand-muted)]">
              Yes — MIT, on{" "}
              <a
                href="https://github.com/ventra-rocket/EchoSEO"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-neutral-950 underline underline-offset-2"
              >
                GitHub
              </a>
              . EchoSEO is built on the MIT-licensed{" "}
              <a
                href="https://github.com/every-app/open-seo"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-neutral-950 underline underline-offset-2"
              >
                open-seo
              </a>{" "}
              project, and that credit stays.
            </dd>
          </div>
        </dl>
      </section>
    </article>
  );
}
