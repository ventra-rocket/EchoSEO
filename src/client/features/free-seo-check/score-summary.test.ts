import { describe, expect, it } from "vitest";
import { CWV_METRICS, metricTone, scoreCellBorders } from "./score-summary";

describe("metricTone", () => {
  it("treats the threshold itself as still passing (web.dev's <= semantics)", () => {
    expect(metricTone(2500, 2500, 4000)).toBe("text-success");
    expect(metricTone(2501, 2500, 4000)).toBe("text-warning");
    expect(metricTone(4000, 2500, 4000)).toBe("text-warning");
    expect(metricTone(4001, 2500, 4000)).toBe("text-error");
  });
});

describe("CWV_METRICS formatting", () => {
  const byKey = Object.fromEntries(CWV_METRICS.map((m) => [m.key, m]));

  it("renders each metric in its conventional unit", () => {
    expect(byKey.lcpMs.format(5320)).toBe("5.3s");
    expect(byKey.inpMs.format(183.4)).toBe("183ms");
    expect(byKey.cls.format(0.03)).toBe("0.03");
    expect(byKey.ttfbMs.format(48)).toBe("48ms");
  });
});

describe("scoreCellBorders", () => {
  // The matrix that keeps hairlines correct as the grid flips 2 -> 4 -> 2
  // columns across breakpoints. Asserted per index because a wrong class here
  // renders as a doubled or missing border, which no type check can catch.
  it("gives the first cell no base hairlines", () => {
    const cell = scoreCellBorders(0);
    expect(cell).not.toContain("border-l ");
    expect(cell).not.toMatch(/(^| )border-t( |$)/);
  });

  it("separates columns in the 2-col base grid", () => {
    expect(scoreCellBorders(1)).toMatch(/(^| )border-l( |$)/);
    expect(scoreCellBorders(1)).toContain("lg:border-l");
  });

  it("turns row hairlines into column hairlines at sm (4-col)", () => {
    const cell = scoreCellBorders(2);
    expect(cell).toMatch(/(^| )border-t( |$)/);
    expect(cell).toContain("sm:border-t-0");
    expect(cell).toContain("sm:border-l");
    // ...and back to a 2-col row split in the lg rail.
    expect(cell).toContain("lg:border-t");
    expect(cell).toContain("lg:border-l-0");
  });

  it("keeps a fifth cell's top hairline at sm (second 4-col row)", () => {
    expect(scoreCellBorders(4)).toContain("sm:border-t");
    expect(scoreCellBorders(4)).not.toContain("sm:border-t-0");
  });
});
