import { describe, expect, it } from "vitest";
import { resolveSeoKeyConfigured } from "./seo-key-hint";

describe("resolveSeoKeyConfigured", () => {
  it("prefers the server answer over the stored hint", () => {
    expect(
      resolveSeoKeyConfigured({
        answer: true,
        hint: false,
        setupModalDismissed: true,
      }),
    ).toBe(true);
    expect(
      resolveSeoKeyConfigured({
        answer: false,
        hint: true,
        setupModalDismissed: false,
      }),
    ).toBe(false);
  });

  it("paints the banner from the hint before the answer arrives", () => {
    // The defect this fixes: page renders, then the banner drops in and pushes
    // every click target down.
    expect(
      resolveSeoKeyConfigured({
        answer: null,
        hint: false,
        setupModalDismissed: true,
      }),
    ).toBe(false);
  });

  it("keeps the banner out of the first paint for a configured key", () => {
    expect(
      resolveSeoKeyConfigured({
        answer: null,
        hint: true,
        setupModalDismissed: true,
      }),
    ).toBe(true);
  });

  it("ignores the hint while the setup modal can still open", () => {
    // Otherwise the banner paints, the modal opens and collapses it, and the
    // dismissal brings it back: two shifts instead of one.
    expect(
      resolveSeoKeyConfigured({
        answer: null,
        hint: false,
        setupModalDismissed: false,
      }),
    ).toBeNull();
  });

  it("has nothing to say on the first ever visit", () => {
    expect(
      resolveSeoKeyConfigured({
        answer: null,
        hint: null,
        setupModalDismissed: true,
      }),
    ).toBeNull();
  });
});
