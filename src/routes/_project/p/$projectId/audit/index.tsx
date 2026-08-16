import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAuditAccess,
  getAuditResults,
  getAuditStatus,
} from "@/serverFunctions/audit";
import { auditSearchSchema, type AuditTab } from "@/types/schemas/audit";
import type { IssueFilters } from "@/client/features/audit/issues/issue-filters";
import { LaunchView } from "@/client/features/audit/launch/LaunchView";
import { ResultsView } from "@/client/features/audit/results/ResultsView";
import { RecrawlVerifyButton } from "@/client/features/audit/verification/RecrawlVerifyButton";
import { VerificationOutcomeBanner } from "@/client/features/audit/verification/VerificationOutcomeBanner";
import { IndexNowCard } from "@/client/features/audit/indexnow/IndexNowCard";
import { PeriodicReportCard } from "@/client/features/audit/reports/PeriodicReportCard";
import { GoogleIndexStatusCard } from "@/client/features/audit/indexing/GoogleIndexStatusCard";
import { CompetitorsCard } from "@/client/features/audit/competitors/CompetitorsCard";
import { ComparisonTable } from "@/client/features/audit/competitors/ComparisonTable";
import {
  extractHostname,
  formatStartedAt,
  StatusBadge,
} from "@/client/features/audit/shared";
import { CrawlProgressCard } from "@/client/features/audit/progress/CrawlProgressCard";

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

  // This page polls; the audits table does not refetch on mount inside its
  // 5-minute staleTime. Without this, walking back from a finished audit showed
  // it as still running.
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isRunning) return;
    void queryClient.invalidateQueries({
      queryKey: ["audit-history", projectId],
    });
  }, [isRunning, projectId, queryClient]);

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
  // A thin crawl and a crashed crawl are different events with different fixes,
  // and the old single banner asserted "anti-bot or firewall" for both — at a site
  // whose only problem was our own 1 MiB step-output limit.
  const thinCrawl =
    isComplete && status !== undefined && status.pagesCrawled <= 1;

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
          <CrawlProgressCard
            projectId={projectId}
            auditId={auditId}
            status={status}
          />
        )}

        {isFailed && (
          <div className="alert alert-error">
            <AlertCircle className="size-5" />
            <div className="space-y-1">
              <p className="font-medium">
                This audit stopped before it finished.
              </p>
              {status?.errorMessage ? (
                <p>
                  It reported:{" "}
                  <code className="text-xs break-all">
                    {status.errorMessage}
                  </code>
                </p>
              ) : (
                <p>No reason was recorded for this run.</p>
              )}
              <p>
                Start it again, and if it stops the same way tell us on the{" "}
                <Link className="link link-primary" to="/support">
                  support page
                </Link>{" "}
                with the message above.
              </p>
            </div>
          </div>
        )}

        {thinCrawl && (
          <div className="alert alert-warning">
            <AlertCircle className="size-5" />
            <div className="space-y-1">
              <p className="font-medium">
                {status.pagesCrawled === 0
                  ? "No page could be read on this site."
                  : "Only the first page could be read."}
              </p>
              <p>
                Either the site turns automated clients away, or the start URL
                links to nothing else we are allowed to follow. Check that{" "}
                <code className="text-xs">
                  {extractHostname(status.startUrl)}/robots.txt
                </code>{" "}
                permits crawling, then try again — the{" "}
                <Link className="link link-primary" to="/support">
                  support page
                </Link>{" "}
                can help if it persists.
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
              <CompetitorsCard projectId={projectId} auditId={auditId} />
            )}
            <ComparisonTable
              projectId={projectId}
              auditId={auditId}
              canManage={accessQuery.data?.canManage ?? false}
            />
            {accessQuery.data?.canManage && (
              <IndexNowCard projectId={projectId} auditId={auditId} />
            )}
            {accessQuery.data?.canManage && (
              <PeriodicReportCard projectId={projectId} auditId={auditId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
