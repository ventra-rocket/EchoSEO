import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  readClientLocale,
  resolveLocale,
} from "./config";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isLocale", () => {
  it("accepts supported locales and rejects everything else", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("vi")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(123)).toBe(false);
  });
});

describe("resolveLocale", () => {
  it("passes through a supported locale", () => {
    expect(resolveLocale("vi")).toBe("vi");
  });

  it("strips a region suffix", () => {
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("vi-VN")).toBe("vi");
  });

  it("falls back to the default for anything unsupported", () => {
    expect(resolveLocale("fr")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("")).toBe(DEFAULT_LOCALE);
  });
});

describe("readClientLocale", () => {
  it("returns the default when there is no DOM", () => {
    expect(readClientLocale()).toBe(DEFAULT_LOCALE);
  });

  it("reads the persisted locale from the cookie", () => {
    vi.stubGlobal("document", {
      cookie: `theme=dark; ${LOCALE_COOKIE}=vi; other=1`,
    });
    expect(readClientLocale()).toBe("vi");
  });

  it("falls back to the browser language when no cookie is set", () => {
    vi.stubGlobal("document", { cookie: "theme=dark" });
    vi.stubGlobal("navigator", { language: "vi-VN" });
    expect(readClientLocale()).toBe("vi");
  });
});
