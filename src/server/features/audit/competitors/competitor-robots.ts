/**
 * How we read a third party's robots.txt.
 *
 * The audit's own reader is permissive when robots.txt cannot be had, which is
 * right for the site the operator asked us to crawl: they told us to, and a
 * transient 502 on their CDN should not abandon the crawl they paid for.
 *
 * A competitor never asked us for anything, so the same ambiguity resolves the
 * other way. RFC 9309 already draws the line, and it is not the line
 * `fetchRobotsTxtBody` alone can express:
 *
 *   4xx  — robots.txt is *unavailable*. There are no rules, so nothing is
 *          disallowed. This is the normal state of most small sites and
 *          refusing here would refuse most of the web.
 *   5xx  — robots.txt is *unreachable*. The spec says assume complete
 *          disallow: rules may exist and we cannot read them.
 *   none — no response at all (timeout, DNS, connection reset). Same as 5xx.
 *
 * So the inversion is narrow and principled rather than blanket caution: we
 * refuse exactly when the site might be forbidding us and we cannot tell.
 */
import {
  fetchRobotsTxtBody,
  parseRobotsTxt,
  type RobotsResult,
} from "@/server/lib/audit/discovery";

type CompetitorRobots = { allowed: RobotsResult } | { refused: string };

export async function readCompetitorRobots(
  origin: string,
): Promise<CompetitorRobots> {
  const body = await fetchRobotsTxtBody(origin);

  if (body.text === null && (body.status === null || body.status >= 500)) {
    return {
      refused:
        body.status === null
          ? "Could not reach their robots.txt, so we did not crawl. Rules may exist that we cannot read."
          : `Their robots.txt returned ${body.status}, so we did not crawl. Rules may exist that we cannot read.`,
    };
  }

  return { allowed: parseRobotsTxt(body) };
}
