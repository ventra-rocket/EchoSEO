/**
 * Rebuilds the normalized signals the P02 rule catalog evaluates from a stored
 * audit page row.
 *
 * This is the seam that lets the professional audit reuse the shipped rules
 * instead of forking them: the crawler already produces `PageAnalysis`, and the
 * audit persists its fields, so the rules see the same shape they always have.
 */
import { z } from "zod";
import type { auditPages } from "@/db/audit.schema";
import type { OnPageSignals } from "@/server/lib/seo-rules";

export type AuditPageRow = typeof auditPages.$inferSelect;

const headingOrderSchema = z.array(z.number());
const imagesSchema = z.array(
  z.object({ src: z.string().nullable(), alt: z.string().nullable() }),
);
const hreflangSchema = z.array(z.string());

function parseJson<T>(
  raw: string | null,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export function toOnPageSignals(page: AuditPageRow): OnPageSignals {
  return {
    url: page.url,
    statusCode: page.statusCode ?? 0,
    redirectUrl: page.redirectUrl,
    responseTimeMs: page.responseTimeMs ?? 0,
    title: page.title ?? "",
    metaDescription: page.metaDescription ?? "",
    canonical: page.canonicalUrl,
    robotsMeta: page.robotsMeta,
    ogTitle: page.ogTitle,
    ogDescription: page.ogDescription,
    ogImage: page.ogImage,
    // Only the count is persisted. `structure-h1` reads `h1s.length` and nothing
    // else, so a length-accurate placeholder array is a faithful input; no rule
    // in the catalog inspects heading text.
    h1s: Array.from({ length: page.h1Count }, () => ""),
    headingOrder: parseJson(page.headingOrderJson, headingOrderSchema, []),
    wordCount: page.wordCount,
    images: parseJson(page.imagesJson, imagesSchema, []),
    // Per-page link arrays are not persisted (the crawl stores counts plus the
    // normalized edge table). No P02 rule reads them; cross-page link rules read
    // the edge table directly.
    internalLinks: [],
    externalLinks: [],
    hasStructuredData: page.hasStructuredData,
    hreflangTags: parseJson(page.hreflangTagsJson, hreflangSchema, []),
    hasMixedContent: page.hasMixedContent,
  };
}
