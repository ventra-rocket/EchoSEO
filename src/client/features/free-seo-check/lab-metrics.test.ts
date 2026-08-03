import { describe, expect, it } from "vitest";
import { CWV_METRICS } from "./score-summary";
import { FREE_LAB_METRICS } from "./lab-metrics";

describe("FREE_LAB_METRICS", () => {
  it("labels the inpMs slot TBT and scores it with Lighthouse TBT cutoffs", () => {
    // The lab shaping stores Total Blocking Time in `inpMs`. Presenting it
    // under INP's 200/500ms bands would issue a CWV verdict about a metric
    // that is not the Core Web Vital — the panel must use TBT's own cutoffs.
    const tbt = FREE_LAB_METRICS.find((metric) => metric.key === "inpMs");
    expect(tbt?.label).toBe("TBT");
    expect(tbt?.good).toBe(200);
    expect(tbt?.needsImprovement).toBe(600);
  });

  it("never presents the slot as INP", () => {
    expect(FREE_LAB_METRICS.some((metric) => metric.label === "INP")).toBe(
      false,
    );
  });

  it.each(["lcpMs", "cls", "ttfbMs"] as const)(
    "shares the Deep report's %s row so verdicts cannot diverge",
    (key) => {
      const free = FREE_LAB_METRICS.find((metric) => metric.key === key);
      const deep = CWV_METRICS.find((metric) => metric.key === key);
      expect(free).toBe(deep);
    },
  );

  it("covers all four lab metrics exactly once", () => {
    expect(FREE_LAB_METRICS.map((metric) => metric.key).toSorted()).toEqual([
      "cls",
      "inpMs",
      "lcpMs",
      "ttfbMs",
    ]);
  });
});
