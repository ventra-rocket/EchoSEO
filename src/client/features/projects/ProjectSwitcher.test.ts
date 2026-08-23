import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { ProjectSwitcher } from "./ProjectSwitcher";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { ProjectSummary } from "./types";

// The switcher only navigates on select, which these render-only tests never
// trigger; the router itself is not under test. `Link` still has to render its
// children so the "Manage projects" footer is observable.
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => () => {},
  Link: ({ children }: { children: ReactNode }) =>
    createElement("a", { href: "/projects" }, children),
}));

vi.mock("@/serverFunctions/projects", () => ({
  getProjects: vi.fn(),
}));

const CATALOGS = { en, vi: viMessages } as const;

function projects(count: number): ProjectSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    name: `Project ${index}`,
    domain: `site${index}.test`,
    createdAt: "2024-03-15T00:00:00.000Z",
  }));
}

function renderSwitcher(
  locale: keyof typeof CATALOGS,
  data: ProjectSummary[],
): { markup: string; errors: string[] } {
  const errors: string[] = [];
  const intl = createIntl({
    locale,
    messages: CATALOGS[locale],
    onError: (error) => errors.push(error.message),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(["projects"], data);

  const markup = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        RawIntlProvider,
        { value: intl },
        createElement(ProjectSwitcher, {
          activeProjectId: "p0",
          variant: "sidebar",
        }),
      ),
    ),
  );
  return { markup, errors };
}

describe("ProjectSwitcher", () => {
  it("caps the project list height so the footer stays reachable", () => {
    const { markup, errors } = renderSwitcher("en", projects(30));

    // The list scrolls inside a bounded region instead of growing the panel
    // past the viewport; `flex-nowrap` stops daisyUI wrapping into columns.
    expect(markup).toContain("max-h-[min(60vh,21rem)]");
    expect(markup).toContain("flex-nowrap");
    expect(markup).toContain("overflow-y-auto");
    // Footer lives outside the scrolled listbox.
    expect(markup).toContain("Manage projects");
    expect(errors).toEqual([]);
  });

  it("shows the search box only once the list is hard to scan", () => {
    expect(renderSwitcher("en", projects(7)).markup).not.toContain(
      "Find project…",
    );
    expect(renderSwitcher("en", projects(8)).markup).toContain("Find project…");
  });

  it("renders switcher chrome in Vietnamese without a missing id", () => {
    const { markup, errors } = renderSwitcher("vi", projects(12));

    expect(markup).toContain("Tìm dự án…");
    expect(markup).toContain("Quản lý dự án");
    expect(markup).not.toContain("Find project");
    expect(markup).not.toContain("Manage projects");
    expect(errors).toEqual([]);
  });

  it("renders no listbox when the workspace has no projects", () => {
    const { markup, errors } = renderSwitcher("en", []);

    expect(markup).not.toContain('role="listbox"');
    expect(markup).toContain("Manage projects");
    expect(errors).toEqual([]);
  });
});
