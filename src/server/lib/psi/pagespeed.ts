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

/** The two Lighthouse form factors PSI can run. */
export type PsiStrategy = "mobile" | "desktop";

export interface PsiLighthouseScores {
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

/**
 * The lab-only shape stored in the free visual bundle. No `cwvSource`: the
 * metrics are lab by construction (see `shapePsiLabResult`), so a source field
 * would only invite storing something else under it.
 */
export interface PsiLabResult {
  coreWebVitals: CoreWebVitalsSignals | null;
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
 * Read separately from `psiResponseSchema` so the megabyte-scale image field
 * is only touched by the one function that wants it. Lighthouse's own capture
 * of the rendered page — preferred over the `final-screenshot` audit, which PSI
 * returns at 124x248, a thumbnail too small to stand as visual evidence.
 */
const screenshotSchema = z.object({
  lighthouseResult: z
    .object({
      fullPageScreenshot: z
        .object({
          screenshot: z
            .object({
              data: z.string(),
              width: z.number(),
              height: z.number(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Fetches the raw PSI JSON for a URL. Throws on a non-OK response so the caller
 * (the Workflow step) can retry transient 429/5xx failures; shaping is separate
 * and must not re-run this.
 */
export async function fetchPageSpeed(
  url: string,
  apiKey: string,
  strategy: PsiStrategy = "mobile",
  signal?: AbortSignal,
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
    signal,
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

/** Decoded page capture, ready to store. Deliberately NOT part of `PsiResult`:
 * that value crosses a Workflow step boundary, where results are capped at
 * 1 MiB, and this image runs to a few hundred KB. */
export interface PsiScreenshot {
  // Backed by a plain ArrayBuffer (not the generic ArrayBufferLike) so it is
  // accepted as a BlobPart/BodyInit when the capture is served or stored.
  bytes: Uint8Array<ArrayBuffer>;
  contentType: string;
  width: number;
  height: number;
}

/**
 * Allowlisted rather than accepting any `image/*`: the bytes are echoed back
 * as the content type of a response served from our own origin, and letting
 * `image/svg+xml` through that path would make it a script sink. Lighthouse
 * only ever encodes these, so the list costs nothing today and keeps the hole
 * closed if the capture source is ever swapped for another.
 */
const DATA_URI = /^data:(image\/(?:webp|jpeg|png));base64,(.+)$/;

/**
 * Pure — pulls Lighthouse's rendered-page capture out of raw PSI JSON.
 *
 * Returns null rather than throwing whenever the capture is absent or
 * malformed: the screenshot is corroborating evidence, never a reason to fail
 * a check that otherwise succeeded.
 */
export function extractScreenshot(raw: unknown): PsiScreenshot | null {
  const parsed = screenshotSchema.safeParse(raw);
  if (!parsed.success) return null;

  const shot = parsed.data.lighthouseResult?.fullPageScreenshot?.screenshot;
  if (!shot) return null;

  const match = DATA_URI.exec(shot.data);
  if (!match) return null;
  const [, contentType, base64] = match;

  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    return null;
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return { bytes, contentType, width: shot.width, height: shot.height };
}

/**
 * One frame of Lighthouse's loading filmstrip. The data URI is kept as the
 * string PSI returned (not decoded): the frames are stored and served as one
 * JSON bundle and rendered client-side as `<img src="data:…">`, so decoding
 * here would only be re-encoded on the way out.
 */
export interface PsiFilmstripFrame {
  /** `data:image/(webp|jpeg|png);base64,…` — allowlisted via DATA_URI, never SVG. */
  data: string;
  /** Milliseconds from navigation start to this frame. */
  timingMs: number;
}

/**
 * Hard caps keeping the stored filmstrip bundle bounded (~100–200 KB of JSON
 * worst case). Lighthouse emits 8 frames of small thumbnails, so real
 * responses sit far under both; the caps only bite on a hostile or degenerate
 * payload, and then by dropping frames — never by failing the render that
 * produced them.
 */
const MAX_FILMSTRIP_FRAMES = 10;
const MAX_FILMSTRIP_FRAME_CHARS = 20_000;

const filmstripItemSchema = z.object({
  data: z.string(),
  timing: z.number(),
});

// Like screenshotSchema, read separately from psiResponseSchema so the image
// payloads are only touched by the function that wants them.
const filmstripSchema = z.object({
  lighthouseResult: z
    .object({
      audits: z
        .object({
          "screenshot-thumbnails": z
            .object({
              details: z
                .object({ items: z.array(z.unknown()).optional() })
                .optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Pure — pulls the loading filmstrip out of raw PSI JSON. Zero extra quota:
 * the audit rides along in the same response the screenshot render fetches.
 *
 * Returns null rather than throwing when the audit is absent or unusable, and
 * drops (rather than fails on) individual frames that are malformed, oversize,
 * or outside the image allowlist — the filmstrip is corroborating evidence,
 * never a reason to fail. Frames beyond the count cap are dropped in input
 * order (PSI emits them chronologically); survivors are sorted by timing.
 */
export function extractFilmstrip(raw: unknown): PsiFilmstripFrame[] | null {
  const parsed = filmstripSchema.safeParse(raw);
  if (!parsed.success) return null;

  const items =
    parsed.data.lighthouseResult?.audits?.["screenshot-thumbnails"]?.details
      ?.items;
  if (!items) return null;

  const frames: PsiFilmstripFrame[] = [];
  for (const item of items) {
    if (frames.length >= MAX_FILMSTRIP_FRAMES) break;
    const frame = filmstripItemSchema.safeParse(item);
    if (!frame.success) continue;
    const { data, timing } = frame.data;
    // Same allowlist as the capture: these bytes are echoed back from our
    // origin, so image/svg+xml stays a refused script sink here too.
    if (!DATA_URI.test(data)) continue;
    if (data.length > MAX_FILMSTRIP_FRAME_CHARS) continue;
    frames.push({ data, timingMs: timing });
  }

  if (frames.length === 0) return null;
  frames.sort((a, b) => a.timingMs - b.timingMs);
  return frames;
}

function shapeScores(response: PsiResponse): PsiLighthouseScores {
  const categories = response.lighthouseResult?.categories;
  return {
    performance: toScore(categories?.performance?.score),
    seo: toScore(categories?.seo?.score),
    accessibility: toScore(categories?.accessibility?.score),
    bestPractices: toScore(categories?.["best-practices"]?.score),
  };
}

/** Pure — shapes raw PSI JSON into CWV + category scores. Throws on malformed input. */
export function shapePsiResult(raw: unknown): PsiResult {
  const response = psiResponseSchema.parse(raw);

  const field = fieldCwv(response);
  const coreWebVitals = field ?? labCwv(response);
  const cwvSource: CwvSource | null =
    coreWebVitals === null ? null : field ? "field" : "lab";

  return { coreWebVitals, cwvSource, scores: shapeScores(response) };
}

/**
 * Pure — shapes raw PSI JSON into category scores + LAB-ONLY Core Web Vitals,
 * for the free visual bundle. Deliberately never reads `loadingExperience`:
 * the bundle is labelled "homepage · lab", and CrUX field data slipping in
 * here would both falsify that label and give away the exact-URL field data
 * that stays the Deep tier's differentiator. Like `shapePsiResult`, throws on
 * malformed input — the render path wraps it so a shaping failure can never
 * cost the capture.
 */
export function shapePsiLabResult(raw: unknown): PsiLabResult {
  const response = psiResponseSchema.parse(raw);
  return { coreWebVitals: labCwv(response), scores: shapeScores(response) };
}
