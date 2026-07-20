import { afterEach, describe, expect, it, vi } from "vitest";
import { recordCheckMetric } from "./metrics";

afterEach(() => vi.restoreAllMocks());

describe("recordCheckMetric", () => {
  // Log-based aggregation greps for this exact shape, so the format is a
  // contract, not an incidental string.
  it("emits a [metric] line with event and space-separated fields", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    recordCheckMetric("lite_check", {
      domain: "a.test",
      cached: false,
      score: 42,
    });

    expect(log).toHaveBeenCalledWith(
      "[metric] event=lite_check domain=a.test cached=false score=42",
    );
  });

  it("emits just the event when there are no fields", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    recordCheckMetric("deep_done");

    expect(log).toHaveBeenCalledWith("[metric] event=deep_done");
  });
});
