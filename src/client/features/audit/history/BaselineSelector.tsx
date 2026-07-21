import type { ComparableSnapshot } from "@/server/features/audit/services/AuditComparisonService";

/**
 * Picks which past crawl the current one is compared against. The default
 * (empty value) lets the server auto-pick the most recent comparable crawl.
 *
 * Snapshots whose issues were never materialized are shown but disabled: hiding
 * them would make a crawl silently un-selectable, whereas a disabled row with a
 * reason explains why it cannot be a baseline. The server enforces the same rule
 * regardless of what the client offers.
 */
export function BaselineSelector({
  snapshots,
  value,
  onChange,
}: {
  snapshots: ComparableSnapshot[];
  value: string | undefined;
  onChange: (baselineAuditId: string | undefined) => void;
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
          {options.map((snapshot) => (
            <option
              key={snapshot.auditId}
              value={snapshot.auditId}
              disabled={!snapshot.materialized}
            >
              {crawlDate(snapshot.sealedAt)} · {snapshot.pagesCrawled} pages
              {snapshot.materialized ? "" : " · analysis pending"}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function crawlDate(raw: string): string {
  return raw.slice(0, 10);
}
