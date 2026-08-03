import { describe, expect, it } from "vitest";
import { summarizeHeadingOutline } from "./heading-outline";

describe("summarizeHeadingOutline", () => {
  it("counts headings and finds the first skipped level", () => {
    expect(summarizeHeadingOutline("H1 › H2 › H4 › H2 › H1")).toEqual({
      headingCount: 5,
      firstSkip: { from: 2, to: 4 },
    });
  });

  it("reports the skip against the highest level seen, matching the rule", () => {
    // The server rule compares against the max level seen so far, not the
    // previous token — H1 › H3 skips even though H3 follows H1 directly.
    expect(summarizeHeadingOutline("H1 › H3 › H3")).toEqual({
      headingCount: 3,
      firstSkip: { from: 1, to: 3 },
    });
  });

  it("returns no skip for a well-ordered outline", () => {
    expect(summarizeHeadingOutline("H1 › H2 › H3 › H2 › H3")).toEqual({
      headingCount: 5,
      firstSkip: null,
    });
  });

  it("summarizes a single heading", () => {
    expect(summarizeHeadingOutline("H1")).toEqual({
      headingCount: 1,
      firstSkip: null,
    });
  });

  it("handles a long outline without truncating the count", () => {
    const outline = ["H1", ...Array.from({ length: 213 }, () => "H3")].join(
      " › ",
    );
    expect(summarizeHeadingOutline(outline)).toEqual({
      headingCount: 214,
      firstSkip: { from: 1, to: 3 },
    });
  });

  it("rejects strings that are not outlines rather than mis-summarizing", () => {
    expect(summarizeHeadingOutline("")).toBeNull();
    expect(summarizeHeadingOutline("index, follow")).toBeNull();
    expect(summarizeHeadingOutline("H1 › potato › H2")).toBeNull();
    expect(summarizeHeadingOutline("H7")).toBeNull();
  });
});
