import { Link } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import type { CommandCenterAction } from "@/shared/command-center";
import type { MessageId } from "@/client/i18n/messages";

// Server action IDs are stable selectors; the visible copy is localized on the
// client so the response contract (title/description/target/tone) never changes.
export const ACTION_MESSAGE_IDS: Record<
  CommandCenterAction["id"],
  { title: MessageId; body: MessageId }
> = {
  "add-domain": {
    title: "commandCenter.action.addDomain.title",
    body: "commandCenter.action.addDomain.body",
  },
  "connect-gsc": {
    title: "commandCenter.action.connectGsc.title",
    body: "commandCenter.action.connectGsc.body",
  },
  "run-audit": {
    title: "commandCenter.action.runAudit.title",
    body: "commandCenter.action.runAudit.body",
  },
  "fix-issues": {
    title: "commandCenter.action.fixIssues.title",
    body: "commandCenter.action.fixIssues.body",
  },
  "add-keywords": {
    title: "commandCenter.action.addKeywords.title",
    body: "commandCenter.action.addKeywords.body",
  },
};

export function ActionLink({
  action,
  projectId,
  primary = false,
}: {
  action: CommandCenterAction;
  projectId: string;
  primary?: boolean;
}) {
  const intl = useIntl();
  const className = primary
    ? "btn btn-primary min-h-11 w-full sm:w-fit"
    : "link link-hover text-sm";
  const label = intl.formatMessage({ id: ACTION_MESSAGE_IDS[action.id].title });

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
