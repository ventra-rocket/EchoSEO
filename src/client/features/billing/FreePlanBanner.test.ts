import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import { AUTUMN_PAID_PLAN_ID } from "@/shared/billing";
import { FreePlanBanner } from "./FreePlanBanner";

// FreePlanBanner only ever mounts in hosted mode (route.tsx gates on
// authGate.isHostedMode), which this local/self-hosted dev environment isn't
// running — so it can't be exercised by clicking through the app. Mocking its
// two data hooks lets the REAL component render under a real IntlProvider
// instead, the only way to observe its rich-text (two-link) message.
type MockCustomerData = {
  subscriptions?: Array<{ planId: string; status: string }>;
  balances?: Record<string, { remaining: number } | undefined>;
};

let customerData: MockCustomerData | undefined;

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: { user: { id: "user_1" } } }),
}));

vi.mock("autumn-js/react", () => ({
  AutumnProvider: ({ children }: { children: ReactNode }) => children,
  useCustomer: () => ({ isLoading: false, data: customerData }),
}));

// FreePlanBanner links to /subscribe, /billing and /support; the router
// itself is not under test.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement("a", { href: to }, children),
}));

function renderBanner(locale: "en" | "vi"): string {
  return renderToStaticMarkup(
    createElement(
      IntlProvider,
      { locale, messages: locale === "en" ? en : viMessages },
      createElement(FreePlanBanner),
    ),
  );
}

describe("FreePlanBanner", () => {
  it("tells a free-plan user who is out of credits to upgrade, in Vietnamese", () => {
    customerData = {
      subscriptions: [],
      balances: {
        usage_credits: { remaining: 0 },
        topup_credits: { remaining: 0 },
      },
    };
    const html = renderBanner("vi");
    expect(html).toContain("Bạn đã dùng hết credit.");
    expect(html).toContain("Nâng cấp gói của bạn");
    expect(html).toContain('href="/subscribe"');
  });

  it("tells a paid-plan user who is out of credits to buy more, in Vietnamese", () => {
    customerData = {
      subscriptions: [{ planId: AUTUMN_PAID_PLAN_ID, status: "active" }],
      balances: {
        usage_credits: { remaining: 0 },
        topup_credits: { remaining: 0 },
      },
    };
    const html = renderBanner("vi");
    expect(html).toContain("Bạn đã dùng hết credit.");
    expect(html).toContain("Mua thêm credit");
    expect(html).toContain('href="/billing"');
  });

  it("shows the low-credits warning in Vietnamese", () => {
    customerData = {
      subscriptions: [{ planId: AUTUMN_PAID_PLAN_ID, status: "active" }],
      balances: {
        usage_credits: { remaining: 100 },
        topup_credits: { remaining: 0 },
      },
    };
    const html = renderBanner("vi");
    expect(html).toContain("Credit của bạn sắp hết.");
  });

  it("shows the free-plan enjoying banner with both links in Vietnamese", () => {
    customerData = {
      subscriptions: [],
      balances: {
        usage_credits: { remaining: 5000 },
        topup_credits: { remaining: 0 },
      },
    };
    const html = renderBanner("vi");
    expect(html).toContain("Hy vọng bạn đang hài lòng với EchoSEO!");
    expect(html).toContain("Nâng cấp bất cứ lúc nào");
    expect(html).toContain("liên hệ nếu có thắc mắc");
    expect(html).toContain('href="/support"');
  });

  it("renders the same out-of-credits banner in English", () => {
    customerData = {
      subscriptions: [],
      balances: {
        usage_credits: { remaining: 0 },
        topup_credits: { remaining: 0 },
      },
    };
    const html = renderBanner("en");
    expect(html).toContain("You\u2019ve used all your credits.");
    expect(html).toContain("Upgrade your plan");
  });
});
