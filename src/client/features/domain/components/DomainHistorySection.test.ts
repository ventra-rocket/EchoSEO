import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DomainHistorySection } from "./DomainHistorySection";

// The states under test link to the help page; the router itself is not.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement("a", { href: to }, children),
  linkOptions: (options: unknown) => options,
}));

describe("DomainHistorySection", () => {
  it("names the missing key instead of asking for a domain again", () => {
    const markup = renderToStaticMarkup(
      createElement(DomainHistorySection, {
        history: [],
        historyLoaded: true,
        seoKeyMissing: true,
        onRemoveHistoryItem: vi.fn(),
        onSelectHistoryItem: vi.fn(),
      }),
    );

    expect(markup).toContain("No DataForSEO API key connected");
    expect(markup).toContain('href="/help/dataforseo-api-key"');
    expect(markup).not.toContain("Enter a domain to get started");
  });

  it("still prompts for a domain when a key is connected", () => {
    const markup = renderToStaticMarkup(
      createElement(DomainHistorySection, {
        history: [],
        historyLoaded: true,
        seoKeyMissing: false,
        onRemoveHistoryItem: vi.fn(),
        onSelectHistoryItem: vi.fn(),
      }),
    );

    expect(markup).toContain("Enter a domain to get started");
    expect(markup).not.toContain("No DataForSEO API key connected");
  });
});
