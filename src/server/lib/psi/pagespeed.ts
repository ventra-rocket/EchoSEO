/**
 * Google PageSpeed Insights API client for the Free Deep SEO Check (Decision D).
 *
 * Free, official Lighthouse/CWV source (25k req/day). `fetchPageSpeed` is the
 * only network call; `shapePsiResult` is pure so the Workflow can wrap shaping
 * failures in a NonRetryableError without re-hitting the PSI quota on retry.
 *
 * CWV precedence: real-user CrUX field data when present, else the Lighthouse
 * lab run. INP has no lab metric, so lab falls back to Total Blocking Time as a
 * documented proxy.
 */
import { z } from "zod";
import type { CoreWebVitalsSignals } from "@/server/lib/seo-rules/rules/core-web-vitals";

const PSI_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Non-OK PSI response — carries the status so the caller can decide retryability. */
export class PsiRequestError extends Error {
  constructor(public readonly status: number) {
    super(`PSI request failed: ${status}`);
    this.name = "PsiRequestError";
  }
}

type CwvSource = "field" | "lab";

interface PsiLighthouseScores {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
}

export interface PsiResult {
  coreWebVitals: CoreWebVitalsSignals | null;
  cwvSource: CwvSource | null;
  scores: PsiLighthouseScores;
}

const numericAudit = z
  .object({ numericValue: z.number().nullish() })
  .optional();
const fieldMetric = z.object({ percentile: z.number().nullish() }).optional();
const category = z
  .object({ score: z.number().nullable().optional() })
  .optional();

// Lenient — PSI returns far more than this; we validate only what we consume.
const psiResponseSchema = z.object({
  lighthouseResult: z
    .object({
      categories: z
        .object({
          performance: category,
          seo: category,
          accessibility: category,
          "best-practices": category,
        })
        .optional(),
      audits: z
        .object({
          "largest-contentful-paint": numericAudit,
          "cumulative-layout-shift": numericAudit,
          "total-blocking-time": numericAudit,
          "server-response-time": numericAudit,
          "interaction-to-next-paint": numericAudit,
        })
        .optional(),
    })
    .optional(),
  loadingExperience: z
    .object({
      metrics: z
        .object({
          LARGEST_CONTENTFUL_PAINT_MS: fieldMetric,
          CUMULATIVE_LAYOUT_SHIFT_SCORE: fieldMetric,
          INTERACTION_TO_NEXT_PAINT: fieldMetric,
          EXPERIMENTAL_TIME_TO_FIRST_BYTE: fieldMetric,
        })
        .optional(),
    })
    .optional(),
});

type PsiResponse = z.infer<typeof psiResponseSchema>;

/**
 * Fetches the raw PSI JSON for a URL. Throws on a non-OK response so the caller
 * (the Workflow step) can retry transient 429/5xx failures; shaping is separate
 * and must not re-run this.
 */
export async function fetchPageSpeed(
  url: string,
  apiKey: string,
  strategy: "mobile" | "desktop" = "mobile",
): Promise<unknown> {
  const endpoint = new URL(PSI_ENDPOINT);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("strategy", strategy);
  for (const cat of ["performance", "seo", "accessibility", "best-practices"]) {
    endpoint.searchParams.append("category", cat);
  }

  const response = await fetch(endpoint, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new PsiRequestError(response.status);
  }
  return response.json();
}

function toScore(value: number | null | undefined): number | null {
  return typeof value === "number" ? Math.round(value * 100) : null;
}

function fieldCwv(response: PsiResponse): CoreWebVitalsSignals | null {
  const m = response.loadingExperience?.metrics;
  const lcp = m?.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
  const cls = m?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
  const inp = m?.INTERACTION_TO_NEXT_PAINT?.percentile;
  const ttfb = m?.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile;
  if (lcp == null || cls == null || inp == null || ttfb == null) {
    return null;
  }
  // CrUX reports CLS as an integer ×100 (e.g. 12 → 0.12).
  return { lcpMs: lcp, cls: cls / 100, inpMs: inp, ttfbMs: ttfb };
}

function labCwv(response: PsiResponse): CoreWebVitalsSignals | null {
  const a = response.lighthouseResult?.audits;
  const lcp = a?.["largest-contentful-paint"]?.numericValue;
  const cls = a?.["cumulative-layout-shift"]?.numericValue;
  const ttfb = a?.["server-response-time"]?.numericValue;
  // Lab has no INP; Total Blocking Time is the documented lab proxy.
  const inp =
    a?.["interaction-to-next-paint"]?.numericValue ??
    a?.["total-blocking-time"]?.numericValue;
  if (lcp == null || cls == null || inp == null || ttfb == null) {
    return null;
  }
  return { lcpMs: lcp, cls, inpMs: inp, ttfbMs: ttfb };
}

/** Pure — shapes raw PSI JSON into CWV + category scores. Throws on malformed input. */
export function shapePsiResult(raw: unknown): PsiResult {
  const response = psiResponseSchema.parse(raw);

  const field = fieldCwv(response);
  const coreWebVitals = field ?? labCwv(response);
  const cwvSource: CwvSource | null =
    coreWebVitals === null ? null : field ? "field" : "lab";

  const categories = response.lighthouseResult?.categories;
  return {
    coreWebVitals,
    cwvSource,
    scores: {
      performance: toScore(categories?.performance?.score),
      seo: toScore(categories?.seo?.score),
      accessibility: toScore(categories?.accessibility?.score),
      bestPractices: toScore(categories?.["best-practices"]?.score),
    },
  };
}
