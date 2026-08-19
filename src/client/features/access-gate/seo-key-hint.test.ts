import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSeoKeyConfiguredHint,
  resolveSeoKeyConfigured,
  setSeoKeyConfiguredHint,
} from "./seo-key-hint";

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

describe("DataForSEO key status hint storage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps one workspace's answer out of another workspace", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });

    setSeoKeyConfiguredHint("org-a", false);
    setSeoKeyConfiguredHint("org-b", true);

    expect(getSeoKeyConfiguredHint("org-a")).toBe(false);
    expect(getSeoKeyConfiguredHint("org-b")).toBe(true);
    expect(getSeoKeyConfiguredHint("org-c")).toBeNull();
  });

  it("does not create a browser-global hint without a workspace", () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", {
      localStorage: { getItem: vi.fn(), setItem },
    });

    setSeoKeyConfiguredHint(null, false);

    expect(getSeoKeyConfiguredHint(null)).toBeNull();
    expect(setItem).not.toHaveBeenCalled();
  });
});
