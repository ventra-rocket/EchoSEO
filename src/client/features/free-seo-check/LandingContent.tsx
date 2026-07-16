import {
  FAQS,
  HOW_IT_WORKS,
  LANDING_INTRO,
  WHAT_WE_CHECK,
  type LandingFeature,
} from "./landing-content";

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
 */
export function LandingContent() {
  return (
    <div className="space-y-10 border-t border-base-300 pt-10">
      <p className="text-center text-sm text-base-content/70">
        {LANDING_INTRO}
      </p>

      <FeatureList
        heading="What the free check looks at"
        features={WHAT_WE_CHECK}
      />
      <FeatureList heading="How it works" features={HOW_IT_WORKS} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Frequently asked questions</h2>
        <div className="space-y-2">
          {FAQS.map((faq) => (
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
