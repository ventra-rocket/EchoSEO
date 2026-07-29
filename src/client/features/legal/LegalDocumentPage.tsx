/**
 * Renders one legal document. Both `/terms-and-conditions` and `/privacy` are
 * public, server-rendered routes, so this component stays deliberately plain: no
 * data fetching, no session, no client state. That is what keeps it safe to
 * render outside the authenticated island in `__root.tsx` — see the invariant
 * test in `shared/free-seo-check.test.ts`, which fails if a public file ever
 * imports the shared query or auth client.
 */
import {
  LEGAL_LAST_UPDATED,
  LEGAL_PRIVACY_PATH,
  LEGAL_TERMS_PATH,
} from "@/shared/legal";
import { FREE_SEO_CHECK_LANDING_PATH } from "@/shared/free-seo-check";
import { EchoSeoLogo } from "@/client/components/EchoSeoLogo";
import type { LegalBlock, LegalDocument } from "./legal-content";

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "paragraph":
      return <p>{block.text}</p>;
    case "list":
      return (
        <ul className="list-disc space-y-2 pl-5">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "definitions":
      return (
        <dl className="space-y-3">
          {block.entries.map((entry) => (
            <div key={entry.term}>
              <dt className="font-medium text-base-content">{entry.term}</dt>
              <dd className="text-base-content/70">{entry.description}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

// Named `doc`, not `document`: a prop called `document` would shadow the DOM
// global inside this component, which is exactly the kind of quiet trap that
// bites whoever adds the first line of browser code here.
export function LegalDocumentPage({ doc }: { doc: LegalDocument }) {
  return (
    <div className="h-full overflow-auto bg-base-200">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <a href={FREE_SEO_CHECK_LANDING_PATH} aria-label="EchoSEO home">
            <EchoSeoLogo variant="lockup" className="text-base" />
          </a>
        </div>
      </header>

      <main>
        <article className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:py-14">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {doc.title}
            </h1>
            <p className="text-sm leading-relaxed text-base-content/60">
              {doc.summary}
            </p>
            <p className="font-mono text-xs text-base-content/50">
              Last updated {LEGAL_LAST_UPDATED}
            </p>
          </div>

          {doc.sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">
                {section.heading}
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-base-content/70">
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </div>
            </section>
          ))}

          <footer className="border-t border-base-300 pt-6 text-sm text-base-content/60">
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <a
                href={LEGAL_TERMS_PATH}
                className="underline underline-offset-2 hover:text-base-content"
              >
                Terms and Conditions
              </a>
              <a
                href={LEGAL_PRIVACY_PATH}
                className="underline underline-offset-2 hover:text-base-content"
              >
                Privacy Policy
              </a>
              <a
                href={FREE_SEO_CHECK_LANDING_PATH}
                className="underline underline-offset-2 hover:text-base-content"
              >
                Free SEO Checker
              </a>
            </p>
          </footer>
        </article>
      </main>
    </div>
  );
}
