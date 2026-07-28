import { Link } from "@tanstack/react-router";
import {
  Bot,
  CircleAlert,
  SearchCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { CommandCenterData } from "./CommandCenterCards";

export function SignalCards({
  projectId,
  data,
}: {
  projectId: string;
  data: CommandCenterData;
}) {
  const audit = data.audit.latest;
  const completedAudit = data.audit.latestCompleted;
  const priorityIssueCount =
    data.audit.criticalIssueCount + data.audit.highIssueCount;
  const rankKeywordCount = data.rankTracking.reduce(
    (total, tracker) => total + tracker.keywordCount,
    0,
  );

  return (
    <section
      aria-label="Project signals"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <SignalCard
        icon={SearchCheck}
        label="Audit evidence"
        value={
          data.sources.auditError
            ? "Unavailable"
            : audit
              ? `${audit.pagesCrawled}/${audit.pagesTotal} pages`
              : "No audit yet"
        }
        detail={
          audit?.completedAt
            ? `Completed ${formatDate(audit.completedAt)}`
            : "Source: site crawl"
        }
        to="/p/$projectId/audit"
        projectId={projectId}
      />
      <SignalCard
        icon={CircleAlert}
        label="Priority issues"
        value={
          !completedAudit
            ? "Waiting for audit"
            : data.sources.issueError || !data.audit.issuesMaterializedAt
              ? "Still analyzing"
              : `${priorityIssueCount} issue groups`
        }
        detail="Source: site audit"
        to="/p/$projectId/audit"
        projectId={projectId}
      />
      <SignalCard
        icon={TrendingUp}
        label="Tracked keywords"
        value={
          data.sources.rankTrackingError
            ? "Unavailable"
            : data.rankTracking.length > 0
              ? String(rankKeywordCount)
              : "Not configured"
        }
        detail="Source: rank tracking"
        to="/p/$projectId/rank-tracking"
        projectId={projectId}
      />
      <SignalCard
        icon={Bot}
        label="AI workspace"
        value="Assisted workflows"
        detail="Read-only planning and analysis"
        to="/p/$projectId/assistant"
        projectId={projectId}
      />
    </section>
  );
}

function SignalCard({
  icon: Icon,
  label,
  value,
  detail,
  to,
  projectId,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  to:
    | "/p/$projectId/audit"
    | "/p/$projectId/rank-tracking"
    | "/p/$projectId/assistant";
  projectId: string;
}) {
  return (
    <Link
      to={to}
      params={{ projectId }}
      className="card min-h-36 border border-base-300 bg-base-100 shadow-sm transition-colors hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="card-body gap-2 p-4">
        <Icon className="size-5 text-base-content/60" aria-hidden="true" />
        <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
          {label}
        </p>
        <p className="font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-base-content/60">{detail}</p>
      </div>
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
