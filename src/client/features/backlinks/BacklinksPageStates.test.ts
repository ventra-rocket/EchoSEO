import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import {
  BacklinksErrorState,
  BacklinksOverviewEmptyState,
} from "./BacklinksPageStates";
import { en } from "@/client/i18n/messages/en";

// The states under test link to the help page; the router itself is not.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement("a", { href: to }, children),
  linkOptions: (options: unknown) => options,
}));

function renderWithIntl(node: ReactNode): string {
  return renderToStaticMarkup(
    createElement(IntlProvider, { locale: "en", messages: en }, node),
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
    expect(markup).toContain("Retry");
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

  it("still reports a real failed request as retryable", () => {
    const markup = renderWithIntl(
      createElement(BacklinksOverviewEmptyState, {
        seoKeyMissing: false,
        errorMessage: "Could not load backlinks data.",
        onRetry: vi.fn(),
      }),
    );

    expect(markup).toContain("Could not load backlinks data.");
    expect(markup).toContain("Retry");
    expect(markup).not.toContain("No DataForSEO API key connected");
  });
});
