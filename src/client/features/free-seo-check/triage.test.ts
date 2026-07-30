import { describe, expect, it } from "vitest";
import type { Signal } from "@/server/services/seo-check/types";
import { triageSignals } from "./triage";

function signal(id: string, status: Signal["status"]): Signal {
  return {
    id,
    category: "meta",
    status,
    label: id,
    severity: "high",
    problem: "",
    fixSteps: [],
    googleSourceUrl: "",
    guideQuote: "",
    lastReviewedDate: "2026-01-01",
  };
}

describe("triageSignals", () => {
  it("puts failures before warnings and keeps passes out of the list", () => {
    // The defect this exists to fix: in rule-definition order a failure could
    // sit ninth, under eight passing rows of identical weight.
    const triaged = triageSignals([
      signal("a", "pass"),
      signal("b", "warn"),
      signal("c", "pass"),
      signal("d", "fail"),
      signal("e", "warn"),
    ]);

    expect(triaged.actionable.map((s) => s.id)).toEqual(["d", "b", "e"]);
    expect(triaged.passed.map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("keeps catalog order within one status", () => {
    // Ties must not reshuffle: the catalog groups by category, and a reader
    // scanning twice should see the same order both times.
    const triaged = triageSignals([
      signal("x", "warn"),
      signal("y", "warn"),
      signal("z", "warn"),
    ]);
    expect(triaged.actionable.map((s) => s.id)).toEqual(["x", "y", "z"]);
  });

  it("counts every status, including the ones it does not list", () => {
    const triaged = triageSignals([
      signal("a", "pass"),
      signal("b", "pass"),
      signal("c", "fail"),
    ]);
    expect(triaged.counts).toEqual({ fail: 1, warn: 0, pass: 2 });
  });

  it("does not mutate the caller's array", () => {
    // React hands the same array on every render; sorting in place would
    // reorder the report under the component.
    const input = [signal("a", "pass"), signal("b", "fail")];
    triageSignals(input);
    expect(input.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("handles a report with nothing wrong", () => {
    const triaged = triageSignals([signal("a", "pass")]);
    expect(triaged.actionable).toEqual([]);
    expect(triaged.counts.fail).toBe(0);
  });
});
