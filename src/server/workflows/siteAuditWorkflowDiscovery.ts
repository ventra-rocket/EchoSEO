/**
 * The audit's discovery phase: read robots.txt's sitemaps, resolve them to page
 * URLs, and hand the crawl a measured total instead of the requested ceiling.
 *
 * Its own module for the same reason the crawl phase is: it owns a storage
 * decision the rest of the phases file should not have to explain. The URL set is
 * far too large to be a step's return value — outputs are capped at 1 MiB, and one
 * real site produced 41,505 URLs, which failed this step six times and killed the
 * audit before a single page was fetched while the UI blamed the site's firewall.
 * R2 carries the payload; the step boundary carries a count.
 */
import { discoverUrls } from "@/server/lib/audit/discovery";
import { putDiscoveredUrls } from "@/server/lib/audit/discovered-urls-store";
import { AuditProgressKV } from "@/server/lib/audit/progress-kv";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";

/**
 * The slice of `WorkflowStep` this phase uses, so a test can pass a plain fake —
 * the same shape `siteAuditWorkflowCrawl.ts` accepts.
 */
interface DiscoveryStep {
  do<T>(name: string, callback: () => Promise<T> | T): Promise<T>;
}

export async function runDiscoveryPhase(
  step: DiscoveryStep,
  params: {
    auditId: string;
    workflowInstanceId: string;
    origin: string;
    maxPages: number;
  },
): Promise<{ discoveredCount: number }> {
  const { auditId, workflowInstanceId, origin, maxPages } = params;

  return step.do("discover-urls", async () => {
    // Published before the fetches, not after: on a large site this step runs for
    // tens of seconds, and that silence is the window where a user cannot tell a
    // working crawl from a hung one.
    await AuditProgressKV.setPhase(auditId, { stage: "discovering" });

    const result = await discoverUrls(origin, maxPages);
    await putDiscoveredUrls(auditId, result.urls);

    await AuditProgressKV.setPhase(auditId, {
      stage: "discovering",
      sitemapDocsFetched: result.stats.docsFetched,
      sitemapDocsFailed: result.stats.docsFailed,
      discoveredUrls: result.urls.length,
    });
    // `pagesTotal` was the requested ceiling until now. Replacing it here is what
    // turns "0 / 5000" into a real fraction for a site with twelve pages.
    await AuditRepository.updateAuditProgress(auditId, workflowInstanceId, {
      pagesTotal: Math.min(result.urls.length + 1, maxPages),
      currentPhase: "crawling",
    });

    return { discoveredCount: result.urls.length };
  });
}
