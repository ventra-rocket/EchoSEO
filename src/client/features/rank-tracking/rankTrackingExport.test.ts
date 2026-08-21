/**
 * What the exported table promises. The Search Console columns travel to people
 * who never saw the page they came from, so the file itself has to carry the
 * window and has to distinguish a measured zero from a value never read.
 */
import { describe, expect, it } from "vitest";
import { buildRankTrackingExport } from "./RankTrackingTableParts";
import type {
  RankTrackingRow,
  RankTrackingRowActuals,
} from "@/types/schemas/rank-tracking";

const WINDOW = { from: "2026-07-24", to: "2026-08-18" };

function row(
  keyword: string,
  gsc: RankTrackingRowActuals | null,
): RankTrackingRow {
  return {
    trackingKeywordId: `kw-${keyword}`,
    keyword,
    searchVolume: 100,
    keywordDifficulty: 20,
    cpc: 1.5,
    desktop: {
      position: 4,
      previousPosition: 6,
      rankingUrl: "/a",
      serpFeatures: [],
    },
    mobile: {
      position: null,
      previousPosition: null,
      rankingUrl: null,
      serpFeatures: [],
    },
    gsc,
  };
}

describe("buildRankTrackingExport", () => {
  it("omits the Search Console columns entirely when the overlay is absent", () => {
    const { headers, rows } = buildRankTrackingExport(
      [row("seo tools", null)],
      true,
      false,
    );
    expect(headers.some((header) => header.startsWith("GSC"))).toBe(false);
    expect(rows[0]).toHaveLength(headers.length);
  });

  it("names the window in every Search Console header", () => {
    const { headers } = buildRankTrackingExport(
      [row("seo tools", null)],
      true,
      false,
      { window: WINDOW, complete: true },
    );
    expect(headers.slice(-3)).toEqual([
      "GSC Clicks (2026-07-24..2026-08-18)",
      "GSC Impressions (2026-07-24..2026-08-18)",
      "GSC Avg Position (2026-07-24..2026-08-18)",
    ]);
  });

  it("writes a measured zero when the whole query set was read", () => {
    const { rows } = buildRankTrackingExport(
      [row("never searched", null)],
      true,
      false,
      { window: WINDOW, complete: true },
    );
    // Clicks and impressions are zero because Google reported nothing; average
    // position stays empty, because no impressions means no position at all.
    expect(rows[0].slice(-3)).toEqual([0, 0, ""]);
  });

  it("leaves the cells empty when the read was truncated — unknown, not zero", () => {
    const { rows } = buildRankTrackingExport(
      [row("never searched", null)],
      true,
      false,
      { window: WINDOW, complete: false },
    );
    expect(rows[0].slice(-3)).toEqual(["", "", ""]);
  });

  it("exports the measured numbers, rounding position to one decimal", () => {
    const { rows } = buildRankTrackingExport(
      [
        row("seo tools", {
          clicks: 12,
          impressions: 340,
          ctr: 0.035,
          position: 8.4444,
        }),
      ],
      true,
      false,
      { window: WINDOW, complete: true },
    );
    expect(rows[0].slice(-3)).toEqual([12, 340, 8.4]);
  });
});
