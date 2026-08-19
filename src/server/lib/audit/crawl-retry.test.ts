import { describe, expect, it } from "vitest";
import { classifyRefusal, congestionShare } from "./crawl-retry";

describe("classifyRefusal", () => {
  it.each([
    [429, "throttled"],
    [503, "throttled"],
    [0, "unanswered"],
    [502, "unanswered"],
    [504, "unanswered"],
  ] as const)("asks for %i again as %s", (statusCode, expected) => {
    expect(classifyRefusal(statusCode)).toBe(expected);
  });

  it.each([200, 301, 403, 404, 410, 500])(
    "records %i rather than retrying it",
    (statusCode) => {
      // A retry only makes sense where the response says nothing about the page.
      // A 500 is the site's own failure and a 404 is an answer.
      expect(classifyRefusal(statusCode)).toBeNull();
    },
  );

  it("treats an absent status as an answer, not a refusal", () => {
    // `audit_pages.status_code` is null for rows that were never fetched at all;
    // retrying from a stored null is not this function's business.
    expect(classifyRefusal(null)).toBeNull();
    expect(classifyRefusal(undefined)).toBeNull();
  });
});

describe("congestionShare", () => {
  it("reports a single explicit throttle as a small share, not a verdict", () => {
    // 429 and 503 are the server saying it in words, so one is acted on — but one
    // in twenty-five is a site that occasionally refuses, not a crawl to halve.
    expect(
      congestionShare({ throttled: 1, unanswered: 0, batchSize: 25 }),
    ).toBeCloseTo(0.04);
  });

  it("reports a wholesale refusal as the whole batch", () => {
    expect(
      congestionShare({ throttled: 25, unanswered: 0, batchSize: 25 }),
    ).toBe(1);
  });

  it("does not slow the whole crawl down for a couple of dead URLs", () => {
    // A site with a handful of broken links would otherwise drag every crawl to
    // the floor, which is the failure mode the adaptive rate exists to avoid.
    expect(
      congestionShare({ throttled: 0, unanswered: 3, batchSize: 25 }),
    ).toBe(0);
  });

  it("counts a batch that mostly went unanswered", () => {
    // The measured case: 1,210 of 5,000 requests died with no status and no 429
    // anywhere to explain them. A batch failing wholesale is about our load.
    expect(
      congestionShare({ throttled: 0, unanswered: 13, batchSize: 25 }),
    ).toBeCloseTo(0.52);
  });

  it("needs more than half, not exactly half", () => {
    expect(
      congestionShare({ throttled: 0, unanswered: 12, batchSize: 24 }),
    ).toBe(0);
    expect(
      congestionShare({ throttled: 0, unanswered: 13, batchSize: 24 }),
    ).toBeCloseTo(0.5417);
  });

  it("stays quiet on a clean batch", () => {
    expect(
      congestionShare({ throttled: 0, unanswered: 0, batchSize: 25 }),
    ).toBe(0);
  });

  it("says nothing about an empty batch instead of dividing by it", () => {
    expect(congestionShare({ throttled: 0, unanswered: 0, batchSize: 0 })).toBe(
      0,
    );
  });
});
