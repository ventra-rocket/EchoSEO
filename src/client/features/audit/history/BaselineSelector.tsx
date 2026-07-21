import type { ComparableSnapshot } from "@/server/features/audit/services/AuditComparisonService";

/**
 * Picks which past crawl the current one is compared against. The default
 * (empty value) lets the server auto-pick the most recent comparable crawl.
 *
 * `requireMaterialized` reflects what the consuming comparison actually needs.
 * The issue delta needs a baseline whose issues materialized, so it disables the
 * others (shown, not hidden, with a reason). Page-fact changes don't — a
 * snapshot's page facts are sealed regardless of materialization — so they pass
 * false and every earlier crawl is selectable. Either way the server enforces
 * the same rule; the flag only keeps the menu honest about what will work.
 */
export function BaselineSelector({
  snapshots,
  value,
  onChange,
  requireMaterialized = true,
}: {
  snapshots: ComparableSnapshot[];
  value: string | undefined;
  onChange: (baselineAuditId: string | undefined) => void;
  requireMaterialized?: boolean;
}) {
  // Only earlier crawls are valid baselines: the delta reads "changes since the
  // baseline", so a later crawl would invert added/resolved. The server rejects
  // a newer baseline too; this keeps it off the menu in the first place.
  const current = snapshots.find((snapshot) => snapshot.isCurrent);
  const options = snapshots.filter(
    (snapshot) =>
      !snapshot.isCurrent && (!current || snapshot.sealedAt < current.sealedAt),
  );
  if (options.length === 0) return null;

  return (
    <div className="flex justify-end">
      <label className="flex items-center gap-2 text-xs text-base-content/60">
        <span>Compare against</span>
        <select
          className="select select-xs select-bordered"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || undefined)}
        >
          <option value="">Previous crawl (auto)</option>
          {options.map((snapshot) => {
            const disabled = requireMaterialized && !snapshot.materialized;
            return (
              <option
                key={snapshot.auditId}
                value={snapshot.auditId}
                disabled={disabled}
              >
                {crawlDate(snapshot.sealedAt)} · {snapshot.pagesCrawled} pages
                {disabled ? " · analysis pending" : ""}
              </option>
            );
          })}
        </select>
      </label>
    </div>
  );
}

function crawlDate(raw: string): string {
  return raw.slice(0, 10);
}
