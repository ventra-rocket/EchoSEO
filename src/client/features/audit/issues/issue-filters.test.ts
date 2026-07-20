/**
 * The All Issues tab states in words which groups it has no rules for, because
 * rendering them with a count of zero would read as "we checked and found
 * nothing". That sentence is hand-written, so it can drift the moment a rule is
 * mapped into one of those groups — this pins it to the actual mapping.
 */
import { describe, expect, it } from "vitest";
import {
  compareSeverity,
  groupLabel,
  UNCOVERED_GROUPS,
  UNCOVERED_GROUPS_NOTE,
} from "./issue-filters";
import {
  AUDIT_ISSUE_GROUPS,
  getIssueGroup,
} from "@/server/features/audit/issues/audit-issue-groups";
import { LITE_RULES } from "@/server/lib/seo-rules";
import { CORE_WEB_VITALS_RULES } from "@/server/lib/seo-rules/rules/core-web-vitals";
import { CROSS_PAGE_RULES } from "@/server/lib/audit/rules/cross-page";

function groupsWithNoRules(): string[] {
  const covered = new Set(
    [...LITE_RULES, ...CORE_WEB_VITALS_RULES, ...CROSS_PAGE_RULES].flatMap(
      (rule) => {
        const group = getIssueGroup(rule.id);
        return group === null ? [] : [group];
      },
    ),
  );

  return AUDIT_ISSUE_GROUPS.filter((group) => !covered.has(group));
}

describe("uncovered groups", () => {
  it("matches the groups no rule actually maps to", () => {
    // Mapping a rule into redirects or AI/GEO must fail here, so nobody can
    // leave the tab telling readers the audit does not cover something it now
    // checks — or hide a group that really is empty.
    expect(groupsWithNoRules().toSorted()).toEqual(
      [...UNCOVERED_GROUPS].toSorted(),
    );
  });

  it("says something about the gap rather than showing a zero", () => {
    expect(UNCOVERED_GROUPS_NOTE.length).toBeGreaterThan(0);
    expect(UNCOVERED_GROUPS_NOTE).not.toMatch(/\b0\b/);
  });
});

describe("group presentation", () => {
  it("labels every known group", () => {
    for (const group of AUDIT_ISSUE_GROUPS) {
      expect(groupLabel(group)).not.toBe(group);
    }
  });

  it("falls back to the raw slug for an unknown group", () => {
    expect(groupLabel("brand-new-group")).toBe("brand-new-group");
  });

  it("orders severities worst first and sinks unknown ones", () => {
    expect(["low", "critical", "high"].toSorted(compareSeverity)).toEqual([
      "critical",
      "high",
      "low",
    ]);
    expect(compareSeverity("mystery", "low")).toBeGreaterThan(0);
  });
});
