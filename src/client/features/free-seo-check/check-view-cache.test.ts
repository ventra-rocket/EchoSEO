import { describe, expect, it } from "vitest";
import {
  peekCheckView,
  seedCheckView,
  takeCheckView,
  type CheckView,
} from "./check-view-cache";
import { LITE_REPORT_FIXTURE } from "../../../../e2e/fixtures/lite-report-fixture";

// The cache only stores and hands the view back by reference — it never reads
// the report — but a real fixture keeps the types honest with no assertion.
const view: CheckView = {
  report: LITE_REPORT_FIXTURE,
  locale: "en",
  createdAt: "2026-08-04T00:00:00.000Z",
  deepAvailable: true,
};

describe("check-view hand-off cache", () => {
  it("peeks without consuming, then take consumes exactly once", () => {
    seedCheckView("id-1", view);

    // peek is pure — the render-time initializer can call it under StrictMode's
    // double-invoke without draining the seed.
    expect(peekCheckView("id-1")).toBe(view);
    expect(peekCheckView("id-1")).toBe(view);

    // take drains it — the shared page renders the seed once, then a later mount
    // for the same id must fall through to the network.
    expect(takeCheckView("id-1")).toBe(view);
    expect(peekCheckView("id-1")).toBeUndefined();
    expect(takeCheckView("id-1")).toBeUndefined();
  });

  it("returns undefined for an id that was never seeded", () => {
    expect(peekCheckView("never")).toBeUndefined();
    expect(takeCheckView("never")).toBeUndefined();
  });
});
