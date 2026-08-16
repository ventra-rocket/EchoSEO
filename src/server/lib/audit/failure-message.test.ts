import { describe, expect, it } from "vitest";
import { describeAuditFailure } from "./failure-message";

describe("describeAuditFailure", () => {
  it("keeps the error name, because it carries the useful half", () => {
    // The real failure this exists for. Dropping the name would leave "Step
    // discover-urls-1 output is too large", which reads like a site problem.
    const error = new Error(
      "Step discover-urls-1 output is too large. Maximum allowed size is 1MiB.",
    );
    error.name = "WorkflowInternalError";

    expect(describeAuditFailure(error)).toBe(
      "WorkflowInternalError: Step discover-urls-1 output is too large. Maximum allowed size is 1MiB.",
    );
  });

  it("does not prefix a plain Error with its useless name", () => {
    expect(describeAuditFailure(new Error("D1 write failed"))).toBe(
      "D1 write failed",
    );
  });

  it("collapses whitespace so a stack trace cannot become the banner", () => {
    expect(describeAuditFailure(new Error("failed\n  at run (x.ts:1)"))).toBe(
      "failed at run (x.ts:1)",
    );
  });

  it("truncates to a length a banner can hold", () => {
    const described = describeAuditFailure(new Error("x".repeat(1_000)));

    expect(described).toHaveLength(300);
    expect(described.endsWith("…")).toBe(true);
  });

  it("says so rather than storing an empty reason", () => {
    expect(describeAuditFailure(new Error(""))).toBe(
      "The crawl stopped with an error that carried no message.",
    );
    expect(describeAuditFailure(undefined)).toBe("undefined");
  });
});
