import { Link } from "@tanstack/react-router";
import { useIntl, type IntlShape } from "react-intl";
import {
  Bot,
  CircleAlert,
  SearchCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { CommandCenterView } from "./command-center-view-model";

function formatDate(intl: IntlShape, iso: string | null): string | null {
  if (!iso) return null;
  return intl.formatDate(iso, { dateStyle: "medium" });
}

function auditCell(intl: IntlShape, view: CommandCenterView) {
  const progress = view.auditProgress;
  const sourceCrawl = intl.formatMessage({
    id: "commandCenter.detail.sourceCrawl",
  });
  switch (progress.state) {
    case "unavailable":
      return {
        value: intl.formatMessage({ id: "commandCenter.value.unavailable" }),
        detail: intl.formatMessage({ id: "commandCenter.detail.sourceAudit" }),
      };
    case "none":
      return {
        value: intl.formatMessage({ id: "commandCenter.value.noAudit" }),
        detail: sourceCrawl,
      };
    case "queued":
      return {
        value: intl.formatMessage({ id: "commandCenter.value.auditQueued" }),
        detail: sourceCrawl,
      };
    case "failed":
      return {
        value: intl.formatMessage({ id: "commandCenter.value.auditFailed" }),
        detail: intl.formatMessage({
          id: "commandCenter.detail.auditIncomplete",
        }),
      };
    case "running":
      return {
        value: intl.formatMessage(
          { id: "commandCenter.value.pages" },
          { crawled: progress.pagesCrawled, total: progress.pagesTotal },
        ),
        detail: intl.formatMessage({
          id: "commandCenter.detail.crawlInProgress",
        }),
      };
    case "completed": {
      const date = formatDate(intl, progress.completedAtIso);
      return {
        value: intl.formatMessage(
          { id: "commandCenter.value.pages" },
          { crawled: progress.pagesCrawled, total: progress.pagesTotal },
        ),
        detail: date
          ? intl.formatMessage(
              { id: "commandCenter.detail.completedAudit" },
              { date },
            )
          : sourceCrawl,
      };
    }
  }
}

function issuesCell(intl: IntlShape, view: CommandCenterView) {
  const issues = view.issues;
  const sourceAudit = intl.formatMessage({
    id: "commandCenter.detail.sourceAudit",
  });
  switch (issues.state) {
    case "unavailable":
      return {
        value: intl.formatMessage({ id: "commandCenter.value.unavailable" }),
        detail: sourceAudit,
      };
    case "no-audit":
      return {
        value: intl.formatMessage({
          id: "commandCenter.value.waitingForAudit",
        }),
        detail: sourceAudit,
      };
    case "materializing":
      return {
        value: intl.formatMessage({ id: "commandCenter.value.stillAnalyzing" }),
        detail: sourceAudit,
      };
    case "ready": {
      const date = formatDate(intl, issues.completedAtIso);
      const detail = !date
        ? sourceAudit
        : issues.fromDifferentAudit
          ? intl.formatMessage(
              { id: "commandCenter.detail.fromLastCompletedAudit" },
              { date },
            )
          : intl.formatMessage(
              { id: "commandCenter.detail.completedAudit" },
              { date },
            );
      return {
        value: intl.formatMessage(
          { id: "commandCenter.value.issueGroups" },
          { count: issues.priorityCount },
        ),
        detail,
      };
    }
  }
}

function rankCell(intl: IntlShape, view: CommandCenterView) {
  const rank = view.rank;
  const sourceRank = intl.formatMessage({
    id: "commandCenter.detail.sourceRank",
  });
  if (rank.state === "unavailable") {
    return {
      value: intl.formatMessage({ id: "commandCenter.value.unavailable" }),
      detail: sourceRank,
    };
  }
  if (rank.state === "not-configured") {
    return {
      value: intl.formatMessage({ id: "commandCenter.value.notConfigured" }),
      detail: sourceRank,
    };
  }

  const value = intl.formatNumber(rank.keywordCount);
  switch (rank.state) {
    case "never-run":
      return {
        value,
        detail: intl.formatMessage({ id: "commandCenter.detail.rankNeverRun" }),
      };
    case "single":
      return {
        value,
        detail: intl.formatMessage(
          { id: "commandCenter.detail.rankSingle" },
          { date: formatDate(intl, rank.atIso) },
        ),
      };
    case "range":
      return {
        value,
        detail: intl.formatMessage(
          { id: "commandCenter.detail.rankRange" },
          {
            oldest: formatDate(intl, rank.oldestIso),
            newest: formatDate(intl, rank.newestIso),
          },
        ),
      };
    case "mixed":
      return {
        value,
        detail: intl.formatMessage({ id: "commandCenter.detail.rankMixed" }),
      };
  }
}

export function SignalCards({
  projectId,
  view,
}: {
  projectId: string;
  view: CommandCenterView;
}) {
  const intl = useIntl();
  const audit = auditCell(intl, view);
  const issues = issuesCell(intl, view);
  const rank = rankCell(intl, view);

  return (
    <section
      aria-label={intl.formatMessage({ id: "commandCenter.signalsLabel" })}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <SignalCard
        icon={SearchCheck}
        label={intl.formatMessage({ id: "commandCenter.signal.auditEvidence" })}
        value={audit.value}
        detail={audit.detail}
        to="/p/$projectId/audit"
        projectId={projectId}
      />
      <SignalCard
        icon={CircleAlert}
        label={intl.formatMessage({
          id: "commandCenter.signal.priorityIssues",
        })}
        value={issues.value}
        detail={issues.detail}
        to="/p/$projectId/audit"
        projectId={projectId}
      />
      <SignalCard
        icon={TrendingUp}
        label={intl.formatMessage({
          id: "commandCenter.signal.trackedKeywords",
        })}
        value={rank.value}
        detail={rank.detail}
        to="/p/$projectId/rank-tracking"
        projectId={projectId}
      />
      <SignalCard
        icon={Bot}
        label={intl.formatMessage({ id: "commandCenter.signal.aiWorkspace" })}
        value={intl.formatMessage({
          id: "commandCenter.value.assistedWorkflows",
        })}
        detail={intl.formatMessage({ id: "commandCenter.detail.aiWorkspace" })}
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
      className="signal-panel signal-interactive flex min-h-36 flex-col gap-2 p-4 hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Icon className="size-5 text-base-content/60" aria-hidden="true" />
      <p className="signal-label">{label}</p>
      <p className="signal-value" data-ph-mask>
        {value}
      </p>
      <p className="signal-meta" data-ph-mask>
        {detail}
      </p>
    </Link>
  );
}
