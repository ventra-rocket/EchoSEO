import { Link } from "@tanstack/react-router";
import { Activity, CheckCircle2, CircleAlert, Database } from "lucide-react";
import type { CommandCenterAction } from "@/shared/command-center";

export type CommandCenterData = {
  readiness: {
    dataForSeoConfigured: boolean;
    gsc: {
      connected: boolean;
      currentUserHasGrant: boolean;
      googleOAuthConfigured: boolean;
      siteUrl: string | null;
    } | null;
  };
  audit: {
    latest: {
      id: string;
      status: string;
      pagesCrawled: number;
      pagesTotal: number;
      completedAt: string | null;
    } | null;
    latestCompleted: {
      id: string;
      status: string;
      pagesCrawled: number;
      pagesTotal: number;
      completedAt: string | null;
    } | null;
    criticalIssueCount: number;
    highIssueCount: number;
    issuesMaterializedAt: string | null;
  };
  rankTracking: Array<{
    id: string;
    domain: string;
    keywordCount: number;
    lastRunStatus: string | null;
    lastRunCompletedAt: string | null;
  }>;
  sources: {
    gscError: string | null;
    auditError: string | null;
    rankTrackingError: string | null;
    issueError: string | null;
  };
  nextActions: CommandCenterAction[];
};

export function NextActionCard({
  projectId,
  actions,
}: {
  projectId: string;
  actions: CommandCenterAction[];
}) {
  const [primary, ...secondary] = actions;

  if (!primary) {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-3">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            <h2 className="font-semibold text-base-content">
              Foundation complete
            </h2>
          </div>
          <p className="text-sm text-base-content/70">
            Your core project signals are connected. Use the evidence below to
            choose the next SEO task.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-center gap-2 text-primary">
          <Activity className="size-5" aria-hidden="true" />
          <p className="text-sm font-medium uppercase tracking-wide">
            Next action
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-base-content">
            {primary.title}
          </h2>
          <p className="mt-1 text-sm text-base-content/70">
            {primary.description}
          </p>
        </div>
        <ActionLink action={primary} projectId={projectId} primary />
        {secondary.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {secondary.map((action) => (
              <ActionLink
                key={action.id}
                action={action}
                projectId={projectId}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function DataHealthCard({
  projectId,
  data,
}: {
  projectId: string;
  data: CommandCenterData;
}) {
  const gsc = data.readiness.gsc;
  const audit = data.audit.latest;
  const rankKeywordCount = data.rankTracking.reduce(
    (total, tracker) => total + tracker.keywordCount,
    0,
  );

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-center gap-2">
          <Database
            className="size-5 text-base-content/70"
            aria-hidden="true"
          />
          <h2 className="font-semibold">Data health</h2>
        </div>
        <HealthRow
          label="Search Console"
          value={
            data.sources.gscError
              ? "Unavailable"
              : gsc?.connected
                ? "Connected"
                : "Not connected"
          }
          ok={Boolean(gsc?.connected)}
          to="/p/$projectId/search-performance"
          projectId={projectId}
        />
        <HealthRow
          label="Site audit"
          value={
            data.sources.auditError
              ? "Unavailable"
              : audit
                ? `${audit.status} · ${audit.pagesCrawled}/${audit.pagesTotal} pages`
                : "No audit yet"
          }
          ok={audit?.status === "completed"}
          to="/p/$projectId/audit"
          projectId={projectId}
        />
        <HealthRow
          label="Rank tracking"
          value={
            data.sources.rankTrackingError
              ? "Unavailable"
              : data.rankTracking.length > 0
                ? `${rankKeywordCount} keywords across ${data.rankTracking.length} tracker${data.rankTracking.length === 1 ? "" : "s"}`
                : "Not configured"
          }
          ok={data.rankTracking.length > 0}
          to="/p/$projectId/rank-tracking"
          projectId={projectId}
        />
      </div>
    </section>
  );
}

export function PriorityQueue({
  projectId,
  data,
}: {
  projectId: string;
  data: CommandCenterData;
}) {
  const audit = data.audit.latestCompleted;
  const hasAuditPriority =
    audit?.status === "completed" &&
    data.audit.issuesMaterializedAt &&
    data.audit.criticalIssueCount + data.audit.highIssueCount > 0;

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">
              Priority queue
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Evidence before action
            </h2>
          </div>
          <Link
            to="/p/$projectId/audit"
            params={{ projectId }}
            className="btn btn-ghost btn-sm"
          >
            Open audit
          </Link>
        </div>
        {data.sources.auditError ? (
          <div className="alert alert-error text-sm" role="alert">
            <CircleAlert className="size-5" aria-hidden="true" />
            <span>
              Audit data is temporarily unavailable. Retry the page to refresh
              it.
            </span>
          </div>
        ) : hasAuditPriority ? (
          <div className="space-y-3">
            <PriorityRow
              label="Critical issue groups"
              value={data.audit.criticalIssueCount}
              tone="error"
            />
            <PriorityRow
              label="High-priority issue groups"
              value={data.audit.highIssueCount}
              tone="warning"
            />
            <p className="text-xs text-base-content/60">
              Source: completed crawl. Open the audit to inspect affected URLs
              and remediation guidance.
            </p>
          </div>
        ) : (
          <p className="text-sm text-base-content/70">
            {audit?.status === "completed"
              ? "Issues are still being materialized. EchoSEO will not present a clean result until that analysis is complete."
              : "Run a site audit to create evidence-backed priorities for this project."}
          </p>
        )}
      </div>
    </section>
  );
}

function PriorityRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "error" | "warning";
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-base-300 px-3 py-2">
      <span className="text-sm text-base-content/75">{label}</span>
      <span className={`badge badge-${tone} tabular-nums`}>{value}</span>
    </div>
  );
}

function HealthRow({
  label,
  value,
  ok,
  to,
  projectId,
}: {
  label: string;
  value: string;
  ok: boolean;
  to:
    | "/p/$projectId/search-performance"
    | "/p/$projectId/audit"
    | "/p/$projectId/rank-tracking";
  projectId: string;
}) {
  return (
    <Link
      to={to}
      params={{ projectId }}
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 -mx-2 hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="text-sm text-base-content/70">{label}</span>
      <span className={`badge ${ok ? "badge-success" : "badge-ghost"}`}>
        {value}
      </span>
    </Link>
  );
}

function ActionLink({
  action,
  projectId,
  primary = false,
}: {
  action: CommandCenterAction;
  projectId: string;
  primary?: boolean;
}) {
  const className = primary
    ? "btn btn-primary min-h-11 w-full sm:w-fit"
    : "link link-hover text-sm";
  const label = primary ? action.title : action.title;

  switch (action.target) {
    case "settings":
      return (
        <Link
          to="/p/$projectId/settings"
          params={{ projectId }}
          className={className}
        >
          {label}
        </Link>
      );
    case "search-performance":
      return (
        <Link
          to="/p/$projectId/search-performance"
          params={{ projectId }}
          className={className}
        >
          {label}
        </Link>
      );
    case "audit":
      return (
        <Link
          to="/p/$projectId/audit"
          params={{ projectId }}
          className={className}
        >
          {label}
        </Link>
      );
    case "rank-tracking":
      return (
        <Link
          to="/p/$projectId/rank-tracking"
          params={{ projectId }}
          className={className}
        >
          {label}
        </Link>
      );
  }
}
