import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import { BillingUsageChart } from "./BillingUsageChart";

// `renderToStaticMarkup` never runs effects, so `chartWidth` stays 0 and the
// component never reaches the recharts <BarChart> branch (which needs a real
// DOM/ResizeObserver) — only the header and the empty-state branch render,
// which is exactly the part carrying message ids.
vi.mock("autumn-js/react", () => ({
  useAggregateEvents: () => ({ list: [], isLoading: false }),
}));

function renderChart(locale: "en" | "vi"): string {
  return renderToStaticMarkup(
    createElement(
      IntlProvider,
      { locale, messages: locale === "en" ? en : viMessages },
      createElement(BillingUsageChart),
    ),
  );
}

describe("BillingUsageChart", () => {
  it("renders the header and empty state in Vietnamese", () => {
    const html = renderChart("vi");
    expect(html).toContain("Mức sử dụng");
    expect(html).toContain("30 ngày qua");
    expect(html).toContain("Chưa ghi nhận mức sử dụng nào");
  });

  it("renders the header and empty state in English", () => {
    const html = renderChart("en");
    expect(html).toContain(">Usage<");
    expect(html).toContain("Last 30 days");
    expect(html).toContain("No usage recorded yet");
  });

  it("formats the zero total spend as locale-aware currency, not a bare $", () => {
    const html = renderChart("vi");
    // 0 formatted as USD in vi renders "0 US$" (NBSP before "US$"), never a
    // hardcoded "$0" — the exact bug class this catalog exists to prevent.
    expect(html).toContain("0\u00A0US$");
    expect(html).not.toContain("$0");
  });
});
