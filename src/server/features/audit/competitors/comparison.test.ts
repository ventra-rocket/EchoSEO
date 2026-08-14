import { describe, expect, it } from "vitest";
import type { Issue } from "@/server/lib/seo-rules";
import { compareIssues, countDeficit, planComparison } from "./comparison";

const OURS = "https://thehourglass.test";
const THEIRS = "https://cortinawatch.test";

function issue(
  id: string,
  status: Issue["status"],
  severity: Issue["severity"] = "high",
): Issue {
  return {
    id,
    category: "meta",
    severity,
    label: id,
    status,
    problem: "",
    fixSteps: [],
    googleSourceUrl: "https://developers.google.com/search",
    guideQuote: "",
    lastReviewedDate: "2026-01-01",
  };
}

const allowAll = () => true;

describe("planComparison", () => {
  it("fetches a confident, allowed pair", () => {
    const plans = planComparison({
      ourUrls: [`${OURS}/brand/rolex`],
      theirUrls: [`${THEIRS}/en/rolex/discover`],
      isAllowed: allowAll,
      manualPairs: [],
    });

    expect(plans).toHaveLength(1);
    expect(plans[0].skip).toBeNull();
  });

  it("keeps an unconfident pair but refuses to fetch it", () => {
    const plans = planComparison({
      ourUrls: [`${OURS}/about`],
      theirUrls: [`${THEIRS}/about-us-and-our-history-since-1979`],
      isAllowed: allowAll,
      manualPairs: [],
    });

    expect(plans).toHaveLength(1);
    expect(plans[0].skip).toContain("not confident");
  });

  it("records a robots disallow as the reason, not as an absence", () => {
    // An omitted row reads as "nothing to compare", which is a different claim
    // from "they block us".
    const plans = planComparison({
      ourUrls: [`${OURS}/brand/rolex`],
      theirUrls: [`${THEIRS}/en/rolex/discover`],
      isAllowed: () => false,
      manualPairs: [],
    });

    expect(plans[0].skip).toContain("robots.txt");
  });

  it("takes a manual pair over anything the matcher would derive", () => {
    const plans = planComparison({
      ourUrls: [`${OURS}/pricing`],
      theirUrls: [`${THEIRS}/plans`, `${THEIRS}/pricing`],
      isAllowed: allowAll,
      manualPairs: [{ ourUrl: `${OURS}/pricing`, theirUrl: `${THEIRS}/plans` }],
    });

    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      ourUrl: `${OURS}/pricing`,
      theirUrl: `${THEIRS}/plans`,
      skip: null,
    });
    // The matcher would never have paired /pricing with /plans, and it must not
    // re-pair /pricing with the URL it prefers.
    expect(plans.map((p) => p.theirUrl)).not.toContain(`${THEIRS}/pricing`);
  });

  it("still honours robots for a manual pair", () => {
    const plans = planComparison({
      ourUrls: [`${OURS}/pricing`],
      theirUrls: [],
      isAllowed: () => false,
      manualPairs: [{ ourUrl: `${OURS}/pricing`, theirUrl: `${THEIRS}/plans` }],
    });

    expect(plans[0].skip).toContain("robots.txt");
  });

  it("counts manual pairs against the limit", () => {
    const plans = planComparison({
      ourUrls: [`${OURS}/a`, `${OURS}/b`, `${OURS}/c`],
      theirUrls: [`${THEIRS}/b`, `${THEIRS}/c`],
      isAllowed: allowAll,
      manualPairs: [{ ourUrl: `${OURS}/a`, theirUrl: `${THEIRS}/zzz` }],
      limit: 2,
    });

    expect(plans).toHaveLength(2);
    expect(plans[0].theirUrl).toBe(`${THEIRS}/zzz`);
  });
});

describe("compareIssues", () => {
  it("marks a loss, a win, and a tie", () => {
    const rows = compareIssues(
      [
        issue("meta-title", "pass"),
        issue("meta-description", "fail"),
        issue("structure-h1", "pass"),
      ],
      [
        issue("meta-title", "fail"),
        issue("meta-description", "pass"),
        issue("structure-h1", "pass"),
      ],
    );

    const byId = Object.fromEntries(rows.map((row) => [row.ruleId, row]));
    expect(byId["meta-description"]).toMatchObject({
      weLose: true,
      weWin: false,
    });
    expect(byId["meta-title"]).toMatchObject({ weLose: false, weWin: true });
    expect(byId["structure-h1"]).toMatchObject({
      weLose: false,
      weWin: false,
    });
  });

  it("treats a warn as not passing", () => {
    const rows = compareIssues(
      [issue("meta-title", "warn")],
      [issue("meta-title", "pass")],
    );
    expect(rows[0].weLose).toBe(true);
  });

  it("shows a rule measured on one side only as a dash, and never as a loss", () => {
    // A rule that did not run and a rule that passed are different facts.
    // Collapsing them flatters whichever side was not measured.
    const rows = compareIssues([issue("meta-title", "fail")], []);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      ours: "fail",
      theirs: null,
      weLose: false,
      weWin: false,
    });
  });

  it("puts losses first, then wins, then ties, by severity within each", () => {
    const rows = compareIssues(
      [
        issue("tie", "pass", "critical"),
        issue("loss-low", "fail", "low"),
        issue("loss-critical", "fail", "critical"),
        issue("win", "pass", "high"),
      ],
      [
        issue("tie", "pass", "critical"),
        issue("loss-low", "pass", "low"),
        issue("loss-critical", "pass", "critical"),
        issue("win", "fail", "high"),
      ],
    );

    expect(rows.map((row) => row.ruleId)).toEqual([
      "loss-critical",
      "loss-low",
      "win",
      "tie",
    ]);
  });
});

describe("countDeficit", () => {
  it("counts only the rules we lose", () => {
    const rows = compareIssues(
      [issue("a", "fail"), issue("b", "fail"), issue("c", "pass")],
      [issue("a", "pass"), issue("b", "fail"), issue("c", "fail")],
    );
    expect(countDeficit(rows)).toBe(1);
  });
});
