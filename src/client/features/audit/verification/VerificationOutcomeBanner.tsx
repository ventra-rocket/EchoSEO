import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { getAuditVerificationOutcome } from "@/serverFunctions/audit";

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="alert alert-info alert-sm">
      <span>{children}</span>
    </div>
  );
}

/**
 * On a re-crawl launched to verify fixes, summarizes what happened to the issues
 * the baseline crawl had found: resolved, still present, inconclusive (its URL
 * was not re-crawled, so the fix can't be confirmed), and regressions. Renders
 * nothing for an ordinary crawl (no baseline).
 */
export function VerificationOutcomeBanner({
  projectId,
  auditId,
}: {
  projectId: string;
  auditId: string;
}) {
  const intl = useIntl();
  const query = useQuery({
    queryKey: ["audit-verification", projectId, auditId],
    queryFn: () =>
      getAuditVerificationOutcome({ data: { projectId, auditId } }),
  });

  const data = query.data;
  if (!data || data.state === "no_baseline") return null;
  if (data.state === "pending") {
    return (
      <InfoNote>
        <FormattedMessage id="audit.verification.pending" />
      </InfoNote>
    );
  }
  if (data.state === "baseline_unavailable") {
    return (
      <InfoNote>
        <FormattedMessage id="audit.verification.baselineUnavailable" />
      </InfoNote>
    );
  }

  const { counts, inconclusive, truncated } = data.outcome;
  const baselineDate = data.baseline.completedAt
    ? intl.formatDate(data.baseline.completedAt, { dateStyle: "medium" })
    : null;

  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">
            <FormattedMessage id="audit.verification.title" />
          </h2>
          {baselineDate && (
            <span className="text-xs text-base-content/60">
              {intl.formatMessage(
                { id: "audit.verification.baselineDate" },
                { date: baselineDate },
              )}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <StatChip
            icon={<CheckCircle2 className="size-4" />}
            tone="success"
            label={intl.formatMessage({
              id: "audit.verification.stats.resolved",
            })}
            value={counts.resolved}
          />
          <StatChip
            icon={<AlertTriangle className="size-4" />}
            tone="warning"
            label={intl.formatMessage({
              id: "audit.verification.stats.stillPresent",
            })}
            value={counts.stillPresent}
          />
          <StatChip
            icon={<HelpCircle className="size-4" />}
            tone="neutral"
            label={intl.formatMessage({
              id: "audit.verification.stats.inconclusive",
            })}
            value={counts.inconclusive}
          />
          <StatChip
            icon={<ShieldAlert className="size-4" />}
            tone="error"
            label={intl.formatMessage({
              id: "audit.verification.stats.regressions",
            })}
            value={counts.regressions}
          />
        </div>

        {counts.inconclusive > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-base-content/60">
              <FormattedMessage id="audit.verification.inconclusiveNote" />
              {truncated ? (
                <>
                  {" "}
                  <FormattedMessage id="audit.verification.inconclusiveTruncated" />
                </>
              ) : null}
              :
            </p>
            <ul className="max-h-40 overflow-y-auto rounded border border-base-300 divide-y divide-base-300 text-xs">
              {inconclusive.map((issue) => (
                <li
                  key={`${issue.ruleId}\n${issue.url}`}
                  className="truncate px-2 py-1 text-base-content/70"
                  title={issue.url}
                >
                  {issue.url}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: "success" | "warning" | "neutral" | "error";
  label: string;
  value: number;
}) {
  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    neutral: "text-base-content/70",
    error: "text-error",
  }[tone];

  return (
    <div className="flex items-center gap-2 rounded-lg border border-base-300 px-3 py-1.5">
      <span className={toneClass}>{icon}</span>
      <span className="text-sm font-medium">{value}</span>
      <span className="text-xs text-base-content/60">{label}</span>
    </div>
  );
}
