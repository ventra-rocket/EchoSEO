/**
 * The GSC cell tooltips' one load-bearing claim: what an absent tracked
 * keyword means. A `complete` read only proves Search Console was allowed to
 * page through the whole query set — it never proves a keyword had zero
 * impressions, because Google omits anonymized (privacy-thresholded) queries
 * from the report at any read depth. These tests pin that the copy says so
 * instead of asserting a proof the read cannot make.
 */
import { describe, expect, it } from "vitest";
import { gscCountTooltip, gscPositionTooltip } from "./RankTrackingTableParts";

describe("gscCountTooltip", () => {
  it("does not claim a complete read proves zero impressions", () => {
    const tooltip = gscCountTooltip(true);
    expect(tooltip).not.toMatch(/recorded no impressions/i);
    expect(tooltip).toMatch(/omitted|anonymiz/i);
  });

  it("keeps the incomplete-read wording unchanged: unknown, not zero", () => {
    expect(gscCountTooltip(false)).toBe(
      "Outside the queries read from Search Console — unknown, not zero",
    );
  });
});

describe("gscPositionTooltip", () => {
  it("does not claim a complete read proves there were no impressions", () => {
    const tooltip = gscPositionTooltip(true);
    expect(tooltip).not.toMatch(/^No impressions in the window/);
    expect(tooltip).toMatch(/omitted|anonymiz/i);
  });

  it("keeps the incomplete-read wording unchanged: no measurement available", () => {
    expect(gscPositionTooltip(false)).toBe(
      "Outside the queries read from Search Console — no measurement available",
    );
  });
});
