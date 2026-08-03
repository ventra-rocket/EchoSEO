import { describe, expect, it } from "vitest";
import { isValidCheckUrl } from "./validate-check-url";

describe("isValidCheckUrl", () => {
  it("accepts schemeless domains, the checker's primary input shape", () => {
    expect(isValidCheckUrl("example.com")).toBe(true);
    expect(isValidCheckUrl("sub.example.com")).toBe(true);
    expect(isValidCheckUrl("kello.ventrarocket.vn")).toBe(true);
  });

  it("accepts full HTTP(S) URLs with paths and queries", () => {
    expect(isValidCheckUrl("https://example.com")).toBe(true);
    expect(isValidCheckUrl("https://example.com/path?x=1")).toBe(true);
    expect(isValidCheckUrl("http://example.com/en")).toBe(true);
  });

  it("accepts surrounding whitespace the submit path trims anyway", () => {
    expect(isValidCheckUrl("  example.com  ")).toBe(true);
  });

  it("rejects empty and whitespace-only input", () => {
    expect(isValidCheckUrl("")).toBe(false);
    expect(isValidCheckUrl("   ")).toBe(false);
  });

  it("rejects dotless tokens — the input that used to burn a token", () => {
    expect(isValidCheckUrl("not-a-valid-site")).toBe(false);
    expect(isValidCheckUrl("localhost")).toBe(false);
  });

  it("rejects malformed hosts", () => {
    expect(isValidCheckUrl("not a valid site")).toBe(false);
    expect(isValidCheckUrl("example..com")).toBe(false);
    expect(isValidCheckUrl("exa mple.com")).toBe(false);
  });

  it("rejects non-web schemes", () => {
    expect(isValidCheckUrl("javascript:alert(1)")).toBe(false);
    expect(isValidCheckUrl("data:text/html,hi")).toBe(false);
    expect(isValidCheckUrl("file:///etc/passwd")).toBe(false);
    expect(isValidCheckUrl("ftp://example.com")).toBe(false);
  });
});
