import { ChevronRight } from "lucide-react";
import type { LandingCopy, LandingFeature } from "./landing-copy";

function FeatureList({
  heading,
  features,
}: {
  heading: string;
  features: readonly LandingFeature[];
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            // A trailing odd card (the 3rd of "what we check") spans both
            // columns instead of leaving an empty cell beside it.
            className="rounded-box border border-base-300 bg-base-100 p-4 transition-colors hover:border-primary/40 sm:odd:last:col-span-2"
          >
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono text-xs text-primary"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-medium">{feature.title}</h3>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-base-content/60">
              {feature.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Editorial content below the checker form: what the tool looks at, how the two
 * tiers work, and an FAQ. Real, self-contained copy so the landing is not a thin
 * page, and the FAQ doubles as the source for the page's FAQPage structured data.
 * All strings come from the locale's copy, so this renders in the page's language.
 */
export function LandingContent({ copy }: { copy: LandingCopy }) {
  return (
    <div className="space-y-10 border-t border-base-300 pt-10">
      <p className="mx-auto max-w-lg text-center text-sm leading-relaxed text-base-content/70">
        {copy.intro}
      </p>

      <FeatureList
        heading={copy.whatWeCheckHeading}
        features={copy.whatWeCheck}
      />
      <FeatureList
        heading={copy.howItWorksHeading}
        features={copy.howItWorks}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {copy.faqHeading}
        </h2>
        <div className="space-y-2">
          {copy.faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-box border border-base-300 bg-base-100"
            >
              <summary className="fsc-summary flex cursor-pointer items-center justify-between gap-3 rounded-box px-4 py-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                {faq.question}
                <ChevronRight
                  className="size-4 shrink-0 text-base-content/40 transition-transform group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              <p className="border-t border-base-300 px-4 pb-4 pt-3 text-sm leading-relaxed text-base-content/70">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
