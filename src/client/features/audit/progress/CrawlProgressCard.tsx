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
      ? "Discovery"
      : status.currentPhase === "crawling"
        ? "Crawling"
        : status.currentPhase === "lighthouse"
          ? "Lighthouse"
          : status.currentPhase === "finalizing"
            ? "Finalizing"
            : (status.currentPhase ?? "Running");
  const progress = isLighthousePhase ? lighthouseProgress : crawlProgress;
  const etaLabel = buildCrawlEta(status);
  const heading = isLighthousePhase
    ? "Running Lighthouse checks"
    : totalIsMeasured
      ? "Crawling pages"
      : "Reading sitemaps";

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
                {lighthouseDone} / {status.lighthouseTotal} checks
                {status.lighthouseFailed > 0
                  ? ` (${status.lighthouseFailed} failed)`
                  : ""}
              </span>
            ) : totalIsMeasured ? (
              <span>
                {status.pagesCrawled} / {status.pagesTotal} pages
              </span>
            ) : (
              <span>
                {phase?.discoveredUrls === undefined
                  ? "Reading robots.txt and sitemaps"
                  : `${phase.discoveredUrls.toLocaleString()} URL${phase.discoveredUrls === 1 ? "" : "s"} found in ${(phase.sitemapDocsFetched ?? 0).toLocaleString()} sitemap document${phase.sitemapDocsFetched === 1 ? "" : "s"}`}
              </span>
            )}
            <span className="text-base-content/60">{progress}%</span>
          </div>

          {etaLabel && (
            <p className="text-xs text-base-content/50">{etaLabel}</p>
          )}

          {phase?.queued !== undefined && phase.visited !== undefined && (
            // The number that separates a slow crawl from a stalled one.
            <p className="text-xs text-base-content/50">
              {phase.queued.toLocaleString()} queued ·{" "}
              {phase.visited.toLocaleString()} visited
            </p>
          )}
        </div>
      </div>

      {crawledUrls.length > 0 && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-2 p-4">
            <h3 className="text-sm font-medium text-base-content/70">
              Crawled Pages ({crawledUrls.length})
            </h3>
            <p className="text-xs text-base-content/50">
              Updated {new Date(crawledUrls[0].crawledAt).toLocaleTimeString()}
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
