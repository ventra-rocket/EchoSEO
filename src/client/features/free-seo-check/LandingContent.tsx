import { ChevronRight } from "lucide-react";
import type { LandingCopy, LandingFeature } from "./landing-copy";

/**
 * Shared heading tier for the editorial sections: mono uppercase kicker over a
 * text-xl heading. Cards on this page are reserved for data (the form, the
 * sample report); the prose below gets chapter headings instead of more boxes.
 */
function SectionHeading({
  eyebrow,
  heading,
}: {
  eyebrow: string;
  heading: string;
}) {
  return (
    <header className="space-y-1">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
        {eyebrow}
      </p>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {heading}
      </h2>
    </header>
  );
}

/**
 * Borderless text blocks with the mono numeral as a left rail — prose sitting
 * on the page ground, not a grid of bordered cards. The numeral column is what
 * carries the instrument voice here; the copy carries the argument.
 */
function NumberedProse({ features }: { features: readonly LandingFeature[] }) {
  return (
    <div className="space-y-6">
      {features.map((feature, index) => (
        <div
          key={feature.title}
          className="grid grid-cols-[2.5rem_1fr] gap-x-2"
        >
          <span
            className="pt-0.5 font-mono text-sm tabular-nums text-primary/80"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="font-medium">{feature.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-base-content/70">
              {feature.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Vertical timeline with numbered nodes and a hairline connector — the two
 * tiers of the product are sequential (instant check, then the emailed deep
 * check), and a timeline says "then" in a way a card grid cannot.
 */
function Timeline({ features }: { features: readonly LandingFeature[] }) {
  return (
    <ol>
      {features.map((feature, index) => (
        <li key={feature.title} className="relative pb-8 pl-12 last:pb-0">
          <span
            className="absolute left-0 top-0 grid size-8 place-items-center rounded-full border border-primary/40 bg-base-100 font-mono text-xs text-primary"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          {index < features.length - 1 ? (
            <span
              className="absolute bottom-0 left-4 top-9 w-px bg-base-300"
              aria-hidden="true"
            />
          ) : null}
          <h3 className="pt-1.5 font-medium">{feature.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-base-content/70">
            {feature.body}
          </p>
        </li>
      ))}
    </ol>
  );
}

/**
 * Editorial content below the checker form: what the tool looks at, how the two
 * tiers work, and an FAQ. Real, self-contained copy so the landing is not a thin
 * page, and the FAQ doubles as the source for the page's FAQPage structured data.
 * All strings come from the locale's copy, so this renders in the page's language.
 *
 * Three distinct layout idioms on purpose — numbered prose, a timeline, and a
 * divided list. The previous version pushed every section through one bordered
 * card grid, and that single repeated idiom is what made the page read as
 * template output rather than a designed page.
 */
export function LandingContent({ copy }: { copy: LandingCopy }) {
  return (
    <div className="space-y-12 border-t border-base-300 pt-10">
      <p className="text-base leading-relaxed text-base-content/70">
        {copy.intro}
      </p>

      <section className="space-y-5">
        <SectionHeading
          eyebrow={copy.whatWeCheckEyebrow}
          heading={copy.whatWeCheckHeading}
        />
        <NumberedProse features={copy.whatWeCheck} />
      </section>

      <section className="space-y-5">
        <SectionHeading
          eyebrow={copy.howItWorksEyebrow}
          heading={copy.howItWorksHeading}
        />
        <Timeline features={copy.howItWorks} />
      </section>

      <section className="space-y-3">
        <SectionHeading eyebrow={copy.faqEyebrow} heading={copy.faqHeading} />
        <div className="divide-y divide-base-300">
          {copy.faqs.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="fsc-summary flex cursor-pointer items-center justify-between gap-3 py-4 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                {faq.question}
                <ChevronRight
                  className="size-4 shrink-0 text-base-content/60 transition-transform group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-4 pr-7 text-sm leading-relaxed text-base-content/70">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
