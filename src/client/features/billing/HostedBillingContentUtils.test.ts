import { describe, expect, it } from "vitest";
import {
  getUsdCurrencyAffixes,
  parseTopUpAmount,
} from "./HostedBillingContentUtils";

describe("parseTopUpAmount", () => {
  it("accepts valid whole-dollar amounts", () => {
    expect(parseTopUpAmount("20")).toEqual({ isValid: true, parsed: 20 });
    expect(parseTopUpAmount("10")).toEqual({ isValid: true, parsed: 10 });
    expect(parseTopUpAmount("99")).toEqual({ isValid: true, parsed: 99 });
  });

  it("rejects amounts below minimum", () => {
    expect(parseTopUpAmount("9")).toEqual({ isValid: false, parsed: 20 });
  });

  it("rejects amounts above maximum", () => {
    expect(parseTopUpAmount("100")).toEqual({ isValid: false, parsed: 20 });
  });

  it("rejects non-numeric input", () => {
    expect(parseTopUpAmount("abc")).toEqual({ isValid: false, parsed: 20 });
  });
});

describe("getUsdCurrencyAffixes", () => {
  it("puts the symbol before the amount in English", () => {
    expect(getUsdCurrencyAffixes("en")).toEqual({ prefix: "$", suffix: "" });
  });

  it("puts the symbol after the amount in Vietnamese", () => {
    // ICU separates the amount from "US$" with U+00A0 (NBSP), not a plain
    // space — asserting the literal codepoint so this doesn't silently pass
    // on a visually-identical but wrong character.
    expect(getUsdCurrencyAffixes("vi")).toEqual({
      prefix: "",
      suffix: "\u00A0US$",
    });
  });
});
