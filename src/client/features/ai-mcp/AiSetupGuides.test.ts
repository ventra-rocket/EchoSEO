import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";

// Collapsible only renders its children once expanded (closed by default);
// this test cares about the rich-text content inside every card, not the
// expand/collapse interaction, so it's stubbed to always render open — the
// same trade DomainTables.test.ts makes for react-router's Link.
vi.mock("@/client/features/ai-mcp/SetupControls", () => ({
  Collapsible: ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children: ReactNode;
  }) =>
    createElement(
      "div",
      null,
      createElement("span", null, title),
      subtitle ? createElement("span", null, subtitle) : null,
      children,
    ),
  CodeBlock: ({ code }: { code: string }) => createElement("pre", null, code),
}));

import { AiSetupGuides } from "./AiSetupGuides";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

const CATALOGS = { en, vi: viMessages } as const;
const MCP_URL = "https://echoseo.example/mcp";

/**
 * Same real-IntlShape-plus-onError-probe pattern as DomainTables.test.ts: a
 * component that hands an id-shaped prop where a plain string was expected
 * (or vice versa) renders correct-looking text while still throwing on every
 * render, so every case below asserts `errors` is empty too.
 */
function renderGuides(locale: keyof typeof CATALOGS): {
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
      createElement(AiSetupGuides, { mcpUrl: MCP_URL }),
    ),
  );
  return { markup, errors };
}

describe("AiSetupGuides", () => {
  it("renders every card's Vietnamese copy with no missing-translation errors", () => {
    const { markup, errors } = renderGuides("vi");

    expect(errors).toEqual([]);
    expect(markup).toContain("Hướng dẫn thiết lập");
    expect(markup).toContain("Chọn agent của bạn.");
    // Client names are data: identical in both locales.
    expect(markup).toContain("Claude Code");
    expect(markup).toContain("Claude Desktop");
    expect(markup).toContain("Codex Desktop");
    expect(markup).toContain("Thêm bằng CLI");
    expect(markup).toContain("Chạy lệnh này trong terminal của bạn:");
    expect(markup).toContain("Chấp thuận đăng nhập khi được yêu cầu.");
    // The rich-text steps translate the connecting words but keep every
    // literal Claude/Codex Desktop UI label in English — a Vietnamese reader
    // has to find these exact words inside those apps' own (English) UI.
    expect(markup).toContain("Mở");
    expect(markup).toContain("Settings");
    expect(markup).toContain("Connectors");
    expect(markup).toContain("Nhấp");
    expect(markup).toContain("Add custom connector");
    expect(markup).toContain("Dán URL MCP ở trên rồi nhấp Add.");
    expect(markup).toContain("Chấp thuận đăng nhập EchoSEO khi được yêu cầu.");
    expect(markup).toContain("Không bắt buộc");
    expect(markup).toContain("Configure");
    expect(markup).toContain("Always Approved");
    expect(markup).toContain(
      "Yêu cầu gói Claude Pro, Max, Team hoặc Enterprise.",
    );
    // HTML-escaped by renderToStaticMarkup: literal "&" -> "&amp;".
    expect(markup).toContain("Settings → Integrations &amp; MCP");
    expect(markup).toContain("Add your own");
    expect(markup).toContain("Dán URL MCP ở trên.");
    // mcpUrl is data — must land byte-identical inside both CLI snippets.
    expect(markup).toContain(
      `claude mcp add --transport http --scope user echoseo ${MCP_URL}`,
    );
    expect(markup).toContain(`codex mcp add echoseo --url ${MCP_URL}`);
  });

  it("renders the English catalog too, so the two locales cannot silently drift apart", () => {
    const { markup, errors } = renderGuides("en");

    expect(errors).toEqual([]);
    expect(markup).toContain("Setup guides");
    expect(markup).toContain("Pick your agent.");
    expect(markup).toContain(
      "Requires a Claude Pro, Max, Team, or Enterprise plan.",
    );
  });
});
