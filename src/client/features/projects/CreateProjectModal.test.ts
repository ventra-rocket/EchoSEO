import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { CreateProjectModal } from "./CreateProjectModal";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

// The modal only navigates on a successful submit, which these render-only
// tests never trigger; the router itself is not under test here.
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => () => {},
}));

// Real `createProject` wraps a server-only RPC call with no request context
// in this test — never invoked since no submit is simulated, but mocked the
// same way PostSignupOnboarding.test.ts mocks this module.
vi.mock("@/serverFunctions/projects", () => ({
  createProject: vi.fn(),
}));

const CATALOGS = { en, vi: viMessages } as const;

/**
 * Renders through a real IntlShape with an onError probe — the same pattern
 * DomainTables.test.ts uses to pin the id-echo regression: a prop fed an
 * already-formatted string instead of a raw message id renders a
 * correct-looking string while still throwing MissingTranslationError on
 * every render. Reading rendered text alone would pass against that bug, so
 * this also asserts `errors` is empty.
 */
function renderModal(locale: keyof typeof CATALOGS): {
  markup: string;
  errors: string[];
} {
  const errors: string[] = [];
  const intl = createIntl({
    locale,
    messages: CATALOGS[locale],
    onError: (error) => errors.push(error.message),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const markup = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        RawIntlProvider,
        { value: intl },
        createElement(CreateProjectModal, { onClose: () => {} }),
      ),
    ),
  );
  return { markup, errors };
}

describe("CreateProjectModal", () => {
  it("renders the create-project form in English", () => {
    const { markup, errors } = renderModal("en");

    expect(errors).toEqual([]);
    expect(markup).toContain("New project");
    expect(markup).toContain("Name");
    expect(markup).toContain("Domain");
    expect(markup).toContain("(optional)");
    expect(markup).toContain('placeholder="Acme Inc."');
    expect(markup).toContain('placeholder="example.com"');
    expect(markup).toContain(
      "You can connect Search Console and set up rank tracking after creating the project.",
    );
    expect(markup).toContain("Cancel");
    expect(markup).toContain("Create project");
  });

  it("renders the same form in Vietnamese, with no missing-translation errors", () => {
    const { markup, errors } = renderModal("vi");

    expect(errors).toEqual([]);
    expect(markup).toContain("Dự án mới");
    // "Tên" is also a substring of "Tên miền" below it; anchor to the
    // standalone label span so this actually proves the Name field resolved,
    // not just that the Domain field's label happens to contain it too.
    expect(markup).toContain('font-medium">Tên</span>');
    expect(markup).toContain("Tên miền");
    expect(markup).toContain("(không bắt buộc)");
    // Domain/company examples are not translated — same placeholders in both
    // locales, matching the shipped free-seo-check "example.com" precedent.
    expect(markup).toContain('placeholder="Acme Inc."');
    expect(markup).toContain('placeholder="example.com"');
    expect(markup).toContain(
      "Bạn có thể kết nối Search Console và thiết lập theo dõi thứ hạng sau khi tạo dự án.",
    );
    expect(markup).toContain("Hủy");
    expect(markup).toContain("Tạo dự án");
  });
});
