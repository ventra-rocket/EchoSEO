import { describe, expect, it } from "vitest";
import {
  findPagesDroppedFromTop10,
  type PagePosition,
} from "@/server/features/audit/history/top10-drop";

function pos(url: string, position: number, impressions = 100): PagePosition {
  return { url, position, impressions };
}

describe("findPagesDroppedFromTop10", () => {
  it("reports a page that slipped from ≤10 to >10", () => {
    const drop = findPagesDroppedFromTop10(
      [pos("https://x/a", 14)],
      [pos("https://x/a", 6)],
    );
    expect(drop.total).toBe(1);
    expect(drop.pages[0]).toEqual({
      url: "https://x/a",
      prevPosition: 6,
      position: 14,
    });
  });

  it("reports a page that disappeared this window (0 impressions) as null position", () => {
    const drop = findPagesDroppedFromTop10([], [pos("https://x/a", 8)]);
    expect(drop.total).toBe(1);
    expect(drop.pages[0]).toEqual({
      url: "https://x/a",
      prevPosition: 8,
      position: null,
    });
  });

  it("does NOT report a page that stayed in the top 10", () => {
    const drop = findPagesDroppedFromTop10(
      [pos("https://x/a", 9)],
      [pos("https://x/a", 5)],
    );
    expect(drop.total).toBe(0);
  });

  it("does NOT report a page that was already outside the top 10 (cannot drop from outside)", () => {
    const drop = findPagesDroppedFromTop10(
      [pos("https://x/a", 30)],
      [pos("https://x/a", 12)], // previously #12, never in the top 10
    );
    expect(drop.total).toBe(0);
  });

  it("does NOT count a previous page with zero impressions as having ranked", () => {
    const drop = findPagesDroppedFromTop10(
      [],
      [pos("https://x/a", 3, 0)], // position looks great but no impressions
    );
    expect(drop.total).toBe(0);
  });

  it("counts every drop but caps the displayed list, ordered by previous impressions", () => {
    const previous = Array.from({ length: 60 }, (_, i) =>
      pos(`https://x/p${i}`, 5, i + 1),
    );
    const drop = findPagesDroppedFromTop10([], previous, { limit: 50 });
    expect(drop.total).toBe(60);
    expect(drop.pages).toHaveLength(50);
    // Highest previous impressions first.
    expect(drop.pages[0]?.url).toBe("https://x/p59");
  });

  it("does NOT infer a drop from absence when the current row set was truncated", () => {
    // On a truncated current set, an absent page may just be below the click
    // cutoff. Absence proves nothing; only a present position > 10 is a drop.
    const absent = findPagesDroppedFromTop10([], [pos("https://x/a", 8)], {
      currentComplete: false,
    });
    expect(absent.total).toBe(0);

    // A present page past 10 is still reported even on a truncated set.
    const present = findPagesDroppedFromTop10(
      [pos("https://x/a", 15)],
      [pos("https://x/a", 8)],
      { currentComplete: false },
    );
    expect(present.total).toBe(1);
  });

  it("treats position exactly 10 as still in the top 10", () => {
    // Boundary: 10 → 11 is a drop; a page at 10 that stays at 10 is not.
    const dropped = findPagesDroppedFromTop10(
      [pos("https://x/a", 11)],
      [pos("https://x/a", 10)],
    );
    expect(dropped.total).toBe(1);

    const held = findPagesDroppedFromTop10(
      [pos("https://x/a", 10)],
      [pos("https://x/a", 10)],
    );
    expect(held.total).toBe(0);
  });
});
