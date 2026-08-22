import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, FormattedMessage, RawIntlProvider } from "react-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { ProjectSettings } from "./ProjectSettings";
import type { ProjectSummary } from "./types";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

// The route heading links back to /projects; the router itself is not under
// test here, same convention as DomainTables.test.ts.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement("a", { href: to }, children),
  useNavigate: () => () => {},
}));

// Real getProjects/updateProject/archiveProject wrap server-only RPC calls
// with no request context here; the project list is seeded straight into the
// query cache below instead of exercising the queryFn, and no mutation is
// ever fired (that would need a click, unavailable in this static-render,
// no-jsdom harness — see the DangerSection note further down).
vi.mock("@/serverFunctions/projects", () => ({
  getProjects: vi.fn(),
  updateProject: vi.fn(),
  archiveProject: vi.fn(),
}));

// SearchConsoleConnectionCard is its own already-shipped `gsc.*` surface with
// its own query/mutations; stubbing it here isolates ProjectSettings' own
// prose instead of re-testing (or cloning the copy of) a dependency that
// isn't owned by this conversion.
vi.mock("@/client/features/gsc/SearchConsoleConnectionCard", () => ({
  SearchConsoleConnectionCard: ({ projectId }: { projectId: string }) =>
    createElement("div", { "data-search-console-stub": projectId }),
}));

const CATALOGS = { en, vi: viMessages } as const;

const TWO_PROJECTS: ProjectSummary[] = [
  {
    id: "p1",
    name: "Acme SEO",
    domain: "acme.com",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "p2",
    name: "Beta Co",
    domain: null,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];
const ONE_PROJECT: ProjectSummary[] = [TWO_PROJECTS[0]];

/**
 * Renders through a real IntlShape with an onError probe — the same pattern
 * DomainTables.test.ts uses to pin the id-echo regression. The project list
 * is pre-seeded into the query cache with `staleTime: Infinity` so the
 * component reads it synchronously on first render instead of the loading
 * spinner branch, and never calls the mocked (RPC-shaped) queryFn.
 */
function renderProjectSettings(
  locale: keyof typeof CATALOGS,
  projects: ProjectSummary[],
): { markup: string; errors: string[] } {
  const errors: string[] = [];
  const intl = createIntl({
    locale,
    messages: CATALOGS[locale],
    onError: (error) => errors.push(error.message),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(["projects"], projects);
  const markup = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        RawIntlProvider,
        { value: intl },
        createElement(ProjectSettings, { projectId: projects[0].id }),
      ),
    ),
  );
  return { markup, errors };
}

describe("ProjectSettings", () => {
  it("renders the route chrome, general form and danger zone in English", () => {
    const { markup, errors } = renderProjectSettings("en", TWO_PROJECTS);

    expect(errors).toEqual([]);
    expect(markup).toContain(">Projects</a>"); // breadcrumb back link
    expect(markup).toContain("Project settings");
    expect(markup).toContain("Acme SEO"); // the active project's own name
    expect(markup).toContain("Search Console");
    expect(markup).toContain('data-search-console-stub="p1"');
    expect(markup).toContain("General");
    expect(markup).toContain("Name");
    expect(markup).toContain("Domain");
    expect(markup).toContain("(optional)");
    expect(markup).toContain('placeholder="example.com"');
    expect(markup).toContain("Save changes");
    expect(markup).toContain("Archive project");
    // Two projects: archiving is allowed, so the enabling hint shows.
    expect(markup).toContain(
      "Archive this project to remove it from your workspace.",
    );
    // renderToStaticMarkup HTML-escapes the apostrophe to `&#x27;`, so this
    // checks the unambiguous tail of the sentence rather than the literal quote.
    expect(markup).not.toContain("archive your only project.");
  });

  it("renders the same page in Vietnamese, with no missing-translation errors", () => {
    const { markup, errors } = renderProjectSettings("vi", TWO_PROJECTS);

    expect(errors).toEqual([]);
    expect(markup).toContain(">Dự án</a>");
    expect(markup).toContain("Cài đặt dự án");
    expect(markup).toContain("Acme SEO");
    expect(markup).toContain("Search Console"); // brand name stays untranslated
    expect(markup).toContain('data-search-console-stub="p1"');
    expect(markup).toContain("Chung");
    // "Tên" is also a substring of "Tên miền" right below it; anchor to the
    // standalone label span so this actually proves the Name field resolved.
    expect(markup).toContain('font-medium">Tên</span>');
    expect(markup).toContain("Tên miền");
    expect(markup).toContain("(không bắt buộc)");
    expect(markup).toContain("Lưu thay đổi");
    expect(markup).toContain("Lưu trữ dự án");
    expect(markup).toContain(
      "Lưu trữ dự án này để loại bỏ nó khỏi workspace của bạn.",
    );
    expect(markup).not.toContain(
      "Bạn không thể lưu trữ dự án duy nhất của mình.",
    );
  });

  it("shows the cannot-archive hint for a workspace's only project, in both locales", () => {
    const enResult = renderProjectSettings("en", ONE_PROJECT);
    expect(enResult.errors).toEqual([]);
    expect(enResult.markup).toContain("archive your only project.");
    expect(enResult.markup).not.toContain(
      "Archive this project to remove it from your workspace.",
    );

    const viResult = renderProjectSettings("vi", ONE_PROJECT);
    expect(viResult.errors).toEqual([]);
    expect(viResult.markup).toContain(
      "Bạn không thể lưu trữ dự án duy nhất của mình.",
    );
    expect(viResult.markup).not.toContain(
      "Lưu trữ dự án này để loại bỏ nó khỏi workspace của bạn.",
    );
  });
});

describe("projectsSettings.danger.confirmBody", () => {
  // DangerSection only mounts this message after a button click flips its
  // local `confirming` state — unreachable from renderToStaticMarkup, which
  // has no event simulation (this suite's vitest environment is "node", not
  // jsdom). This exercises the exact <b>{name}</b> rich-text interpolation
  // DangerSection feeds it directly, the same convention
  // KeywordResearchEmptyState's catalog entry is proven correct by elsewhere.
  for (const locale of ["en", "vi"] as const) {
    it(`bolds the project name for ${locale}`, () => {
      const intl = createIntl({ locale, messages: CATALOGS[locale] });
      const rendered = renderToStaticMarkup(
        createElement(
          RawIntlProvider,
          { value: intl },
          createElement(FormattedMessage, {
            id: "projectsSettings.danger.confirmBody",
            values: {
              name: "Acme SEO",
              b: (chunks: ReactNode) => createElement("b", null, chunks),
            },
          }),
        ),
      );
      expect(rendered).toContain("<b>Acme SEO</b>");
    });
  }

  it("keeps the same facts in each locale's sentence", () => {
    expect(en["projectsSettings.danger.confirmBody"]).toContain(
      "restore it later from the Projects page",
    );
    expect(viMessages["projectsSettings.danger.confirmBody"]).toContain(
      "khôi phục lại sau đó từ trang Dự án",
    );
  });
});
