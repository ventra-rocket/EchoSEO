import { describe, expect, it } from "vitest";
import {
  buildPageMatches,
  MATCH_CONFIDENCE_THRESHOLD,
  scoreUrlPair,
} from "./page-matching";

const OURS = "https://thehourglass.test";
const THEIRS = "https://cortinawatch.test";

describe("scoreUrlPair", () => {
  it("scores an identical path 1", () => {
    expect(scoreUrlPair(`${OURS}/brand/rolex`, `${THEIRS}/brand/rolex`)).toBe(
      1,
    );
  });

  it("ignores a trailing slash", () => {
    expect(scoreUrlPair(`${OURS}/about/`, `${THEIRS}/about`)).toBe(1);
  });

  it("pairs both homepages, including a locale-prefixed one", () => {
    // The one comparison every reader expects, and token overlap cannot see it:
    // after stripping shelving and locale both sides have no tokens left.
    expect(scoreUrlPair(`${OURS}/`, `${THEIRS}/`)).toBe(1);
    expect(scoreUrlPair(`${OURS}/`, `${THEIRS}/en`)).toBe(1);
  });

  it("matches the plan's example across different site structures", () => {
    // /brand/rolex against /en/rolex/discover — obviously the same page, and the
    // reason segment matching is weighted alongside token overlap.
    const score = scoreUrlPair(
      `${OURS}/brand/rolex`,
      `${THEIRS}/en/rolex/discover`,
    );
    expect(score).toBeGreaterThanOrEqual(MATCH_CONFIDENCE_THRESHOLD);
    expect(score).toBe(0.75);
  });

  it("refuses synonyms it cannot see in the URL", () => {
    // Same page to a human, nothing in common to a matcher. Guessing here is
    // what produces a confident-looking comparison of two unrelated pages.
    expect(scoreUrlPair(`${OURS}/pricing`, `${THEIRS}/plans`)).toBe(0);
  });

  it("does not let shelving alone create a match", () => {
    // Both are /collections/<something>; the only shared token is structural.
    expect(
      scoreUrlPair(`${OURS}/collections/omega`, `${THEIRS}/collections/rolex`),
    ).toBe(0);
  });

  it("ignores numeric ids, which never correspond between two sites", () => {
    expect(
      scoreUrlPair(`${OURS}/product/12345`, `${THEIRS}/product/98765`),
    ).toBe(0);
  });

  it("scores a partial word overlap below a full one", () => {
    const partial = scoreUrlPair(`${OURS}/about`, `${THEIRS}/about-us`);
    const full = scoreUrlPair(`${OURS}/about`, `${THEIRS}/about`);
    expect(partial).toBeLessThan(full);
    expect(partial).toBeGreaterThan(0);
  });

  it("returns 0 for an unparseable url instead of throwing", () => {
    expect(scoreUrlPair("not a url", `${THEIRS}/about`)).toBe(0);
  });
});

describe("buildPageMatches", () => {
  it("pairs each url at most once, best score first", () => {
    const matches = buildPageMatches({
      ourUrls: [`${OURS}/brand/rolex`, `${OURS}/brand/omega`],
      theirUrls: [
        `${THEIRS}/en/rolex/discover`,
        `${THEIRS}/en/omega/discover`,
        `${THEIRS}/en/rolex`,
      ],
      limit: 10,
    });

    expect(matches).toHaveLength(2);
    const ours = matches.map((m) => m.ourUrl);
    expect(new Set(ours).size).toBe(2);
    const theirs = matches.map((m) => m.theirUrl);
    expect(new Set(theirs).size).toBe(2);
    // /brand/rolex takes its best counterpart; the second rolex page is not
    // reused for omega.
    expect(matches[0].confidence).toBeGreaterThanOrEqual(matches[1].confidence);
  });

  it("keeps a low-scoring pair but flags it for a human", () => {
    const matches = buildPageMatches({
      ourUrls: [`${OURS}/about`],
      theirUrls: [`${THEIRS}/about-us-and-our-history-since-1979`],
      limit: 5,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].confident).toBe(false);
    expect(matches[0].confidence).toBeGreaterThan(0);
  });

  it("returns nothing when no pair shares anything", () => {
    expect(
      buildPageMatches({
        ourUrls: [`${OURS}/pricing`],
        theirUrls: [`${THEIRS}/plans`, `${THEIRS}/contact`],
        limit: 5,
      }),
    ).toEqual([]);
  });

  it("respects the limit", () => {
    const matches = buildPageMatches({
      ourUrls: ["/a", "/b", "/c", "/d"].map((p) => `${OURS}${p}`),
      theirUrls: ["/a", "/b", "/c", "/d"].map((p) => `${THEIRS}${p}`),
      limit: 2,
    });
    expect(matches).toHaveLength(2);
  });

  it("is deterministic when scores tie", () => {
    const input = {
      ourUrls: [`${OURS}/rolex`, `${OURS}/omega`],
      theirUrls: [`${THEIRS}/omega`, `${THEIRS}/rolex`],
      limit: 5,
    };
    const first = buildPageMatches(input);
    const second = buildPageMatches({
      ourUrls: input.ourUrls.toReversed(),
      theirUrls: input.theirUrls.toReversed(),
      limit: 5,
    });

    expect(first.map((m) => `${m.ourUrl}|${m.theirUrl}`)).toEqual(
      second.map((m) => `${m.ourUrl}|${m.theirUrl}`),
    );
  });
});
