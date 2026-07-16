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
      <h2 className="text-lg font-semibold">{heading}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-box border border-base-300 bg-base-100 p-4"
          >
            <h3 className="font-medium">{feature.title}</h3>
            <p className="mt-1 text-sm text-base-content/60">{feature.body}</p>
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
      <p className="text-center text-sm text-base-content/70">{copy.intro}</p>

      <FeatureList
        heading={copy.whatWeCheckHeading}
        features={copy.whatWeCheck}
      />
      <FeatureList
        heading={copy.howItWorksHeading}
        features={copy.howItWorks}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{copy.faqHeading}</h2>
        <div className="space-y-2">
          {copy.faqs.map((faq) => (
            <details
              key={faq.question}
              className="rounded-box border border-base-300 bg-base-100 p-4"
            >
              <summary className="cursor-pointer font-medium">
                {faq.question}
              </summary>
              <p className="mt-2 text-sm text-base-content/60">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
