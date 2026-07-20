/**
 * Mixed-content detection: an HTTPS page pulling a sub-resource over plain HTTP.
 *
 * Takes an already-loaded cheerio root rather than raw HTML so the crawler can
 * reuse the parse `analyzeHtml` has already done — at the 10k-page crawl cap a
 * second `cheerio.load` per page is pure waste.
 */
import type { CheerioAPI } from "cheerio";
import { normalizeUrl } from "./url-utils";

const MIXED_CONTENT_TARGETS: Array<{ selector: string; attr: string }> = [
  { selector: "img", attr: "src" },
  { selector: "script", attr: "src" },
  { selector: 'link[rel="stylesheet"]', attr: "href" },
  { selector: "iframe", attr: "src" },
];

export function detectMixedContent($: CheerioAPI, pageUrl: string): boolean {
  // Only an HTTPS page can have mixed content; an HTTP page is insecure as a
  // whole, which is a separate rule.
  if (!pageUrl.startsWith("https:")) return false;

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
