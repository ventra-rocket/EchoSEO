/**
 * Shared contract for the anonymous Lite SEO check (Phase 1).
 *
 * Zod-backed (like `AuditConfig` in audit/types.ts) so the 24h KV cache can
 * safely validate a round-tripped report instead of blindly trusting it.
 * Consumed by the seo-rules engine (Phase 2) and the report UI — keep this
 * stable.
 */
import { z } from "zod";
import { jsonCodec } from "@/shared/json";
import { SEVERITIES } from "@/server/lib/seo-rules/types";

export const SIGNAL_CATEGORIES = ["meta", "structure", "server"] as const;
export type SignalCategory = (typeof SIGNAL_CATEGORIES)[number];

export const SIGNAL_STATUSES = ["pass", "warn", "fail"] as const;
export type SignalStatus = (typeof SIGNAL_STATUSES)[number];

/**
 * One deterministic on-page check result, enriched by the seo-rules engine
 * (Phase 2) with a Google-cited fix.
 */
const signalSchema = z.object({
  id: z.string(),
  category: z.enum(SIGNAL_CATEGORIES),
  status: z.enum(SIGNAL_STATUSES),
  label: z.string(),
  severity: z.enum(SEVERITIES),
  problem: z.string(),
  fixSteps: z.array(z.string()),
  googleSourceUrl: z.string(),
  guideQuote: z.string(),
  lastReviewedDate: z.string(),
});
export type Signal = z.infer<typeof signalSchema>;

const categoryScoreSchema = z.object({
  category: z.enum(SIGNAL_CATEGORIES),
  /** 0-100, weighted average of this category's signal statuses. */
  score: z.number(),
});
export type CategoryScore = z.infer<typeof categoryScoreSchema>;

/**
 * Raw excerpt of the scanned page — untrusted. JSX escapes it on render;
 * never dangerouslySetInnerHTML it. A raw-HTML sink (e.g. a future email
 * body) must escape via output-encode.ts at that sink.
 */
const pageSummarySchema = z.object({
  title: z.string(),
  metaDescription: z.string(),
  h1: z.string().nullable(),
  wordCount: z.number(),
});

const liteReportSchema = z.object({
  requestedUrl: z.string(),
  finalUrl: z.string(),
  statusCode: z.number(),
  fetchedAt: z.string(),
  overallScore: z.number(),
  categoryScores: z.array(categoryScoreSchema),
  signals: z.array(signalSchema),
  pageSummary: pageSummarySchema,
  deepTeaser: z.object({
    /** Core Web Vitals metrics unlocked in the Deep tier via PSI (LCP, INP, CLS, TTFB). */
    coreWebVitalsMetricCount: z.number(),
  }),
});
export type LiteReport = z.infer<typeof liteReportSchema>;

export const liteReportCodec = jsonCodec(liteReportSchema);
