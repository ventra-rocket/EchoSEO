import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
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
        Fix verification will appear once this re-crawl finishes processing its
        issues.
      </InfoNote>
    );
  }
  if (data.state === "baseline_unavailable") {
    return (
      <InfoNote>
        The baseline crawl is no longer available to verify these fixes against.
      </InfoNote>
    );
  }

  const { counts, inconclusive, truncated } = data.outcome;
  const baselineDate = data.baseline.completedAt
    ? new Date(data.baseline.completedAt).toLocaleDateString()
    : null;

  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">Fix verification</h2>
          {baselineDate && (
            <span className="text-xs text-base-content/60">
              vs baseline crawl of {baselineDate}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <StatChip
            icon={<CheckCircle2 className="size-4" />}
            tone="success"
            label="Resolved"
            value={counts.resolved}
          />
          <StatChip
            icon={<AlertTriangle className="size-4" />}
            tone="warning"
            label="Still present"
            value={counts.stillPresent}
          />
          <StatChip
            icon={<HelpCircle className="size-4" />}
            tone="neutral"
            label="Inconclusive"
            value={counts.inconclusive}
          />
          <StatChip
            icon={<ShieldAlert className="size-4" />}
            tone="error"
            label="Regressions"
            value={counts.regressions}
          />
        </div>

        {counts.inconclusive > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-base-content/60">
              Not re-crawled, so the fix could not be confirmed
              {truncated ? " (first 200 shown)" : ""}:
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
