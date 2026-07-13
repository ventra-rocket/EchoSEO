import { describe, expect, it } from "vitest";
import { escapeHtml } from "./output-encode";

describe("escapeHtml", () => {
  it("neutralizes a malicious page title", () => {
    const malicious = '<script>alert("pwned")</script>';
    const escaped = escapeHtml(malicious);

    expect(escaped).not.toContain("<script>");
    expect(escaped).toBe(
      "&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;",
    );
  });

  it("escapes ampersands and single quotes", () => {
    expect(escapeHtml("Fish & Chips' Best")).toBe("Fish &amp; Chips&#39; Best");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("A Complete Guide to SEO")).toBe(
      "A Complete Guide to SEO",
    );
  });
});
