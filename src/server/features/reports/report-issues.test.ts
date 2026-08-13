/**
 * What the weekly report promises the owner, with both repositories mocked.
 *
 * The contract under test is honesty, not arithmetic (the set diff itself is
 * unit tested in issue-delta.test.ts): the report must refuse to compare against
 * a snapshot whose issues were never materialized, must never file a returning
 * issue as brand new, must keep its headline counts true after the lists are
 * capped, and must still show a finding whose rule has no remediation copy.
 *
 * `getIssueFixText` is deliberately NOT mocked — it is pure, and the fallback
 * path is only meaningful if the real catalogs decide what is missing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OccurrenceKey } from "@/server/features/audit/history/issue-delta";

const listSealedSnapshotsForTarget = vi.fn();
const getOccurrenceKeysForAudit =
  vi.fn<(auditId: string) => Promise<unknown>>();

vi.mock("@/server/features/audit/repositories/AuditRepository", () => ({
  AuditRepository: { listSealedSnapshotsForTarget },
}));

vi.mock("@/server/features/audit/repositories/AuditIssueRepository", () => ({
  AuditIssueRepository: { getOccurrenceKeysForAudit },
}));

// Dynamic on purpose: a static import is hoisted above the `vi.fn()` bindings
// the mock factories close over, so the factories would hit them in their TDZ.
const { buildWeeklyIssueReport, newCriticalIssues, REPORT_ISSUE_LIST_LIMIT } =
  await import("./report-issues");

const TARGET_ID = "target1";
/** A cross-page rule that really exists, so the catalog resolves its copy. */
const KNOWN_RULE = "audit-orphan-page";

/**
 * The snapshot columns the report reads; a subset of the repository row. ISO
 * strings sort chronologically as text, which is exactly how the repository
 * orders snapshots — so a test can pin the baseline picker with plain literals.
 */
interface SnapshotRow {
  auditId: string;
  sealedAt: string;
  issuesMaterializedAt: string | null;
  pagesCrawled: number;
}

function snapshot(
  auditId: string,
  sealedAt: string,
  materialized = true,
): SnapshotRow {
  return {
    auditId,
    sealedAt,
    issuesMaterializedAt: materialized ? sealedAt : null,
    pagesCrawled: 25,
  };
}

function occ(ruleId: string, url: string, severity = "high"): OccurrenceKey {
  return { ruleId, url, issueGroup: "content", severity };
}

/** Newest first, mirroring `listSealedSnapshotsForTarget`'s ORDER BY. */
function withSnapshots(...snapshots: SnapshotRow[]) {
  listSealedSnapshotsForTarget.mockResolvedValue(snapshots);
}

function withOccurrences(byAudit: Record<string, OccurrenceKey[]>) {
  getOccurrenceKeysForAudit.mockImplementation(async (auditId: string) => {
    return byAudit[auditId] ?? [];
  });
}

function report(auditId?: string) {
  return buildWeeklyIssueReport({ targetId: TARGET_ID, locale: "en", auditId });
}

beforeEach(() => {
  vi.clearAllMocks();
  withOccurrences({});
});

describe("buildWeeklyIssueReport", () => {
  it("reports no_audit when the target has never sealed a crawl", async () => {
    withSnapshots();

    expect(await report()).toEqual({ state: "no_audit" });
  });

  it("reports no_audit when the requested audit is not this target's", async () => {
    // Isolation: naming another target's audit must not silently fall back to
    // this target's newest crawl and email the wrong site's findings.
    withSnapshots(snapshot("a2", "2026-08-10"));

    expect(await report("someone-elses-audit")).toEqual({ state: "no_audit" });
  });

  it("refuses to compare when the current crawl was never materialized", async () => {
    // The workflow swallows materializer errors, so a sealed snapshot with zero
    // occurrences is indistinguishable from a clean site unless this gate holds.
    withSnapshots(
      snapshot("a2", "2026-08-10", false),
      snapshot("a1", "2026-08-03"),
    );
    withOccurrences({ a1: [occ(KNOWN_RULE, "https://x/a")] });

    expect(await report()).toEqual({
      state: "not_comparable",
      reason: "current_not_materialized",
    });
    // Nothing is read: an unmaterialized side must never reach the diff.
    expect(getOccurrenceKeysForAudit).not.toHaveBeenCalled();
  });

  it("refuses to compare when the baseline was never materialized", async () => {
    // The mirror trap: an empty baseline key set reads as a wholesale fix.
    withSnapshots(
      snapshot("a2", "2026-08-10"),
      snapshot("a1", "2026-08-03", false),
    );
    withOccurrences({ a2: [occ(KNOWN_RULE, "https://x/a")] });

    expect(await report()).toEqual({
      state: "not_comparable",
      reason: "baseline_not_materialized",
    });
    expect(getOccurrenceKeysForAudit).not.toHaveBeenCalled();
  });

  it("treats every issue of a first crawl as new", async () => {
    withSnapshots(snapshot("a1", "2026-08-10"));
    withOccurrences({
      a1: [
        occ(KNOWN_RULE, "https://x/a", "critical"),
        occ(KNOWN_RULE, "https://x/b"),
      ],
    });

    const result = await report();

    expect(result.state).toBe("no_baseline");
    if (result.state !== "no_baseline") return;
    expect(result.current).toEqual({
      auditId: "a1",
      sealedAt: "2026-08-10",
      pagesCrawled: 25,
    });
    expect(result.newIssues.map((issue) => issue.url)).toEqual([
      "https://x/a",
      "https://x/b",
    ]);
    expect(result.criticalCount).toBe(1);
    // The alert says "critical issues the previous crawl did not have". There is
    // no previous crawl, so a baseline must not fire one — the weekly report
    // carries these, and it says outright that it is a first crawl.
    expect(newCriticalIssues(result)).toEqual([]);
  });

  it("files a returning issue as regressed, never as new", async () => {
    // Present in the prior crawl, fixed in the baseline, back now. Calling that
    // "new" would hide that a shipped fix came undone.
    withSnapshots(
      snapshot("a3", "2026-08-17"),
      snapshot("a2", "2026-08-10"),
      snapshot("a1", "2026-08-03"),
    );
    withOccurrences({
      a3: [
        occ(KNOWN_RULE, "https://x/returning"),
        occ(KNOWN_RULE, "https://x/fresh"),
      ],
      a2: [],
      a1: [occ(KNOWN_RULE, "https://x/returning")],
    });

    const result = await report();

    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;
    expect(result.regressedIssues.map((issue) => issue.url)).toEqual([
      "https://x/returning",
    ]);
    expect(result.newIssues.map((issue) => issue.url)).toEqual([
      "https://x/fresh",
    ]);
    expect(result.baseline.auditId).toBe("a2");
  });

  it("calls everything new when there is no third crawl to regress against", async () => {
    withSnapshots(snapshot("a2", "2026-08-10"), snapshot("a1", "2026-08-03"));
    withOccurrences({
      a2: [occ(KNOWN_RULE, "https://x/a")],
      a1: [],
    });

    const result = await report();

    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;
    expect(result.newIssues).toHaveLength(1);
    expect(result.regressedIssues).toEqual([]);
  });

  it("ignores an unmaterialized prior crawl instead of reading it as clean", async () => {
    // An unmaterialized prior has no keys; trusting it would relabel every
    // regression as new. Treating it as absent keeps the claim weaker but true.
    withSnapshots(
      snapshot("a3", "2026-08-17"),
      snapshot("a2", "2026-08-10"),
      snapshot("a1", "2026-08-03", false),
    );
    withOccurrences({
      a3: [occ(KNOWN_RULE, "https://x/returning")],
      a2: [],
      a1: [occ(KNOWN_RULE, "https://x/returning")],
    });

    const result = await report();

    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;
    expect(result.regressedIssues).toEqual([]);
    expect(result.newIssues).toHaveLength(1);
    expect(getOccurrenceKeysForAudit).not.toHaveBeenCalledWith("a1");
  });

  it("compares an explicitly named crawl against the two crawls before it", async () => {
    withSnapshots(
      snapshot("a4", "2026-08-24"),
      snapshot("a3", "2026-08-17"),
      snapshot("a2", "2026-08-10"),
      snapshot("a1", "2026-08-03"),
    );
    withOccurrences({
      a3: [occ(KNOWN_RULE, "https://x/returning")],
      a2: [],
      a1: [occ(KNOWN_RULE, "https://x/returning")],
      a4: [occ(KNOWN_RULE, "https://x/newest")],
    });

    const result = await report("a3");

    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;
    // The newest crawl must not leak into a report about an older one.
    expect(result.current.auditId).toBe("a3");
    expect(result.baseline.auditId).toBe("a2");
    expect(result.regressedIssues.map((issue) => issue.url)).toEqual([
      "https://x/returning",
    ]);
    expect(getOccurrenceKeysForAudit).not.toHaveBeenCalledWith("a4");
  });

  it("keeps criticalCount whole when the list is capped", async () => {
    // A big crawl must not shrink its own headline: the email shows a page of
    // issues, the count still describes the crawl.
    const overflow = REPORT_ISSUE_LIST_LIMIT + 50;
    withSnapshots(snapshot("a2", "2026-08-10"), snapshot("a1", "2026-08-03"));
    withOccurrences({
      a2: Array.from({ length: overflow }, (_, index) =>
        occ(
          KNOWN_RULE,
          `https://x/${String(index).padStart(4, "0")}`,
          "critical",
        ),
      ),
      a1: [],
    });

    const result = await report();

    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;
    expect(result.newIssues).toHaveLength(REPORT_ISSUE_LIST_LIMIT);
    expect(result.criticalCount).toBe(overflow);
    expect(newCriticalIssues(result)).toHaveLength(REPORT_ISSUE_LIST_LIMIT);
  });

  it("counts criticals across both new and regressed", async () => {
    withSnapshots(
      snapshot("a3", "2026-08-17"),
      snapshot("a2", "2026-08-10"),
      snapshot("a1", "2026-08-03"),
    );
    withOccurrences({
      a3: [
        occ(KNOWN_RULE, "https://x/returning", "critical"),
        occ(KNOWN_RULE, "https://x/fresh", "critical"),
        occ(KNOWN_RULE, "https://x/minor", "low"),
      ],
      a2: [],
      a1: [occ(KNOWN_RULE, "https://x/returning", "critical")],
    });

    const result = await report();

    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;
    expect(result.criticalCount).toBe(2);
    expect(
      newCriticalIssues(result)
        .map((issue) => issue.url)
        .toSorted(),
    ).toEqual(["https://x/fresh", "https://x/returning"]);
  });

  it("shows a finding whose rule has no remediation copy", async () => {
    // A rule the copy deck forgot is still a real defect on a real URL. It ships
    // with its id as the label rather than being filtered out of the email.
    withSnapshots(snapshot("a1", "2026-08-10"));
    withOccurrences({
      a1: [occ("not-a-rule", "https://x/a"), occ(KNOWN_RULE, "https://x/b")],
    });

    const result = await report();

    expect(result.state).toBe("no_baseline");
    if (result.state !== "no_baseline") return;
    const orphan = result.newIssues.find(
      (issue) => issue.ruleId === "not-a-rule",
    );
    expect(orphan).toEqual({
      ruleId: "not-a-rule",
      url: "https://x/a",
      issueGroup: "content",
      severity: "high",
      label: "not-a-rule",
      problem: "",
      fixSteps: [],
      googleSourceUrl: "",
      guideQuote: "",
      lastReviewedDate: "",
      localized: false,
    });

    const known = result.newIssues.find((issue) => issue.ruleId === KNOWN_RULE);
    expect(known?.label).not.toBe(KNOWN_RULE);
    expect(known?.fixSteps.length).toBeGreaterThan(0);
  });

  it("orders issues by severity, then rule, then url", async () => {
    withSnapshots(snapshot("a1", "2026-08-10"));
    withOccurrences({
      a1: [
        occ("b-rule", "https://x/b", "low"),
        occ("b-rule", "https://x/a", "high"),
        occ("a-rule", "https://x/z", "high"),
        occ("z-rule", "https://x/a", "critical"),
      ],
    });

    const result = await report();

    expect(result.state).toBe("no_baseline");
    if (result.state !== "no_baseline") return;
    expect(
      result.newIssues.map((issue) => `${issue.ruleId} ${issue.url}`),
    ).toEqual([
      "z-rule https://x/a",
      "a-rule https://x/z",
      "b-rule https://x/a",
      "b-rule https://x/b",
    ]);
  });

  it("summarizes what was fixed, biggest win first", async () => {
    withSnapshots(snapshot("a2", "2026-08-10"), snapshot("a1", "2026-08-03"));
    withOccurrences({
      a2: [],
      a1: [
        occ("not-a-rule", "https://x/a"),
        occ("not-a-rule", "https://x/b"),
        occ(KNOWN_RULE, "https://x/c"),
      ],
    });

    const result = await report();

    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;
    expect(result.fixedCount).toBe(3);
    expect(result.fixedRules[0]).toEqual({
      ruleId: "not-a-rule",
      label: "not-a-rule",
      resolvedCount: 2,
    });
    expect(result.fixedRules[1]?.ruleId).toBe(KNOWN_RULE);
  });

  it("reads the two comparison crawls in parallel", async () => {
    // Three sequential D1 reads inside a Durable Object alarm is the difference
    // between a report that finishes and one that trips the alarm budget.
    withSnapshots(
      snapshot("a3", "2026-08-17"),
      snapshot("a2", "2026-08-10"),
      snapshot("a1", "2026-08-03"),
    );
    let inFlight = 0;
    let peak = 0;
    getOccurrenceKeysForAudit.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return [];
    });

    await report();

    expect(peak).toBe(3);
  });
});

describe("newCriticalIssues", () => {
  it("has nothing to alert on when the report could not be built", () => {
    expect(newCriticalIssues({ state: "no_audit" })).toEqual([]);
    expect(
      newCriticalIssues({ state: "not_comparable", reason: "whatever" }),
    ).toEqual([]);
  });
});
