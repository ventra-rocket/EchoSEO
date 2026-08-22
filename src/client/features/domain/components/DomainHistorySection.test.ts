import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import { DomainHistorySection } from "./DomainHistorySection";
import { MESSAGES } from "@/client/i18n/messages";
import type { Locale } from "@/client/i18n/config";
import type { DomainHistoryItem } from "@/client/features/domain/types";

// The states under test link to the help page; the router itself is not.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement("a", { href: to }, children),
  linkOptions: (options: unknown) => options,
}));

function renderWithIntl(node: ReactNode, locale: Locale = "en"): string {
  return renderToStaticMarkup(
    createElement(IntlProvider, { locale, messages: MESSAGES[locale] }, node),
  );
}

const historyFixture: DomainHistoryItem[] = [
  {
    timestamp: new Date("2024-03-15T00:00:00Z").getTime(),
    domain: "example.com",
    subdomains: true,
    sort: "traffic",
    tab: "keywords",
  },
  {
    timestamp: new Date("2024-03-16T00:00:00Z").getTime(),
    domain: "other.com",
    subdomains: false,
    sort: "traffic",
    tab: "keywords",
  },
];

describe("DomainHistorySection", () => {
  it("names the missing key instead of asking for a domain again", () => {
    const markup = renderWithIntl(
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
    const markup = renderWithIntl(
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

  it("names the missing key in Vietnamese", () => {
    const markup = renderWithIntl(
      createElement(DomainHistorySection, {
        history: [],
        historyLoaded: true,
        seoKeyMissing: true,
        onRemoveHistoryItem: vi.fn(),
        onSelectHistoryItem: vi.fn(),
      }),
      "vi",
    );

    expect(markup).toContain("Chưa kết nối khóa API DataForSEO");
    expect(markup).not.toContain("Nhập tên miền để bắt đầu");
  });

  it("renders recent searches in Vietnamese with locale-aware dates and per-item scope", () => {
    const markup = renderWithIntl(
      createElement(DomainHistorySection, {
        history: historyFixture,
        historyLoaded: true,
        seoKeyMissing: false,
        onRemoveHistoryItem: vi.fn(),
        onSelectHistoryItem: vi.fn(),
      }),
      "vi",
    );

    // ICU plural count, not a hand-built "N recent searches" string.
    expect(markup).toContain("2 lượt tìm kiếm gần đây");
    // Per-item subdomains scope, both branches of the ternary.
    expect(markup).toContain("Bao gồm tên miền phụ");
    expect(markup).toContain("Chỉ tên miền gốc");
    // Vietnamese month abbreviation ("thg") only appears when the timestamp
    // goes through intl.formatDate with the active locale — the
    // toLocaleDateString(undefined, ...) it replaced ignores the app locale
    // entirely and would never produce it here.
    expect(markup).toContain("thg");
    // Remove affordance names what it removes for assistive tech.
    expect(markup).toContain("Xóa lượt tìm kiếm gần đây cho example.com");
    expect(markup).toContain("Xóa lượt tìm kiếm gần đây cho other.com");
  });
});
