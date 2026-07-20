/**
 * On-page signal extraction for the Lite check.
 *
 * Reuses the audit engine's cheerio-based `analyzeHtml` (already proven
 * inside Worker CPU limits for full-site crawls) and adds a mixed-content
 * check the audit path doesn't need.
 */
import * as cheerio from "cheerio";
import { analyzeHtml } from "@/server/lib/audit/page-analyzer";
import { normalizeUrl } from "@/server/lib/audit/url-utils";
import type { PageAnalysis } from "@/server/lib/audit/types";

export interface ParsedPage extends PageAnalysis {
  /** True if an HTTPS page references an HTTP sub-resource. */
  hasMixedContent: boolean;
  /** Distinct JSON-LD `@type` values on the page — the GEO checks need the
   * actual types, where the audit analyzer only records a present/absent bool. */
  schemaTypes: string[];
}

const MIXED_CONTENT_TARGETS: Array<{ selector: string; attr: string }> = [
  { selector: "img", attr: "src" },
  { selector: "script", attr: "src" },
  { selector: 'link[rel="stylesheet"]', attr: "href" },
  { selector: "iframe", attr: "src" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Collects `@type` strings from every JSON-LD block, flattening arrays and
 * `@graph` nodes. Malformed JSON in one block is skipped, not fatal. */
function extractSchemaTypes(html: string): string[] {
  const $ = cheerio.load(html);
  const types = new Set<string>();

  const collect = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(collect);
      return;
    }
    if (!isRecord(node)) return;
    const type = node["@type"];
    if (typeof type === "string") types.add(type);
    else if (Array.isArray(type)) {
      type.forEach((t) => typeof t === "string" && types.add(t));
    }
    if (Array.isArray(node["@graph"])) collect(node["@graph"]);
  };

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      collect(JSON.parse(raw));
    } catch {
      // A single malformed JSON-LD block must not sink the whole extraction.
    }
  });

  return [...types];
}

function hasMixedContent(html: string, pageUrl: string): boolean {
  if (!pageUrl.startsWith("https:")) return false;

  const $ = cheerio.load(html);
  return MIXED_CONTENT_TARGETS.some(({ selector, attr }) => {
    let found = false;
    $(selector).each((_, el) => {
      if (found) return;
      const value = $(el).attr(attr);
      if (!value) return;
      const resolved = normalizeUrl(value, pageUrl);
      if (resolved?.startsWith("http:")) found = true;
    });
    return found;
  });
}

export function parseLitePage(
  html: string,
  pageUrl: string,
  statusCode: number,
  responseTimeMs: number,
): ParsedPage {
  const analysis = analyzeHtml(html, pageUrl, statusCode, responseTimeMs, null);
  return {
    ...analysis,
    hasMixedContent: hasMixedContent(html, pageUrl),
    schemaTypes: extractSchemaTypes(html),
  };
}
