import { describe, expect, it } from "vitest";
import {
  emailDomain,
  isDisposableEmail,
  normalizeEmail,
} from "./disposable-email";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});

describe("emailDomain", () => {
  it("extracts the lowercased domain", () => {
    expect(emailDomain("User@Example.com")).toBe("example.com");
  });

  it("returns null when there is no domain", () => {
    expect(emailDomain("no-at-sign")).toBeNull();
    expect(emailDomain("trailing@")).toBeNull();
  });
});

describe("isDisposableEmail", () => {
  it("flags a known disposable provider", () => {
    expect(isDisposableEmail("throwaway@mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@YOPMAIL.com")).toBe(true);
  });

  it("allows normal providers", () => {
    expect(isDisposableEmail("real@gmail.com")).toBe(false);
    expect(isDisposableEmail("founder@startup.io")).toBe(false);
  });

  it("does not throw on a malformed address", () => {
    expect(isDisposableEmail("not-an-email")).toBe(false);
  });
});
