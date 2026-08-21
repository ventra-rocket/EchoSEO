/**
 * The GSC cell tooltips' one load-bearing claim: what an absent tracked
 * keyword means. A `complete` read only proves Search Console was allowed to
 * page through the whole query set — it never proves a keyword had zero
 * impressions, because Google omits anonymized (privacy-thresholded) queries
 * from the report at any read depth. These tests pin that the copy says so
 * instead of asserting a proof the read cannot make.
 *
 * gscCountTooltip/gscPositionTooltip return a message id, not English prose —
 * GscCountCell/GscPositionCell resolve it through react-intl (see
 * RankTrackingTableParts.tsx's own comment) — so the semantic pin below reads
 * the English catalog entry the id points at, not the function's return value
 * directly.
 */
import { describe, expect, it } from "vitest";
import { gscCountTooltip, gscPositionTooltip } from "./RankTrackingTableParts";
import { rankTable as en } from "@/client/i18n/messages/en/rankTable";

describe("gscCountTooltip", () => {
  it("picks the complete-read id for a complete read", () => {
    expect(gscCountTooltip(true)).toBe("rank.table.gsc.tooltip.countComplete");
  });

  it("picks the truncated-read id for a truncated read", () => {
    expect(gscCountTooltip(false)).toBe(
      "rank.table.gsc.tooltip.countTruncated",
    );
  });

  it("does not claim a complete read proves zero impressions", () => {
    const tooltip = en[gscCountTooltip(true)];
    expect(tooltip).not.toMatch(/recorded no impressions/i);
    expect(tooltip).toMatch(/omitted|anonymiz/i);
  });

  it("keeps the incomplete-read wording unchanged: unknown, not zero", () => {
    expect(en[gscCountTooltip(false)]).toBe(
      "Outside the queries read from Search Console — unknown, not zero",
    );
  });
});

describe("gscPositionTooltip", () => {
  it("picks the complete-read id for a complete read", () => {
    expect(gscPositionTooltip(true)).toBe(
      "rank.table.gsc.tooltip.positionComplete",
    );
  });

  it("picks the truncated-read id for a truncated read", () => {
    expect(gscPositionTooltip(false)).toBe(
      "rank.table.gsc.tooltip.positionTruncated",
    );
  });

  it("does not claim a complete read proves there were no impressions", () => {
    const tooltip = en[gscPositionTooltip(true)];
    expect(tooltip).not.toMatch(/^No impressions in the window/);
    expect(tooltip).toMatch(/omitted|anonymiz/i);
  });

  it("keeps the incomplete-read wording unchanged: no measurement available", () => {
    expect(en[gscPositionTooltip(false)]).toBe(
      "Outside the queries read from Search Console — no measurement available",
    );
  });
});
