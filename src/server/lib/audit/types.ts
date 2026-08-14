/**
 * Shared types for the site audit system.
 */

import { z } from "zod";
import { jsonCodec } from "@/shared/json";
import { AUDIT_MIN_PAGES } from "@/shared/audit-limits";

export type LighthouseStrategy = "auto" | "all" | "manual" | "none";

export interface AuditConfig {
  maxPages: number;
  lighthouseStrategy: LighthouseStrategy;
}

// Bounds a STORED config, so the lower bound is the shared minimum but the upper
// one is deliberately looser than `AUDIT_MAX_PAGES`: rows written before the
// ceiling was measured down to 5,000 must still parse, or the report page throws
// INTERNAL_ERROR on history it cannot change. New launches are clamped to the
// shared maximum on the way in (`clampAuditMaxPages`), which is where the limit
// belongs.
const auditConfigSchema = z.object({
  maxPages: z.number().int().min(AUDIT_MIN_PAGES).max(10_000),
  lighthouseStrategy: z.enum(["auto", "all", "manual", "none"]),
});

const auditConfigCodec = jsonCodec(auditConfigSchema);

export function parseAuditConfig(configRaw: string | null): AuditConfig | null {
  if (!configRaw) return null;
  const result = auditConfigCodec.safeParse(configRaw);
  return result.success ? result.data : null;
}

/** Data extracted from a single page via cheerio. */
export interface PageAnalysis {
  url: string;
  statusCode: number;
  redirectUrl: string | null;
  responseTimeMs: number;

  // Head metadata
  title: string;
  metaDescription: string;
  canonical: string | null;
  robotsMeta: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;

  // Headings
  h1s: string[];
  headingOrder: number[];

  // Content
  wordCount: number;

  // Images
  images: Array<{ src: string | null; alt: string | null }>;

  // Links (raw href values from the HTML)
  internalLinks: string[];
  externalLinks: string[];

  // Structured data
  hasStructuredData: boolean;

  // Hreflang
  hreflangTags: string[];

  /** An HTTPS page referencing an HTTP sub-resource. */
  hasMixedContent: boolean;
}

/** Lighthouse result for a single URL+strategy. */
export interface LighthouseResult {
  url: string;
  pageId: string;
  strategy: "mobile" | "desktop";
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  ttfbMs: number | null;
  errorMessage?: string | null;
  r2Key?: string | null;
  payloadSizeBytes?: number | null;
}

export interface StepPageResult {
  id: string;
  url: string;
  statusCode: number;
  redirectUrl: string | null;
  title: string;
  metaDescription: string;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  h4Count: number;
  h5Count: number;
  h6Count: number;
  headingOrder: number[];
  wordCount: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  images: Array<{ src: string | null; alt: string | null }>;
  /**
   * Same-origin links as written, kept as an array because two things need the
   * URLs: the crawl frontier, and the persisted link graph.
   */
  internalLinks: string[];
  /**
   * Off-origin links as a COUNT, not an array.
   *
   * Nothing has ever read the URLs — `AuditRepository` stores
   * `external_link_count`, no rule consults them, and `snapshot-signals.ts`
   * rebuilds signals with an empty array. Carrying them made every crawl-batch
   * step return an unbounded second link list, and that return has a hard 1 MiB
   * ceiling in Workflows: a nav-and-footer-heavy page can hold hundreds of
   * outbound links, times 25 pages per batch. Counting at the source loses
   * nothing and removes one of the two unbounded fields from the payload.
   */
  externalLinkCount: number;
  hasStructuredData: boolean;
  hreflangTags: string[];
  hasMixedContent: boolean;
  isIndexable: boolean;
  /**
   * The response actually was an HTML document. False for a non-HTML resource
   * (PDF, image) and for a failed fetch, where the page fields are empty
   * placeholders rather than observations.
   */
  isHtml: boolean;
  responseTimeMs: number;
  /**
   * The parsed page facts, present only when the caller asked for them
   * (`crawlPage(..., { includeAnalysis: true })`).
   *
   * Absent by default, and that default matters: the crawl returns these from a
   * Workflow step in batches of 25 against a hard 1 MiB payload ceiling, so a
   * second copy of every page's facts would lower the largest crawl that can
   * finish. The competitor comparison opts in because the rule engine scores a
   * `PageAnalysis` — `evaluateLiteSignals(analysis)` is provably the same
   * verdict as `evaluateLiteSignals(toOnPageSignals(row))` (see
   * `issues/materialize.test.ts`) — and scoring their page through a different
   * function than ours would tilt the comparison invisibly.
   */
  analysis?: PageAnalysis;
}
