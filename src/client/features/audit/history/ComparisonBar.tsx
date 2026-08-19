import { AlertTriangle, Info } from "lucide-react";
import type { IssueComparison } from "@/server/features/audit/services/AuditComparisonService";
import {
  crawlDay,
  describeComparisonWindow,
} from "@/client/features/audit/history/comparison-window";

/**
 * Renders the outcome of comparing this crawl against a baseline. The three
 * states are deliberately distinct: "one crawl, nothing to compare" is not the
 * same message as "two crawls, but one has no materialized issues", and neither
 * may be drawn as a real delta of zero.
 *
 * Every change count here is crawl-derived and labelled so — a crawl cannot
 * infer traffic, rankings or backlinks, and later slices attach those under
 * their own `GSC`/`provider` labels onto the same bar shape.
 */
export function ComparisonBar({
  comparison,
  isLoading,
  isError,
}: {
  comparison: IssueComparison | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (!comparison) {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200/40 px-3 py-2 text-sm text-base-content/60">
          <span className="loading loading-spinner loading-xs" />
          <span>Comparing with a previous crawl…</span>
        </div>
      );
    }
    // A failed comparison hides the delta, not the issues. Say so rather than
    // vanishing — otherwise a selected baseline that no longer resolves looks
    // like the bar silently broke.
    if (isError) {
      return (
        <Notice tone="warning">
          Couldn't compare with the selected crawl. The issues below are still
          this crawl's own findings.
        </Notice>
      );
    }
    return null;
  }

  if (comparison.state === "single_snapshot") {
    return (
      <Notice tone="info">
        Findings from this crawl only. This is the first audit of this site — a
        second audit will show what's new and what's fixed.
      </Notice>
    );
  }

  if (comparison.state === "not_comparable") {
    const baselineDate = comparison.baseline
      ? crawlDay(comparison.baseline.sealedAt)
      : null;
    const message =
      comparison.reason === "baseline_not_materialized"
        ? `Can't compare with the crawl of ${baselineDate} yet — its issue analysis hasn't finished, so a comparison would wrongly read every earlier issue as resolved.`
        : "Can't compare yet — issue analysis for this crawl hasn't finished.";
    return <Notice tone="warning">{message}</Notice>;
  }

  const { totals, window, resolvedOnlyRules } = comparison;
  const crawlLabels = describeComparisonWindow(window);

  return (
    <div className="rounded-lg border border-base-300 bg-base-200/40 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <ChangeChip value={totals.added} label="new" tone="up" />
        <ChangeChip value={totals.resolved} label="resolved" tone="down" />
        <ChangeChip
          value={totals.persisting}
          label="still present"
          tone="flat"
        />
      </div>
      <p className="mt-1.5 text-xs text-base-content/60">
        This crawl ({crawlLabels.current}) vs {crawlLabels.baseline} &middot;
        Source: crawl
      </p>
      {resolvedOnlyRules.length > 0 && (
        <p className="mt-1 text-xs text-success">
          Fixed since then:{" "}
          {resolvedOnlyRules
            .map((rule) => rule.fix?.label ?? rule.ruleId)
            .join(", ")}
        </p>
      )}
    </div>
  );
}

function ChangeChip({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "up" | "down" | "flat";
}) {
  const toneClass =
    tone === "up"
      ? "text-warning"
      : tone === "down"
        ? "text-success"
        : "text-base-content/70";
  // No +/− on a zero: "0 new" is a real (measured) count, but "+0" reads as a
  // fabricated increment where nothing changed.
  const sign =
    value === 0 ? "" : tone === "up" ? "+" : tone === "down" ? "−" : "";
  return (
    <span className="flex items-baseline gap-1 text-sm">
      <span className={`font-semibold tabular-nums ${toneClass}`}>
        {sign}
        {value.toLocaleString()}
      </span>
      <span className="text-base-content/60">{label}</span>
    </span>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "info" | "warning";
  children: React.ReactNode;
}) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  const wrapClass =
    tone === "warning"
      ? "border-warning/40 bg-warning/10 text-warning-content/90"
      : "border-base-300 bg-base-200/40 text-base-content/70";
  const iconClass = tone === "warning" ? "text-warning" : "";
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${wrapClass}`}
    >
      <Icon className={`size-4 shrink-0 mt-0.5 ${iconClass}`} />
      <span>{children}</span>
    </div>
  );
}
