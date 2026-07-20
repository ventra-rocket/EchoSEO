/**
 * GEO / AI-search signal extraction for the Deep tier (Phase 4).
 *
 * Assembles the `GeoSignals` the `Rule<GeoSignals>` catalog evaluates: on-page
 * facts come from the primary page already parsed by the crawl, and two side
 * fetches add the robots.txt per-bot policy and `/llms.txt` presence. Every
 * fetch is SSRF-gated (`safeFetch`) and failure-tolerant — this runs off the
 * report's critical path and must degrade to a usable signal set, never throw
 * the report away (decision C).
 */
import robotsParser from "robots-parser";
import type { GeoSignals } from "@/server/lib/seo-rules";
import { safeFetch, readBoundedText } from "./safe-fetch";
import type { ParsedPage } from "./parse-html";

/** No robots.txt (or an unreadable one) means nothing is disallowed. */
const ALL_ALLOWED: GeoSignals["botAccess"] = {
  googlebot: true,
  googleExtended: true,
  gptbot: true,
};

/** True if a heading level jumps by more than one from the highest seen. */
function hasHeadingSkip(order: number[]): boolean {
  let maxSeen = 0;
  for (const level of order) {
    if (maxSeen > 0 && level > maxSeen + 1) return true;
    if (level > maxSeen) maxSeen = level;
  }
  return false;
}

/** Whether `/llms.txt` (or any URL) responds 2xx. */
async function urlExists(url: string): Promise<boolean> {
  try {
    const { response } = await safeFetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function fetchBotAccess(
  pageUrl: string,
  origin: string,
): Promise<GeoSignals["botAccess"]> {
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const { response } = await safeFetch(robotsUrl);
    if (!response.ok) return ALL_ALLOWED;
    const robots = robotsParser(robotsUrl, await readBoundedText(response));
    return {
      // `isAllowed` returns undefined when a UA has no matching group — that is
      // "not disallowed", so treat it as allowed.
      googlebot: robots.isAllowed(pageUrl, "Googlebot") ?? true,
      googleExtended: robots.isAllowed(pageUrl, "Google-Extended") ?? true,
      gptbot: robots.isAllowed(pageUrl, "GPTBot") ?? true,
    };
  } catch {
    return ALL_ALLOWED;
  }
}

export async function extractGeoSignals(
  pageUrl: string,
  page: ParsedPage,
): Promise<GeoSignals> {
  const origin = new URL(pageUrl).origin;
  const [botAccess, llmsTxtFound] = await Promise.all([
    fetchBotAccess(pageUrl, origin),
    urlExists(`${origin}/llms.txt`),
  ]);

  return {
    botAccess,
    schemaTypes: page.schemaTypes,
    hasSingleH1: page.h1s.length === 1,
    hasHeadingHierarchy:
      page.h1s.length >= 1 && !hasHeadingSkip(page.headingOrder),
    robotsMeta: page.robotsMeta,
    llmsTxtFound,
  };
}
