import { describe, expect, it } from "vitest";
import {
  computeIssueDelta,
  type OccurrenceKey,
} from "@/server/features/audit/history/issue-delta";

function key(
  ruleId: string,
  url: string,
  overrides: Partial<OccurrenceKey> = {},
): OccurrenceKey {
  return { ruleId, url, issueGroup: "content", severity: "high", ...overrides };
}

describe("computeIssueDelta", () => {
  it("splits occurrences into added, resolved and persisting by (ruleId, url)", () => {
    const current = [
      key("meta-title", "https://x/a"), // persists
      key("meta-title", "https://x/b"), // added
    ];
    const baseline = [
      key("meta-title", "https://x/a"), // persists
      key("meta-title", "https://x/c"), // resolved
    ];

    const delta = computeIssueDelta(current, baseline);

    expect(delta.totals).toEqual({ added: 1, resolved: 1, persisting: 1 });
    expect(delta.byRule["meta-title"]).toEqual({
      added: 1,
      resolved: 1,
      persisting: 1,
    });
  });

  it("keys on both ruleId and url, so neither alone collapses distinct issues", () => {
    // Same URL, different rule → two issues, not one.
    const sameUrl = computeIssueDelta(
      [key("meta-title", "https://x/a"), key("structure-h1", "https://x/a")],
      [],
    );
    expect(sameUrl.totals.added).toBe(2);

    // Same rule, different URL → two issues, not one.
    const sameRule = computeIssueDelta(
      [key("meta-title", "https://x/a"), key("meta-title", "https://x/b")],
      [],
    );
    expect(sameRule.totals.added).toBe(2);
  });

  it("counts a repeated (ruleId, url) once, matching the occurrence unique index", () => {
    // The stored occurrences are unique on (audit, rule, url); the crawl
    // dedupes http/https and www/apex duplicate landings before storage. Even
    // if a duplicate key reached here, the set-based diff must not double-count.
    const delta = computeIssueDelta(
      [key("meta-title", "https://x/a"), key("meta-title", "https://x/a")],
      [key("meta-title", "https://x/a")],
    );
    expect(delta.totals).toEqual({ added: 0, resolved: 0, persisting: 1 });
  });

  it("keeps a fully-resolved rule in byRule and lists it as resolved-only", () => {
    const current = [key("meta-title", "https://x/a")];
    const baseline = [
      key("meta-title", "https://x/a"),
      key("structure-h1", "https://x/a", {
        issueGroup: "content",
        severity: "critical",
      }),
      key("structure-h1", "https://x/b", {
        issueGroup: "content",
        severity: "critical",
      }),
    ];

    const delta = computeIssueDelta(current, baseline);

    // The rule vanished from the current crawl but must not vanish from the report.
    expect(delta.byRule["structure-h1"]).toEqual({
      added: 0,
      resolved: 2,
      persisting: 0,
    });
    expect(delta.resolvedOnlyRules).toEqual([
      {
        ruleId: "structure-h1",
        issueGroup: "content",
        severity: "critical",
        resolvedCount: 2,
      },
    ]);
  });

  it("does not list a still-present rule as resolved-only", () => {
    const delta = computeIssueDelta(
      [key("meta-title", "https://x/a")],
      [key("meta-title", "https://x/a"), key("meta-title", "https://x/b")],
    );
    // meta-title still has a current occurrence, so even though one URL resolved
    // it is not a resolved-only rule.
    expect(delta.resolvedOnlyRules).toEqual([]);
    expect(delta.byRule["meta-title"]).toEqual({
      added: 0,
      resolved: 1,
      persisting: 1,
    });
  });

  it("reports an all-resolved delta against an empty baseline-side (the trap the gate prevents)", () => {
    // This documents WHY the service refuses to diff an unmaterialized snapshot:
    // an empty current against a populated baseline reads as a wholesale
    // resolution. The gate must stop this before computeIssueDelta ever runs.
    const delta = computeIssueDelta(
      [],
      [key("meta-title", "https://x/a"), key("meta-title", "https://x/b")],
    );
    expect(delta.totals).toEqual({ added: 0, resolved: 2, persisting: 0 });
  });
});
