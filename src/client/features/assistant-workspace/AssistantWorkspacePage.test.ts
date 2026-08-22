import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";

// Hoisted mutable fixtures the mocked hooks below read from per test, the
// same pattern DomainTables.test.ts uses for its router mock.
const queryState = vi.hoisted(() => ({
  project: {
    isLoading: false,
    isError: false,
    data: { name: "Demo Project" } as { name: string } | undefined,
  },
  identity: {
    isLoading: false,
    isError: false,
    data: undefined as { userId: string; available: boolean } | undefined,
  },
}));
const authState = vi.hoisted(() => ({ hosted: false }));

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0];
    if (key === "project-access") return queryState.project;
    if (key === "assistant-workspace-identity") return queryState.identity;
    throw new Error(`unexpected queryKey ${String(key)}`);
  },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    className,
    children,
  }: {
    to?: string;
    className?: string;
    children?: ReactNode;
  }) => createElement("a", { href: to, className }, children),
}));
vi.mock("@/lib/auth-mode", () => ({
  isHostedClientAuthMode: () => authState.hosted,
}));
// The route module transitively imports src/db (cloudflare:workers), which
// only resolves inside the Workers test runtime. useQuery is mocked below to
// never call queryFn, so these just need to exist as importable exports.
vi.mock("@/serverFunctions/projects", () => ({
  getProjectAccess: vi.fn(),
}));
vi.mock("@/serverFunctions/assistant-workspace", () => ({
  getAssistantWorkspaceIdentity: vi.fn(),
}));
// The conversation itself (its own chat-hook wiring) is covered by
// AssistantWorkspaceConversation.test.ts; this file only asserts which
// branch AssistantWorkspacePage picks and what it renders around it.
vi.mock("./AssistantWorkspaceConversation", () => ({
  AssistantWorkspaceConversation: () =>
    createElement("div", null, "conversation-stub"),
}));

import { AssistantWorkspacePage } from "./AssistantWorkspacePage";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

const CATALOGS = { en, vi: viMessages } as const;

/** Same real-IntlShape-plus-onError-probe pattern as DomainTables.test.ts. */
function renderPage(locale: keyof typeof CATALOGS): {
  markup: string;
  errors: string[];
} {
  const errors: string[] = [];
  const intl = createIntl({
    locale,
    messages: CATALOGS[locale],
    onError: (error) => errors.push(error.message),
  });
  const markup = renderToStaticMarkup(
    createElement(
      RawIntlProvider,
      { value: intl },
      createElement(AssistantWorkspacePage, { projectId: "proj_1" }),
    ),
  );
  return { markup, errors };
}

describe("AssistantWorkspacePage", () => {
  it("renders the unavailable alert in Vietnamese when the project query fails", () => {
    queryState.project = { isLoading: false, isError: true, data: undefined };
    queryState.identity = { isLoading: false, isError: false, data: undefined };
    const { markup, errors } = renderPage("vi");

    expect(errors).toEqual([]);
    expect(markup).toContain(
      "Chúng tôi không thể mở không gian làm việc trợ lý riêng tư này.",
    );
  });

  it("renders the header and the missing-key setup reason in Vietnamese for a self-hosted deployment", () => {
    authState.hosted = false;
    queryState.project = {
      isLoading: false,
      isError: false,
      data: { name: "Demo Project" },
    };
    queryState.identity = {
      isLoading: false,
      isError: false,
      data: { userId: "user_1", available: false },
    };
    const { markup, errors } = renderPage("vi");

    expect(errors).toEqual([]);
    // Eyebrow reuses nav.assistantWorkspace; the <h1> carries its own copy.
    expect(markup).toContain("Không gian AI");
    expect(markup).toContain("Quy trình SEO có hỗ trợ AI");
    expect(markup).toContain("Chỉ dành riêng cho bạn trong Demo Project.");
    expect(markup).toContain("Thiết lập MCP");
    expect(markup).toContain("Cần thiết lập AI");
    expect(markup).toContain(
      "Thêm OPENROUTER_API_KEY để bật không gian làm việc AI riêng tư.",
    );
    expect(markup).toContain("Mở phần thiết lập MCP và AI");
    // The hosted reason is a different sentence — must not appear here.
    expect(markup).not.toContain("bản hosted chưa khả dụng");
    expect(markup).not.toContain("conversation-stub");
  });

  it("renders the hosted setup reason in Vietnamese instead of the self-host one", () => {
    authState.hosted = true;
    queryState.project = {
      isLoading: false,
      isError: false,
      data: { name: "Demo Project" },
    };
    queryState.identity = {
      isLoading: false,
      isError: false,
      data: { userId: "user_1", available: false },
    };
    const { markup, errors } = renderPage("vi");

    expect(errors).toEqual([]);
    expect(markup).toContain(
      "Không gian làm việc AI trên bản hosted chưa khả dụng.",
    );
    expect(markup).not.toContain("OPENROUTER_API_KEY");
  });

  it("mounts the conversation instead of the setup card once the workspace is available", () => {
    authState.hosted = false;
    queryState.project = {
      isLoading: false,
      isError: false,
      data: { name: "Demo Project" },
    };
    queryState.identity = {
      isLoading: false,
      isError: false,
      data: { userId: "user_1", available: true },
    };
    const { markup, errors } = renderPage("vi");

    expect(errors).toEqual([]);
    expect(markup).toContain("conversation-stub");
    expect(markup).not.toContain("Cần thiết lập AI");
  });
});
