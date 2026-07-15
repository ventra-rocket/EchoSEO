/**
 * Contract for the email-gated Deep SEO report (Phase 3).
 *
 * Zod-backed like `LiteReport` so the R2-persisted payload can be validated on
 * read. Richer than Lite: Core Web Vitals + PSI category scores for the primary
 * URL, and per-page on-page signals for the bounded internal crawl. Signal
 * categories span the full rule set (incl. `core-web-vitals`), unlike Lite.
 */
import { z } from "zod";
import {
  ISSUE_STATUSES,
  RULE_CATEGORIES,
  SEVERITIES,
} from "@/server/lib/seo-rules/types";

const deepSignalSchema = z.object({
  id: z.string(),
  category: z.enum(RULE_CATEGORIES),
  status: z.enum(ISSUE_STATUSES),
  label: z.string(),
  severity: z.enum(SEVERITIES),
  problem: z.string(),
  fixSteps: z.array(z.string()),
  googleSourceUrl: z.string(),
  guideQuote: z.string(),
  lastReviewedDate: z.string(),
});
export type DeepSignal = z.infer<typeof deepSignalSchema>;

const deepCategoryScoreSchema = z.object({
  category: z.enum(RULE_CATEGORIES),
  score: z.number(),
});
export type DeepCategoryScore = z.infer<typeof deepCategoryScoreSchema>;

const coreWebVitalsSchema = z.object({
  lcpMs: z.number(),
  inpMs: z.number(),
  cls: z.number(),
  ttfbMs: z.number(),
});

const deepPageSchema = z.object({
  url: z.string(),
  statusCode: z.number(),
  overallScore: z.number(),
  signals: z.array(deepSignalSchema),
});

/** Exported so the read path can validate an R2 payload it did not just write. */
export const deepReportSchema = z.object({
  requestedUrl: z.string(),
  finalUrl: z.string(),
  statusCode: z.number(),
  fetchedAt: z.string(),
  overallScore: z.number(),
  categoryScores: z.array(deepCategoryScoreSchema),
  coreWebVitals: coreWebVitalsSchema.nullable(),
  cwvSource: z.enum(["field", "lab"]).nullable(),
  psiScores: z.object({
    performance: z.number().nullable(),
    seo: z.number().nullable(),
    accessibility: z.number().nullable(),
    bestPractices: z.number().nullable(),
  }),
  /** Primary page's full signal set (on-page + technical + Core Web Vitals). */
  signals: z.array(deepSignalSchema),
  /** One entry per crawled page (on-page + technical), primary first. */
  pages: z.array(deepPageSchema),
  pageSummary: z.object({
    title: z.string(),
    metaDescription: z.string(),
    h1: z.string().nullable(),
    wordCount: z.number(),
  }),
  crawl: z.object({ pagesCrawled: z.number() }),
});
export type DeepReport = z.infer<typeof deepReportSchema>;
