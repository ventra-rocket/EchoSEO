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
}

const MIXED_CONTENT_TARGETS: Array<{ selector: string; attr: string }> = [
  { selector: "img", attr: "src" },
  { selector: "script", attr: "src" },
  { selector: 'link[rel="stylesheet"]', attr: "href" },
  { selector: "iframe", attr: "src" },
];

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
  };
}
