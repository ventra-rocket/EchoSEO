export type CommandCenterAudit = {
  id: string;
  startUrl: string;
  status: string;
  pagesCrawled: number;
  pagesTotal: number;
  startedAt: string;
  completedAt: string | null;
};

export type CommandCenterRankTracker = {
  id: string;
  domain: string;
  keywordCount: number;
  lastRunStatus: string | null;
  lastRunCompletedAt: string | null;
};

export type CommandCenterAction = {
  id:
    | "add-domain"
    | "connect-gsc"
    | "run-audit"
    | "fix-issues"
    | "add-keywords";
  title: string;
  description: string;
  target: "settings" | "search-performance" | "audit" | "rank-tracking";
  tone: "primary" | "warning" | "neutral";
};

export function buildCommandCenterActions(input: {
  domain: string | null;
  gscConnected: boolean;
  gscKnown: boolean;
  latestAudit: CommandCenterAudit | null;
  auditKnown: boolean;
  criticalIssueCount: number;
  highIssueCount: number;
  rankTrackers: CommandCenterRankTracker[];
  rankTrackingKnown: boolean;
}): CommandCenterAction[] {
  const actions: CommandCenterAction[] = [];

  if (!input.domain) {
    actions.push({
      id: "add-domain",
      title: "Add your website domain",
      description:
        "Give this project a domain so every SEO workflow has a clear target.",
      target: "settings",
      tone: "primary",
    });
  }

  if (input.gscKnown && !input.gscConnected) {
    actions.push({
      id: "connect-gsc",
      title: "Connect Google Search Console",
      description: "Bring first-party search performance into this project.",
      target: "search-performance",
      tone: "primary",
    });
  }

  if (input.auditKnown && !input.latestAudit) {
    actions.push({
      id: "run-audit",
      title: "Run your first site audit",
      description:
        "Find technical and content issues before choosing what to fix.",
      target: "audit",
      tone: "primary",
    });
  } else if (input.criticalIssueCount + input.highIssueCount > 0) {
    actions.push({
      id: "fix-issues",
      title: "Review priority audit issues",
      description: `${input.criticalIssueCount} critical and ${input.highIssueCount} high-priority issue groups need attention.`,
      target: "audit",
      tone: "warning",
    });
  }

  if (
    input.rankTrackingKnown &&
    (input.rankTrackers.length === 0 ||
      input.rankTrackers.every((tracker) => tracker.keywordCount === 0))
  ) {
    actions.push({
      id: "add-keywords",
      title: "Start tracking priority keywords",
      description: "Set a keyword set to see ranking movement over time.",
      target: "rank-tracking",
      tone: "neutral",
    });
  }

  return actions.slice(0, 3);
}
