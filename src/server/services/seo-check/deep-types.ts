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
import { measurementSchema } from "./types";

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
  /**
   * Optional for the same reason it is on the Lite signal: Deep reports are
   * persisted to R2 and re-validated on every `/r/{id}` read, and a required
   * field would fail reports written before measurements existed — breaking
   * links already sitting in someone's inbox. `toDeepSignal` spreads the whole
   * issue, so without this key zod would silently strip the measurement.
   */
  measurement: measurementSchema.optional(),
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

/** Shared by the top-level (mobile) fields and the desktop section — the two
 * must never drift apart in shape. */
const psiScoresSchema = z.object({
  performance: z.number().nullable(),
  seo: z.number().nullable(),
  accessibility: z.number().nullable(),
  bestPractices: z.number().nullable(),
});

const deepPageSchema = z.object({
  /** First raw landing URL — display identity; can vary between crawls. */
  url: z.string(),
  /**
   * Stable page identity in the crawler's normalized form. Optional because
   * reports stored before the field existed live in R2 for their full
   * retention window and must keep validating on read.
   */
  normalizedUrl: z.string().optional(),
  statusCode: z.number(),
  overallScore: z.number(),
  signals: z.array(deepSignalSchema),
});

/**
 * The GEO / AI-search section — scored separately from the on-page number and
 * shown as directional. `null` when extraction failed or was skipped: GEO is
 * off the report's critical path and never blocks delivery (decision C).
 */
const geoSectionSchema = z.object({
  score: z.number(),
  signals: z.array(deepSignalSchema),
  /** Policy facts surfaced, not scored — the operator sets AI-crawler policy. */
  aiBots: z.object({ googleExtended: z.boolean(), gptbot: z.boolean() }),
  /** Experimental, non-Google-standard — reported, never scored. */
  llmsTxt: z.boolean(),
});
export type GeoSection = z.infer<typeof geoSectionSchema>;

/** Exported so the read path can validate an R2 payload it did not just write. */
export const deepReportSchema = z.object({
  requestedUrl: z.string(),
  finalUrl: z.string(),
  statusCode: z.number(),
  fetchedAt: z.string(),
  overallScore: z.number(),
  categoryScores: z.array(deepCategoryScoreSchema),
  /**
   * The top-level lab fields (`coreWebVitals`/`cwvSource`/`psiScores`) are the
   * MOBILE strategy — the primary, scored one (Google indexes mobile-first).
   * They keep their names unqualified because every reader since the first
   * deploy consumes them; renaming would be a silent migration of R2 payloads.
   */
  coreWebVitals: coreWebVitalsSchema.nullable(),
  cwvSource: z.enum(["field", "lab"]).nullable(),
  psiScores: psiScoresSchema,
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
  /**
   * Desktop-strategy lab data — a comparative display tab, never scored: the
   * rules engine and every score keep consuming the mobile fields above.
   * Optional for the same reason `deepPageSchema.normalizedUrl` is: reports
   * stored before the field existed live in R2 for their full retention window
   * and must keep validating on read. Omitted (not null) when the best-effort
   * desktop run failed, so those payloads stay byte-identical to legacy ones.
   */
  desktop: z
    .object({
      coreWebVitals: coreWebVitalsSchema.nullable(),
      cwvSource: z.enum(["field", "lab"]).nullable(),
      psiScores: psiScoresSchema,
    })
    .optional(),
  /**
   * GEO / AI-search section, or null when it was skipped or its extraction
   * failed. `.default(null)` so reports written before GEO existed still
   * validate on read (same reason the read path re-validates every payload).
   */
  geo: geoSectionSchema.nullable().default(null),
});
export type DeepReport = z.infer<typeof deepReportSchema>;
