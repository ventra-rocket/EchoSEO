import { describe, expect, it } from "vitest";
import { isProviderAuthFailureMessage } from "./provider-failure";

describe("isProviderAuthFailureMessage", () => {
  it("matches the message core.ts builds for a rejected credential", () => {
    expect(
      isProviderAuthFailureMessage(
        "DataForSEO HTTP 401 on /v3/serp/google/organic/task_post (40100: Authentication failed)",
      ),
    ).toBe(true);
  });

  it("matches a 403, which is an account that will not serve rather than a bad key", () => {
    expect(
      isProviderAuthFailureMessage(
        "DataForSEO HTTP 403 on /v3/serp/google/organic/live/advanced (40104: Please verify your account before using the API)",
      ),
    ).toBe(true);
  });

  /** The literal row a keyless organization's scheduled check leaves behind:
   * RankCheckWorkflow wraps `error.message`, and the missing-key AppError
   * carries text, not its code. Matching the code alone missed this entirely. */
  it("matches the run row a missing key actually produces", () => {
    expect(
      isProviderAuthFailureMessage(
        "Completed 0 of 12 keyword(s). Error: No DataForSEO API key configured for this organization",
      ),
    ).toBe(true);
  });

  it("matches a bare AppError code, which is its message when none is given", () => {
    expect(isProviderAuthFailureMessage("DATAFORSEO_AUTH_FAILED")).toBe(true);
    expect(isProviderAuthFailureMessage("DATAFORSEO_KEY_MISSING")).toBe(true);
  });

  it("ignores failures the provider had nothing to do with", () => {
    expect(
      isProviderAuthFailureMessage("3 keyword(s) could not be checked"),
    ).toBe(false);
    expect(
      isProviderAuthFailureMessage("DataForSEO HTTP 429 on /v3/serp"),
    ).toBe(false);
    expect(
      isProviderAuthFailureMessage("DataForSEO HTTP 500 on /v3/serp"),
    ).toBe(false);
  });

  it("does not match a status that merely starts with 401 or 403", () => {
    expect(
      isProviderAuthFailureMessage("DataForSEO HTTP 4011 on /v3/serp"),
    ).toBe(false);
  });

  it("treats a missing message as not a provider failure", () => {
    expect(isProviderAuthFailureMessage(null)).toBe(false);
    expect(isProviderAuthFailureMessage(undefined)).toBe(false);
    expect(isProviderAuthFailureMessage("")).toBe(false);
  });
});
