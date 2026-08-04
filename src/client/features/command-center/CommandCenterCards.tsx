import { Link } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Database,
} from "lucide-react";
import type {
  CommandCenterView,
  IssuesView,
  NextActionView,
} from "./command-center-view-model";
import { ACTION_MESSAGE_IDS, ActionLink } from "./CommandCenterActionLink";

export function NextActionCard({
  nextAction,
  projectId,
  criticalCount,
  highCount,
  onRetry,
}: {
  nextAction: NextActionView;
  projectId: string;
  criticalCount: number;
  highCount: number;
  onRetry: () => void;
}) {
  const intl = useIntl();

  if (nextAction.state === "complete") {
    return (
      <section className="signal-panel p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            <h2 className="font-semibold text-base-content">
              {intl.formatMessage({
                id: "commandCenter.nextAction.completeTitle",
              })}
            </h2>
          </div>
          <p className="text-sm text-base-content/70">
            {intl.formatMessage({
              id: "commandCenter.nextAction.completeBody",
            })}
          </p>
        </div>
      </section>
    );
  }

  if (nextAction.state === "incomplete") {
    return (
      <section className="signal-panel p-4 sm:p-5" role="status">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="size-5" aria-hidden="true" />
            <h2 className="font-semibold text-base-content">
              {intl.formatMessage({
                id: "commandCenter.nextAction.incompleteTitle",
              })}
            </h2>
          </div>
          <p className="text-sm text-base-content/70">
            {intl.formatMessage({
              id: "commandCenter.nextAction.incompleteBody",
            })}
          </p>
          <button
            type="button"
            className="btn btn-sm btn-ghost w-fit"
            onClick={onRetry}
          >
            {intl.formatMessage({ id: "commandCenter.retry" })}
          </button>
        </div>
      </section>
    );
  }

  const { primary, secondary } = nextAction;
  const titleValues = { critical: criticalCount, high: highCount };

  return (
    <section className="signal-panel p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-primary">
          <Activity className="size-5" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {intl.formatMessage({ id: "commandCenter.nextAction.eyebrow" })}
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-base-content">
            {intl.formatMessage({ id: ACTION_MESSAGE_IDS[primary.id].title })}
          </h2>
          <p className="mt-1 text-sm text-base-content/70">
            {intl.formatMessage(
              { id: ACTION_MESSAGE_IDS[primary.id].body },
              titleValues,
            )}
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
  view,
  projectId,
}: {
  view: CommandCenterView;
  projectId: string;
}) {
  const intl = useIntl();

  const gscValue =
    view.gsc.state === "unavailable"
      ? intl.formatMessage({ id: "commandCenter.value.unavailable" })
      : view.gsc.state === "connected"
        ? intl.formatMessage({ id: "commandCenter.health.connected" })
        : intl.formatMessage({ id: "commandCenter.health.notConnected" });

  const auditValue = (() => {
    const progress = view.auditProgress;
    switch (progress.state) {
      case "unavailable":
        return intl.formatMessage({ id: "commandCenter.value.unavailable" });
      case "none":
        return intl.formatMessage({ id: "commandCenter.value.noAudit" });
      case "queued":
        return intl.formatMessage({ id: "commandCenter.health.auditQueued" });
      case "completed":
        return intl.formatMessage(
          { id: "commandCenter.health.auditCompleted" },
          { crawled: progress.pagesCrawled, total: progress.pagesTotal },
        );
      case "running":
        return intl.formatMessage(
          { id: "commandCenter.health.auditRunning" },
          { crawled: progress.pagesCrawled, total: progress.pagesTotal },
        );
      case "failed":
        return intl.formatMessage(
          { id: "commandCenter.health.auditFailed" },
          { crawled: progress.pagesCrawled, total: progress.pagesTotal },
        );
    }
  })();

  const rankValue = (() => {
    const rank = view.rank;
    if (rank.state === "unavailable") {
      return intl.formatMessage({ id: "commandCenter.value.unavailable" });
    }
    if (rank.state === "not-configured") {
      return intl.formatMessage({ id: "commandCenter.value.notConfigured" });
    }
    return intl.formatMessage(
      { id: "commandCenter.health.rankSummary" },
      { keywords: rank.keywordCount, trackers: rank.trackerCount },
    );
  })();

  return (
    <section className="signal-panel p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Database
            className="size-5 text-base-content/70"
            aria-hidden="true"
          />
          <h2 className="font-semibold">
            {intl.formatMessage({ id: "commandCenter.health.title" })}
          </h2>
        </div>
        <HealthRow
          label={intl.formatMessage({
            id: "commandCenter.health.searchConsole",
          })}
          value={gscValue}
          ok={view.gsc.state === "connected"}
          to="/p/$projectId/search-performance"
          projectId={projectId}
        />
        <HealthRow
          label={intl.formatMessage({ id: "commandCenter.health.siteAudit" })}
          value={auditValue}
          ok={view.auditProgress.state === "completed"}
          to="/p/$projectId/audit"
          projectId={projectId}
        />
        <HealthRow
          label={intl.formatMessage({
            id: "commandCenter.health.rankTracking",
          })}
          value={rankValue}
          ok={
            view.rank.state !== "unavailable" &&
            view.rank.state !== "not-configured"
          }
          to="/p/$projectId/rank-tracking"
          projectId={projectId}
        />
      </div>
    </section>
  );
}

export function PriorityQueue({
  issues,
  projectId,
}: {
  issues: IssuesView;
  projectId: string;
}) {
  const intl = useIntl();

  return (
    <section className="signal-panel p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="signal-label">
              {intl.formatMessage({ id: "commandCenter.priority.eyebrow" })}
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              {intl.formatMessage({ id: "commandCenter.priority.heading" })}
            </h2>
          </div>
          <Link
            to="/p/$projectId/audit"
            params={{ projectId }}
            className="btn btn-ghost btn-sm"
          >
            {intl.formatMessage({ id: "commandCenter.priority.openAudit" })}
          </Link>
        </div>
        <PriorityBody issues={issues} />
      </div>
    </section>
  );
}

function PriorityBody({ issues }: { issues: IssuesView }) {
  const intl = useIntl();

  if (issues.state === "unavailable") {
    return (
      <div className="alert alert-error text-sm" role="alert">
        <CircleAlert className="size-5" aria-hidden="true" />
        <span>
          {intl.formatMessage({ id: "commandCenter.priority.unavailable" })}
        </span>
      </div>
    );
  }

  if (issues.state === "no-audit") {
    return (
      <p className="text-sm text-base-content/70">
        {intl.formatMessage({ id: "commandCenter.priority.runAudit" })}
      </p>
    );
  }

  if (issues.state === "materializing") {
    return (
      <p className="text-sm text-base-content/70">
        {intl.formatMessage({ id: "commandCenter.priority.materializing" })}
      </p>
    );
  }

  if (issues.priorityCount === 0) {
    return (
      <p className="text-sm text-base-content/70">
        {intl.formatMessage({ id: "commandCenter.priority.clean" })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <PriorityRow
        label={intl.formatMessage({ id: "commandCenter.priority.critical" })}
        value={issues.criticalCount}
        tone="error"
      />
      <PriorityRow
        label={intl.formatMessage({ id: "commandCenter.priority.high" })}
        value={issues.highCount}
        tone="warning"
      />
      <p className="signal-meta">
        {intl.formatMessage({ id: "commandCenter.priority.source" })}
      </p>
      {issues.fromDifferentAudit ? (
        <p className="signal-meta">
          {intl.formatMessage({
            id: "commandCenter.priority.fromLastCompleted",
          })}
        </p>
      ) : null}
    </div>
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
    <div className="signal-row rounded-lg border border-base-300 px-3 py-2">
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
      className="signal-row signal-interactive -mx-2 rounded-lg px-2 hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="text-sm text-base-content/70">{label}</span>
      <span className={`badge ${ok ? "badge-success" : "badge-ghost"}`}>
        {value}
      </span>
    </Link>
  );
}
