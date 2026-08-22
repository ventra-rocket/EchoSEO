import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import {
  BacklinksErrorState,
  BacklinksOverviewEmptyState,
  BacklinksSetupGate,
} from "./BacklinksPageStates";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

// The states under test link to the help page; the router itself is not.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement("a", { href: to }, children),
  linkOptions: (options: unknown) => options,
}));

function renderWithIntl(node: ReactNode, locale: "en" | "vi" = "en"): string {
  return renderToStaticMarkup(
    createElement(
      IntlProvider,
      { locale, messages: locale === "en" ? en : viMessages },
      node,
    ),
  );
}

describe("BacklinksErrorState", () => {
  it("renders a visible retry state", () => {
    const markup = renderWithIntl(
      createElement(BacklinksErrorState, {
        errorMessage: "Could not load backlinks data.",
        onRetry: vi.fn(),
      }),
    );

    expect(markup).toContain("Could not load backlinks");
    expect(markup).toContain("Could not load backlinks data.");
    expect(markup).toContain("Try again");
  });

  it("renders the same retry state in Vietnamese", () => {
    const markup = renderWithIntl(
      createElement(BacklinksErrorState, {
        errorMessage: "Không thể tải dữ liệu liên kết trỏ về.",
        onRetry: vi.fn(),
      }),
      "vi",
    );

    expect(markup).toContain("Không thể tải dữ liệu liên kết trỏ về");
    expect(markup).toContain("Không thể tải dữ liệu liên kết trỏ về.");
    expect(markup).toContain("Thử lại");
    expect(markup).not.toContain("Could not load backlinks");
    expect(markup).not.toContain("Retry");
  });
});

describe("BacklinksOverviewEmptyState", () => {
  it("reports the missing key and offers no retry that cannot fire", () => {
    const markup = renderWithIntl(
      createElement(BacklinksOverviewEmptyState, {
        seoKeyMissing: true,
        errorMessage: null,
        onRetry: vi.fn(),
      }),
    );

    expect(markup).toContain("No DataForSEO API key connected");
    expect(markup).toContain('href="/help/dataforseo-api-key"');
    expect(markup).not.toContain("Could not load backlinks");
    expect(markup).not.toContain("Retry");
  });

  it("reports the missing key in Vietnamese", () => {
    const markup = renderWithIntl(
      createElement(BacklinksOverviewEmptyState, {
        seoKeyMissing: true,
        errorMessage: null,
        onRetry: vi.fn(),
      }),
      "vi",
    );

    // Shared seoProvider.keyMissing.* copy — owned elsewhere, only confirmed
    // here to compose correctly inside this surface's empty state.
    expect(markup).toContain("Chưa kết nối khóa API DataForSEO");
    expect(markup).toContain('href="/help/dataforseo-api-key"');
    expect(markup).not.toContain("Không thể tải dữ liệu liên kết trỏ về");
    expect(markup).not.toContain("Thử lại");
  });

  it("still reports a real failed request as retryable", () => {
    const markup = renderWithIntl(
      createElement(BacklinksOverviewEmptyState, {
        seoKeyMissing: false,
        errorMessage: "Could not load backlinks data.",
        onRetry: vi.fn(),
      }),
    );

    expect(markup).toContain("Could not load backlinks data.");
    expect(markup).toContain("Try again");
    expect(markup).not.toContain("No DataForSEO API key connected");
  });

  it("still reports a real failed request as retryable in Vietnamese", () => {
    const markup = renderWithIntl(
      createElement(BacklinksOverviewEmptyState, {
        seoKeyMissing: false,
        errorMessage: "Không thể tải dữ liệu liên kết trỏ về.",
        onRetry: vi.fn(),
      }),
      "vi",
    );

    expect(markup).toContain("Không thể tải dữ liệu liên kết trỏ về.");
    expect(markup).toContain("Thử lại");
    expect(markup).not.toContain("Chưa kết nối khóa API DataForSEO");
  });
});

describe("BacklinksSetupGate", () => {
  it("renders the DataForSEO enablement gate in Vietnamese", () => {
    const markup = renderWithIntl(
      createElement(BacklinksSetupGate, {
        errorMessage: null,
        isRefetching: false,
        onRetry: vi.fn(),
      }),
      "vi",
    );

    expect(markup).toContain("Bật tính năng Liên kết trỏ về");
    expect(markup).toContain("chưa bật tính năng Liên kết trỏ về");
    // The {price}/month ICU value — asserted on the surrounding text rather
    // than the formatted currency glyph, which depends on the runtime's ICU
    // data rather than on this conversion.
    expect(markup).toContain("/tháng");
    expect(markup).toContain("dùng EchoSEO managed");
    expect(markup).toContain("Xác nhận quyền truy cập DataForSEO");
    expect(markup).toContain("Mở Liên kết trỏ về trên DataForSEO");
    // DataForSEO and EchoSEO are shipped brand exemptions — stay untranslated.
    expect(markup).toContain("DataForSEO");
    expect(markup).toContain("EchoSEO");
  });
});
