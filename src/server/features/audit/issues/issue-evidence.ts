/**
 * The evidence payload stored with an occurrence: the observed facts a reader
 * needs to verify the finding without re-crawling. Deliberately the specific
 * value the rule judged — never a restatement of the rule's own text.
 */
import type { OnPageSignals } from "@/server/lib/seo-rules";
import type { CoreWebVitalsSignals } from "@/server/lib/seo-rules/rules/core-web-vitals";

export type IssueEvidence = Record<string, unknown>;

export function buildOnPageEvidence(
  ruleId: string,
  signals: OnPageSignals,
): IssueEvidence | null {
  switch (ruleId) {
    case "meta-title":
      return { title: signals.title, length: signals.title.length };
    case "meta-description":
      return {
        metaDescription: signals.metaDescription,
        length: signals.metaDescription.length,
      };
    case "meta-canonical":
      return { canonical: signals.canonical };
    case "structure-h1":
      return { h1Count: signals.h1s.length };
    case "structure-heading-order":
      return { headingOrder: signals.headingOrder };
    case "structure-image-alt":
      return {
        imagesTotal: signals.images.length,
        // Matches the rule: a missing alt attribute is the problem. An explicit
        // empty alt is the documented way to mark a decorative image, and the
        // rule passes it — the evidence must not contradict that.
        imagesMissingAlt: signals.images.filter((image) => image.alt === null)
          .length,
      };
    case "structure-word-count":
      return { wordCount: signals.wordCount };
    case "structure-structured-data":
      return { hasStructuredData: signals.hasStructuredData };
    case "server-https":
      return { url: signals.url };
    case "server-status":
      return {
        statusCode: signals.statusCode,
        redirectUrl: signals.redirectUrl,
      };
    case "server-indexable":
      return { robotsMeta: signals.robotsMeta };
    case "server-mixed-content":
      return { hasMixedContent: signals.hasMixedContent };
    default:
      return null;
  }
}

export function buildCoreWebVitalsEvidence(
  ruleId: string,
  signals: CoreWebVitalsSignals,
  strategy: "mobile" | "desktop",
): IssueEvidence | null {
  switch (ruleId) {
    case "cwv-lcp":
      return { lcpMs: signals.lcpMs, strategy };
    case "cwv-inp":
      return { inpMs: signals.inpMs, strategy };
    case "cwv-cls":
      return { cls: signals.cls, strategy };
    case "cwv-ttfb":
      return { ttfbMs: signals.ttfbMs, strategy };
    default:
      return null;
  }
}
