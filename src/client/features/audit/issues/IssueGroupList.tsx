import { ChevronRight } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  compareSeverity,
  severityBadgeClass,
  translatedGroupLabel,
  type IssueFilters,
  type IssueFixText,
} from "@/client/features/audit/issues/issue-filters";
import type { SelectedRule } from "@/client/features/audit/issues/AllIssuesTab";
import type { RuleDelta } from "@/server/features/audit/history/issue-delta";

interface Rollup {
  ruleId: string;
  issueGroup: string;
  severity: string;
  urlCount: number;
  fix: IssueFixText | null;
}

/**
 * The grouped issue summary: one section per group that actually has findings,
 * one row per rule.
 *
 * Only groups present in the data are rendered. A group the audit has no rules
 * for is absent rather than shown with a count of zero — the tab states in
 * words which coverage is missing, because a zero here would read as a
 * measurement we never took.
 */
export function IssueGroupList({
  rollups,
  deltaByRule,
  filters,
  onFiltersChange,
  onSelectRule,
}: {
  rollups: Rollup[];
  /**
   * Per-rule change counts against a baseline crawl. Present only once a
   * comparison resolves; absent means "no baseline", which renders no badges
   * rather than zeros.
   */
  deltaByRule?: Record<string, RuleDelta>;
  filters: IssueFilters;
  onFiltersChange: (filters: Partial<IssueFilters>) => void;
  onSelectRule: (rule: SelectedRule) => void;
}) {
  const intl = useIntl();
  // Severity narrows before grouping, so a group whose only issues were
  // filtered out disappears rather than rendering an empty section.
  const severityFiltered = filters.severity
    ? rollups.filter((rollup) => rollup.severity === filters.severity)
    : rollups;
  const groups = groupRollups(severityFiltered);
  const visibleGroups = filters.group
    ? groups.filter((group) => group.group === filters.group)
    : groups;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <GroupFilterBar
          groups={groups}
          activeGroup={filters.group}
          onSelect={(group) => onFiltersChange({ ...filters, group })}
        />
        <SeverityFilterBar
          severities={availableSeverities(rollups)}
          activeSeverity={filters.severity}
          onSelect={(severity) => onFiltersChange({ ...filters, severity })}
        />
      </div>

      {visibleGroups.length === 0 && (
        <p className="rounded-lg border border-base-300 px-3 py-4 text-center text-sm text-base-content/60">
          <FormattedMessage id="audit.issues.groupList.emptyFiltered" />
        </p>
      )}

      {visibleGroups.map((group) => (
        <section
          key={group.group}
          className="rounded-lg border border-base-300 overflow-hidden"
        >
          <header className="flex items-center justify-between bg-base-200/50 px-3 py-2">
            <h4 className="text-sm font-medium">
              {translatedGroupLabel(intl, group.group)}
            </h4>
            <span className="text-xs text-base-content/60">
              <FormattedMessage
                id="audit.issues.groupList.summary"
                values={{
                  issueCount: group.rules.length,
                  urlCount: group.urlTotal,
                }}
              />
            </span>
          </header>

          <ul className="divide-y divide-base-300">
            {group.rules.map((rule) => (
              <li key={rule.ruleId}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-base-200/50"
                  onClick={() =>
                    onSelectRule({
                      ruleId: rule.ruleId,
                      // The rule catalog is server-only, so the resolved label
                      // travels with the rollup. The id is the honest fallback
                      // if a rule ever outlives its catalog entry.
                      label: rule.fix?.label ?? rule.ruleId,
                      urlCount: rule.urlCount,
                      fix: rule.fix,
                    })
                  }
                >
                  <span
                    className={`badge badge-sm ${severityBadgeClass(rule.severity)}`}
                  >
                    {rule.severity}
                  </span>
                  <span className="flex-1 text-sm">
                    {rule.fix?.label ?? rule.ruleId}
                  </span>
                  <RuleChangeBadges delta={deltaByRule?.[rule.ruleId]} />
                  <span className="text-sm tabular-nums text-base-content/70">
                    {intl.formatNumber(rule.urlCount)}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-base-content/40" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * New/resolved counts for one rule against the baseline crawl. Only non-zero
 * sides are drawn — a rule with no change shows nothing rather than "+0", which
 * would read as a measurement where there was none.
 */
function RuleChangeBadges({ delta }: { delta: RuleDelta | undefined }) {
  const intl = useIntl();
  if (!delta || (delta.added === 0 && delta.resolved === 0)) return null;

  return (
    <span className="flex items-center gap-1">
      {delta.added > 0 && (
        <span
          className="badge badge-xs badge-warning"
          title={intl.formatMessage({
            id: "audit.issues.groupList.newSinceBaseline",
          })}
        >
          +{delta.added}
        </span>
      )}
      {delta.resolved > 0 && (
        <span
          className="badge badge-xs badge-success"
          title={intl.formatMessage({
            id: "audit.issues.groupList.resolvedSinceBaseline",
          })}
        >
          −{delta.resolved}
        </span>
      )}
    </span>
  );
}

function GroupFilterBar({
  groups,
  activeGroup,
  onSelect,
}: {
  groups: GroupedRollups[];
  activeGroup: string | undefined;
  onSelect: (group: string | undefined) => void;
}) {
  const intl = useIntl();
  if (groups.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        className={`btn btn-xs ${activeGroup ? "btn-ghost" : "btn-primary"}`}
        onClick={() => onSelect(undefined)}
      >
        <FormattedMessage id="audit.issues.groupList.allGroups" />
      </button>
      {groups.map((group) => (
        <button
          key={group.group}
          type="button"
          className={`btn btn-xs ${
            activeGroup === group.group ? "btn-primary" : "btn-ghost"
          }`}
          onClick={() => onSelect(group.group)}
        >
          {translatedGroupLabel(intl, group.group)}
          <span className="opacity-60">
            {intl.formatNumber(group.urlTotal)}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Severities the summary actually contains, most severe first. Derived from
 * the data rather than from the full severity vocabulary, so the bar never
 * offers a filter that would return nothing.
 */
function availableSeverities(rollups: Rollup[]): string[] {
  return [...new Set(rollups.map((rollup) => rollup.severity))].toSorted(
    compareSeverity,
  );
}

function SeverityFilterBar({
  severities,
  activeSeverity,
  onSelect,
}: {
  severities: string[];
  activeSeverity: string | undefined;
  onSelect: (severity: string | undefined) => void;
}) {
  if (severities.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-base-content/50">
        <FormattedMessage id="audit.issues.groupList.severity" />
      </span>
      <button
        type="button"
        className={`btn btn-xs ${activeSeverity ? "btn-ghost" : "btn-primary"}`}
        onClick={() => onSelect(undefined)}
      >
        <FormattedMessage id="audit.issues.groupList.anySeverity" />
      </button>
      {severities.map((severity) => (
        <button
          key={severity}
          type="button"
          className={`btn btn-xs ${
            activeSeverity === severity ? "btn-primary" : "btn-ghost"
          }`}
          onClick={() => onSelect(severity)}
        >
          {severity}
        </button>
      ))}
    </div>
  );
}

interface GroupedRollups {
  group: string;
  urlTotal: number;
  rules: Rollup[];
}

function groupRollups(rollups: Rollup[]): GroupedRollups[] {
  const byGroup = new Map<string, Rollup[]>();
  for (const rollup of rollups) {
    const existing = byGroup.get(rollup.issueGroup);
    if (existing) {
      existing.push(rollup);
    } else {
      byGroup.set(rollup.issueGroup, [rollup]);
    }
  }

  return [...byGroup.entries()]
    .map(([group, rules]) => ({
      group,
      rules: rules.toSorted(
        (a, b) =>
          compareSeverity(a.severity, b.severity) || b.urlCount - a.urlCount,
      ),
      urlTotal: rules.reduce((sum, rule) => sum + rule.urlCount, 0),
    }))
    .toSorted(
      (a, b) =>
        compareSeverity(
          a.rules[0]?.severity ?? "low",
          b.rules[0]?.severity ?? "low",
        ) || b.urlTotal - a.urlTotal,
    );
}
