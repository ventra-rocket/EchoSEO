/**
 * The live face of a background crawl.
 *
 * Extracted from the audit route because it is the part that has to stay honest
 * while nothing else on the page can: the D1 row alone cannot distinguish
 * "reading a 41,505-URL sitemap" from "hung", and `pagesTotal` is the requested
 * ceiling until discovery replaces it, so a twelve-page site reported `0 / 5000`.
 * It reads the KV progress feed, which carries crawl outcomes INCLUDING failures
 * — a run 404ing its way through a site is working, and only the user can judge
 * whether the result will be worth having.
 */
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { getCrawlProgress } from "@/serverFunctions/audit";
import {
  buildCrawlEta,
  extractPathname,
  HttpStatusBadge,
} from "@/client/features/audit/shared";

export function CrawlProgressCard({
  projectId,
  auditId,
  status,
}: {
  projectId: string;
  auditId: string;
  status: {
    pagesCrawled: number;
    pagesTotal: number;
    lighthouseTotal: number;
    lighthouseCompleted: number;
    lighthouseFailed: number;
    currentPhase: string | null;
    startedAt: string;
  };
}) {
  const intl = useIntl();
  const crawlProgressQuery = useQuery({
    queryKey: ["audit-crawl-progress", projectId, auditId],
    queryFn: () => getCrawlProgress({ data: { projectId, auditId } }),
    refetchInterval: 1500,
  });

  const crawledUrls = crawlProgressQuery.data?.entries ?? [];
  const phase = crawlProgressQuery.data?.phase ?? null;
  // `pagesTotal` is `maxPages` until discovery replaces it, so before then
  // "0 / 5000" is a promise about the request, not a measurement of the site.
  const totalIsMeasured =
    status.currentPhase !== "discovery" && phase?.stage !== "discovering";

  const crawlProgress =
    totalIsMeasured && status.pagesTotal > 0
      ? Math.round((status.pagesCrawled / status.pagesTotal) * 100)
      : 0;
  const lighthouseDone = status.lighthouseCompleted + status.lighthouseFailed;
  const lighthouseProgress =
    status.lighthouseTotal > 0
      ? Math.round((lighthouseDone / status.lighthouseTotal) * 100)
      : 0;
  const isLighthousePhase = status.currentPhase === "lighthouse";
  const phaseLabel =
    status.currentPhase === "discovery"
      ? intl.formatMessage({ id: "audit.progress.phase.discovery" })
      : status.currentPhase === "crawling"
        ? intl.formatMessage({ id: "audit.progress.phase.crawling" })
        : status.currentPhase === "lighthouse"
          ? intl.formatMessage({ id: "audit.progress.phase.lighthouse" })
          : status.currentPhase === "finalizing"
            ? intl.formatMessage({ id: "audit.progress.phase.finalizing" })
            : (status.currentPhase ??
              intl.formatMessage({ id: "audit.progress.phase.running" }));
  const progress = isLighthousePhase ? lighthouseProgress : crawlProgress;
  const eta = buildCrawlEta(status);
  const heading = isLighthousePhase
    ? intl.formatMessage({ id: "audit.progress.heading.lighthouse" })
    : totalIsMeasured
      ? intl.formatMessage({ id: "audit.progress.heading.crawling" })
      : intl.formatMessage({ id: "audit.progress.heading.discovery" });

  return (
    <div className="space-y-3">
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" />
              {heading}
            </h2>
            <span className="badge badge-ghost badge-sm">{phaseLabel}</span>
          </div>

          <progress
            className="progress progress-primary w-full"
            value={progress}
            max={100}
          />

          <div className="flex items-center justify-between text-sm">
            {isLighthousePhase ? (
              <span>
                {intl.formatMessage(
                  { id: "audit.progress.lighthouseCount" },
                  { done: lighthouseDone, total: status.lighthouseTotal },
                )}
                {status.lighthouseFailed > 0
                  ? intl.formatMessage(
                      { id: "audit.progress.lighthouseFailedSuffix" },
                      { failed: status.lighthouseFailed },
                    )
                  : ""}
              </span>
            ) : totalIsMeasured ? (
              <span>
                {intl.formatMessage(
                  { id: "audit.progress.pagesCount" },
                  { crawled: status.pagesCrawled, total: status.pagesTotal },
                )}
              </span>
            ) : (
              <span>
                {phase?.discoveredUrls === undefined
                  ? intl.formatMessage({
                      id: "audit.progress.discovery.readingSitemaps",
                    })
                  : intl.formatMessage(
                      { id: "audit.progress.discovery.summary" },
                      {
                        urlCount: phase.discoveredUrls,
                        docCount: phase.sitemapDocsFetched ?? 0,
                      },
                    )}
              </span>
            )}
            <span className="text-base-content/60">{progress}%</span>
          </div>

          {eta && (
            <p className="text-xs text-base-content/50">
              {eta.kind === "estimating"
                ? intl.formatMessage({ id: "audit.progress.eta.estimating" })
                : eta.kind === "eta"
                  ? intl.formatMessage(
                      { id: "audit.progress.eta.minutes" },
                      { minutes: eta.minutes },
                    )
                  : intl.formatMessage(
                      { id: "audit.progress.eta.seconds" },
                      { seconds: eta.seconds },
                    )}
            </p>
          )}

          {phase?.queued !== undefined && phase.visited !== undefined && (
            // The number that separates a slow crawl from a stalled one.
            <p className="text-xs text-base-content/50">
              {intl.formatMessage(
                { id: "audit.progress.queueStatus" },
                {
                  queued: intl.formatNumber(phase.queued),
                  visited: intl.formatNumber(phase.visited),
                },
              )}
            </p>
          )}

          {phase?.offeredRate !== undefined && (
            // The numbers are for anyone watching, not just the workflow
            // trace: the rate the crawl settled at, and how hard the site
            // pushed back to get there. See issue #88.
            <p className="text-xs text-base-content/50">
              {intl.formatMessage(
                { id: "audit.progress.crawlRate" },
                {
                  rate: intl.formatNumber(phase.offeredRate, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }),
                },
              )}
              {phase.refusedRequests
                ? intl.formatMessage(
                    { id: "audit.progress.refusedRequestsSuffix" },
                    { count: phase.refusedRequests },
                  )
                : ""}
            </p>
          )}
        </div>
      </div>

      {crawledUrls.length > 0 && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-2 p-4">
            <h3 className="text-sm font-medium text-base-content/70">
              {intl.formatMessage(
                { id: "audit.progress.crawledPagesHeading" },
                { count: crawledUrls.length },
              )}
            </h3>
            <p className="text-xs text-base-content/50">
              {intl.formatMessage(
                { id: "audit.progress.updated" },
                {
                  time: intl.formatDate(crawledUrls[0].crawledAt, {
                    timeStyle: "short",
                  }),
                },
              )}
            </p>
            <div className="max-h-[400px] overflow-y-auto -mx-1">
              {crawledUrls.map((entry, i) => (
                <ProgressRow
                  key={`${entry.url}-${entry.crawledAt}`}
                  entry={entry}
                  index={i}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressRow({
  entry,
  index,
}: {
  entry: {
    url: string;
    statusCode: number | null;
    title: string | null;
    crawledAt: number;
  };
  index: number;
}) {
  const pathname = extractPathname(entry.url);

  return (
    <div
      className={`flex items-center justify-between gap-3 px-2 py-1.5 rounded text-sm ${
        index === 0
          ? "bg-primary/5 animate-in fade-in slide-in-from-top-1 duration-300"
          : ""
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <HttpStatusBadge code={entry.statusCode} />
        <span className="truncate text-base-content/80" title={entry.url}>
          {pathname}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {entry.title && (
          <span
            className="text-xs text-base-content/40 truncate max-w-[260px] hidden md:block"
            title={entry.title}
          >
            {entry.title}
          </span>
        )}
      </div>
    </div>
  );
}
