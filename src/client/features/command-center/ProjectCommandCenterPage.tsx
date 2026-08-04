import { useQuery } from "@tanstack/react-query";
import { useIntl, type IntlShape } from "react-intl";
import { RefreshCw } from "lucide-react";
import { getProjectCommandCenter } from "@/serverFunctions/command-center";
import {
  DataHealthCard,
  NextActionCard,
  PriorityQueue,
} from "./CommandCenterCards";
import { SignalCards } from "./CommandCenterSignalCards";
import {
  buildCommandCenterView,
  type AuditProgressView,
} from "./command-center-view-model";

export function ProjectCommandCenterPage({ projectId }: { projectId: string }) {
  const intl = useIntl();
  const query = useQuery({
    queryKey: ["project-command-center", projectId],
    queryFn: () => getProjectCommandCenter({ data: { projectId } }),
    staleTime: 0,
  });

  if (query.isLoading) return <CommandCenterLoadingState />;

  if (query.isError || !query.data) {
    return (
      <main className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
        <div className="mx-auto max-w-7xl">
          <div className="alert alert-error" role="alert">
            <span>{intl.formatMessage({ id: "commandCenter.loadError" })}</span>
            <button className="btn btn-sm" onClick={() => void query.refetch()}>
              {intl.formatMessage({ id: "commandCenter.retry" })}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const { data } = query;
  const view = buildCommandCenterView(data);
  const freshness = auditFreshnessLabel(intl, view.auditProgress);

  return (
    <main className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4" aria-busy={query.isFetching}>
        {/* 1 — Project context and source freshness */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="signal-label">
              {intl.formatMessage({ id: "commandCenter.eyebrow" })}
            </p>
            <h1
              className="mt-1 text-2xl font-semibold text-base-content"
              data-ph-mask
            >
              {data.project.name}
            </h1>
            <p className="mt-1 text-sm text-base-content/70" data-ph-mask>
              {data.project.domain ??
                intl.formatMessage({ id: "commandCenter.noDomain" })}
            </p>
            <p className="signal-meta mt-1">{freshness}</p>
          </div>
          <button
            className="btn btn-ghost min-h-11 sm:btn-sm"
            onClick={() => void query.refetch()}
            aria-label={intl.formatMessage({ id: "commandCenter.refreshAria" })}
          >
            <RefreshCw
              className={`size-4 ${query.isFetching ? "signal-spin" : ""}`}
              aria-hidden="true"
            />
            {intl.formatMessage({ id: "commandCenter.refresh" })}
          </button>
        </header>

        {/* 2 — Evidence-first next action */}
        <NextActionCard
          nextAction={view.nextAction}
          projectId={projectId}
          criticalCount={data.audit.criticalIssueCount}
          highCount={data.audit.highIssueCount}
          onRetry={() => void query.refetch()}
        />

        {/* 3 — Four-cell signal strip */}
        <SignalCards projectId={projectId} view={view} />

        {/* 4 — Data-health rows */}
        <DataHealthCard view={view} projectId={projectId} />

        {/* 5 — Priority workspace */}
        <PriorityQueue issues={view.issues} projectId={projectId} />

        {/* 6 — Provenance disclosure */}
        <section className="signal-panel-inset p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            <p className="signal-label">
              {intl.formatMessage({ id: "commandCenter.provenance.title" })}
            </p>
            <p className="text-sm text-base-content/75">
              {intl.formatMessage({ id: "commandCenter.provenance.body" })}
            </p>
            <p className="signal-meta">
              {view.dataForSeoConfigured
                ? intl.formatMessage({
                    id: "commandCenter.provenance.dataForSeoConfigured",
                  })
                : intl.formatMessage({
                    id: "commandCenter.provenance.dataForSeoNotConfigured",
                  })}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function auditFreshnessLabel(
  intl: IntlShape,
  progress: AuditProgressView,
): string {
  switch (progress.state) {
    case "unavailable":
      return intl.formatMessage({
        id: "commandCenter.freshness.auditUnavailable",
      });
    case "none":
      return intl.formatMessage({ id: "commandCenter.freshness.auditNone" });
    case "queued":
      return intl.formatMessage({
        id: "commandCenter.freshness.auditQueued",
      });
    case "running":
      return intl.formatMessage(
        { id: "commandCenter.freshness.auditRunning" },
        { crawled: progress.pagesCrawled, total: progress.pagesTotal },
      );
    case "failed":
      return intl.formatMessage({
        id: "commandCenter.freshness.auditFailed",
      });
    case "completed":
      return progress.completedAtIso
        ? intl.formatMessage(
            { id: "commandCenter.freshness.auditCompleted" },
            {
              date: intl.formatDate(progress.completedAtIso, {
                dateStyle: "medium",
              }),
            },
          )
        : intl.formatMessage({
            id: "commandCenter.freshness.auditCompletedUnknown",
          });
  }
}

function CommandCenterLoadingState() {
  return (
    <main className="px-4 py-4 md:px-6 md:py-6" aria-busy="true">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="skeleton h-16 w-64" />
        <div className="skeleton h-40 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="skeleton h-36" />
          ))}
        </div>
        <div className="skeleton h-40 w-full" />
      </div>
    </main>
  );
}
