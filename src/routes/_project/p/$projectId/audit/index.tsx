import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getAuditAccess,
  getAuditResults,
  getAuditStatus,
  getCrawlProgress,
} from "@/serverFunctions/audit";
import { auditSearchSchema, type AuditTab } from "@/types/schemas/audit";
import type { IssueFilters } from "@/client/features/audit/issues/issue-filters";
import { LaunchView } from "@/client/features/audit/launch/LaunchView";
import { ResultsView } from "@/client/features/audit/results/ResultsView";
import { RecrawlVerifyButton } from "@/client/features/audit/verification/RecrawlVerifyButton";
import { VerificationOutcomeBanner } from "@/client/features/audit/verification/VerificationOutcomeBanner";
import { IndexNowCard } from "@/client/features/audit/indexnow/IndexNowCard";
import { GoogleIndexStatusCard } from "@/client/features/audit/indexing/GoogleIndexStatusCard";
import {
  buildCrawlEta,
  extractHostname,
  extractPathname,
  formatStartedAt,
  HttpStatusBadge,
  StatusBadge,
} from "@/client/features/audit/shared";

export const Route = createFileRoute<"/_project/p/$projectId/audit/">(
  "/_project/p/$projectId/audit/",
)({
  validateSearch: auditSearchSchema,
  component: SiteAuditPage,
});

function SiteAuditPage() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const { auditId, tab } = search;
  const navigate = useNavigate({ from: Route.fullPath });

  // Widened from string-only: the All Issues tab pages server-side, so a
  // numeric page has to survive the round trip through the URL.
  const setSearchParams = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      void navigate({
        search: (prev) => ({ ...prev, ...updates }),
        replace: true,
      });
    },
    [navigate],
  );

  const issueFilters: IssueFilters = {
    group: search.issueGroup,
    severity: search.issueSeverity,
  };

  if (!auditId) {
    return (
      <LaunchView
        projectId={projectId}
        onAuditStarted={(id) => setSearchParams({ auditId: id })}
      />
    );
  }

  return (
    <AuditDetail
      projectId={projectId}
      auditId={auditId}
      tab={tab}
      issueFilters={issueFilters}
      onIssueFiltersChange={(next) =>
        setSearchParams({
          issueGroup: next.group,
          issueSeverity: next.severity,
        })
      }
      onBack={() => setSearchParams({ auditId: undefined })}
      onTabChange={(nextTab) => setSearchParams({ tab: nextTab })}
      onOpenAudit={(id) => setSearchParams({ auditId: id, tab: undefined })}
    />
  );
}

function AuditDetail({
  projectId,
  auditId,
  tab,
  issueFilters,
  onIssueFiltersChange,
  onBack,
  onTabChange,
  onOpenAudit,
}: {
  projectId: string;
  auditId: string;
  tab: string;
  issueFilters: IssueFilters;
  onIssueFiltersChange: (filters: Partial<IssueFilters>) => void;
  onBack: () => void;
  onTabChange: (tab: AuditTab) => void;
  onOpenAudit: (auditId: string) => void;
}) {
  const statusQuery = useQuery({
    queryKey: ["audit-status", projectId, auditId],
    queryFn: () => getAuditStatus({ data: { projectId, auditId } }),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "running" ? 3000 : false;
    },
  });

  const isComplete = statusQuery.data?.status === "completed";
  const isFailed = statusQuery.data?.status === "failed";
  const isRunning = statusQuery.data?.status === "running";

  const resultsQuery = useQuery({
    queryKey: ["audit-results", projectId, auditId],
    queryFn: () => getAuditResults({ data: { projectId, auditId } }),
    enabled: isComplete,
  });

  const accessQuery = useQuery({
    queryKey: ["audit-access", projectId],
    queryFn: () => getAuditAccess({ data: { projectId } }),
  });

  if (statusQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (statusQuery.isError) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="alert alert-error">
            <AlertCircle className="size-5" />
            <span>We could not load this audit. It may have been deleted.</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            &larr; Back to audits
          </button>
        </div>
      </div>
    );
  }

  const status = statusQuery.data;
  const showSupportCta =
    isFailed || (isComplete && status && status.pagesCrawled <= 1);

  return (
    <div className="px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-8 overflow-auto">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="space-y-1">
          <button className="btn btn-ghost btn-sm px-0" onClick={onBack}>
            &larr; All audits
          </button>
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold">Site Audit</h1>
            <div className="flex items-center gap-2">
              {resultsQuery.data?.audit && (
                <RecrawlVerifyButton
                  projectId={projectId}
                  baselineAuditId={resultsQuery.data.audit.id}
                  startUrl={resultsQuery.data.audit.startUrl}
                  config={resultsQuery.data.audit.config}
                  onStarted={onOpenAudit}
                />
              )}
              {status?.status !== "running" && status && (
                <StatusBadge status={status.status} />
              )}
            </div>
          </div>
          {status && (
            <p className="text-sm text-base-content/70">
              {extractHostname(status.startUrl)} &middot; Started{" "}
              {formatStartedAt(status.startedAt)}
            </p>
          )}
        </div>

        {isRunning && status && (
          <ProgressCard
            projectId={projectId}
            auditId={auditId}
            status={status}
          />
        )}

        {showSupportCta && (
          <div
            className={isFailed ? "alert alert-error" : "alert alert-warning"}
          >
            <AlertCircle className="size-5" />
            <div className="space-y-1">
              <p className="font-medium">
                Site audit couldn't fully crawl this website.
              </p>
              <p>
                This is often caused by anti-bot or firewall settings. Reach out
                via our{" "}
                <Link className="link link-primary" to="/support">
                  support page
                </Link>{" "}
                and we'll help configure auditing for your site.
              </p>
            </div>
          </div>
        )}

        {isComplete && resultsQuery.data && (
          <>
            {resultsQuery.data.audit.baselineAuditId && (
              <VerificationOutcomeBanner
                projectId={projectId}
                auditId={auditId}
              />
            )}
            <ResultsView
              projectId={projectId}
              data={resultsQuery.data}
              tab={tab}
              onTabChange={onTabChange}
              issueFilters={issueFilters}
              onIssueFiltersChange={onIssueFiltersChange}
            />
            <GoogleIndexStatusCard
              projectId={projectId}
              auditId={auditId}
              canInspect={accessQuery.data?.canLaunch ?? false}
            />
            {accessQuery.data?.canManage && (
              <IndexNowCard projectId={projectId} auditId={auditId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProgressCard({
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
  const crawlProgress =
    status.pagesTotal > 0
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

  const crawlProgressQuery = useQuery({
    queryKey: ["audit-crawl-progress", projectId, auditId],
    queryFn: () => getCrawlProgress({ data: { projectId, auditId } }),
    refetchInterval: 1500,
  });

  const crawledUrls = crawlProgressQuery.data ?? [];

  return (
    <div className="space-y-3">
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" />
              {isLighthousePhase
                ? "Running Lighthouse checks"
                : "Crawling pages"}
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
            ) : (
              <span>
                {status.pagesCrawled} / {status.pagesTotal} pages
              </span>
            )}
            <span className="text-base-content/60">{progress}%</span>
          </div>

          {etaLabel && (
            <p className="text-xs text-base-content/50">{etaLabel}</p>
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
