import { describe, expect, it } from "vitest";
import { classifyPageStatus } from "./http-status";

/**
 * Shared by the results table's status filter and the crawl summary's
 * redirect/broken counters. If these two ever disagreed, the card would
 * contradict the table it links to and the reader could not tell which is wrong.
 */
describe("classifyPageStatus", () => {
  it.each([
    [200, "ok"],
    [204, "ok"],
    [299, "ok"],
    [300, "redirect"],
    [301, "redirect"],
    [308, "redirect"],
    [399, "redirect"],
    [400, "error"],
    [404, "error"],
    [500, "error"],
    [503, "error"],
  ] as const)("classifies %i as %s", (statusCode, expected) => {
    expect(classifyPageStatus(statusCode)).toBe(expected);
  });

  it("treats an absent status as missing, not as an error", () => {
    // `audit_pages.status_code` is null when no response was obtained. Counting
    // those as broken would inflate the number with pages nobody proved anything
    // about.
    expect(classifyPageStatus(null)).toBe("missing");
    expect(classifyPageStatus(undefined)).toBe("missing");
  });

  it("treats the failed-fetch placeholder as missing", () => {
    // `emptyPageResult` writes statusCode 0 when the fetch threw.
    expect(classifyPageStatus(0)).toBe("missing");
  });

  it("does not report a 1xx as a proven page", () => {
    expect(classifyPageStatus(100)).toBe("missing");
  });
});
