/**
 * On-page signal extraction for the Lite check.
 *
 * Reuses the audit engine's cheerio-based `analyzeHtml` (already proven
 * inside Worker CPU limits for full-site crawls), which also reports mixed
 * content, and adds the JSON-LD `@type` list the GEO checks need.
 */
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { analyzeDocument } from "@/server/lib/audit/page-analyzer";
import type { PageAnalysis } from "@/server/lib/audit/types";

export interface ParsedPage extends PageAnalysis {
  /** Distinct JSON-LD `@type` values on the page — the GEO checks need the
   * actual types, where the audit analyzer only records a present/absent bool. */
  schemaTypes: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Collects `@type` strings from every JSON-LD block, flattening arrays and
 * `@graph` nodes. Malformed JSON in one block is skipped, not fatal. */
function extractSchemaTypes($: CheerioAPI): string[] {
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

export function parseLitePage(
  html: string,
  pageUrl: string,
  statusCode: number,
  responseTimeMs: number,
): ParsedPage {
  // One parse feeds both passes. Building the DOM is the whole cost of a check
  // — the rule engine that runs afterwards is free by comparison — so a second
  // `cheerio.load` here would add roughly a third to every page scanned, on the
  // lite check and on each page of a deep crawl alike.
  const $ = cheerio.load(html);
  const analysis = analyzeDocument(
    $,
    pageUrl,
    statusCode,
    responseTimeMs,
    null,
  );
  return {
    ...analysis,
    schemaTypes: extractSchemaTypes($),
  };
}
