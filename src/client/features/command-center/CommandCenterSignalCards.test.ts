import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignalCards } from "./CommandCenterSignalCards";
import type { CommandCenterView } from "./command-center-view-model";

// The cards only need Link to produce an href and intl to produce a string; the
// router and the catalog are exercised by their own tests.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params?: { projectId?: string };
    children?: ReactNode;
  }) =>
    createElement(
      "a",
      { href: to.replace("$projectId", params?.projectId ?? "") },
      children,
    ),
}));

vi.mock("react-intl", () => ({
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }) => id,
    formatDate: (iso: string) => iso,
  }),
}));

const view: CommandCenterView = {
  gsc: { state: "connected" },
  auditProgress: { state: "none" },
  issues: { state: "no-audit" },
  rank: { state: "not-configured" },
  nextAction: { state: "complete" },
  sources: { gsc: "ok", audit: "ok", rank: "ok", issue: "ok" },
  dataForSeoConfigured: false,
};

function render() {
  return renderToStaticMarkup(
    createElement(SignalCards, { projectId: "p1", view }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SignalCards — the AI workspace card", () => {
  it("links the in-app assistant where the deployment can serve it", () => {
    vi.stubEnv("AUTH_MODE", "local_noauth");

    const markup = render();

    expect(markup).toContain('href="/p/p1/assistant"');
    expect(markup).toContain("commandCenter.detail.aiWorkspace");
  });

  it("points at MCP setup in hosted mode instead of a page that refuses", () => {
    // Hosted returns `available: false` from getAssistantWorkspaceIdentity, so
    // sending the user to the assistant page advertises a refusal as a feature.
    vi.stubEnv("AUTH_MODE", "hosted");

    const markup = render();

    expect(markup).toContain('href="/ai"');
    expect(markup).not.toContain('href="/p/p1/assistant"');
    expect(markup).toContain("commandCenter.detail.aiWorkspaceHosted");
  });

  it("keeps the other three cards in both modes", () => {
    for (const mode of ["hosted", "local_noauth"]) {
      vi.stubEnv("AUTH_MODE", mode);
      const markup = render();

      expect(markup).toContain('href="/p/p1/audit"');
      expect(markup).toContain('href="/p/p1/rank-tracking"');
    }
  });
});
