import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";
import {
  LighthouseIssueList,
  LighthouseIssuesHeader,
} from "./LighthouseIssuesParts";
import { LighthouseIssuesSummary } from "./LighthouseIssuesSummary";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type {
  LighthouseIssue,
  LighthouseMetrics,
  LighthouseScores,
} from "./types";

// Split from LighthouseIssuesToolbar.test.ts (CategoryTabs + ExportMenu) to
// stay under the 400-line max-lines ceiling; the harness is duplicated
// because every intl test file in this repo carries its own.

const CATALOGS = { en, vi: viMessages } as const;

function renderWithIntl(
  locale: keyof typeof CATALOGS,
  node: ReactNode,
): string {
  const intl = createIntl({ locale, messages: CATALOGS[locale] });
  return renderToStaticMarkup(
    createElement(RawIntlProvider, { value: intl }, node),
  );
}

const SEVERITY_COUNTS = { critical: 2, warning: 1, info: 0 };

describe("LighthouseIssuesHeader", () => {
  it("renders the title, back button and severity badges in English", () => {
    const markup = renderWithIntl(
      "en",
      createElement(LighthouseIssuesHeader, {
        backLabel: "Site Audit",
        onBack: () => {},
        finalUrl: "https://example.com/",
        severityCounts: SEVERITY_COUNTS,
      }),
    );

    expect(markup).toContain("Lighthouse Issues");
    expect(markup).toContain("Back to Site Audit");
    expect(markup).toContain("Reading latest issues");
    expect(markup).toContain("Critical");
    expect(markup).toContain("Warning");
    expect(markup).toContain("Info");
    expect(markup).toContain("https://example.com/");
  });

  it("renders the title, back button and severity badges in Vietnamese", () => {
    const markup = renderWithIntl(
      "vi",
      createElement(LighthouseIssuesHeader, {
        backLabel: "Site Audit",
        onBack: () => {},
        finalUrl: "https://example.com/",
        severityCounts: SEVERITY_COUNTS,
      }),
    );

    expect(markup).toContain("Vấn đề Lighthouse");
    expect(markup).toContain("Quay lại Site Audit");
    expect(markup).toContain("Đang tải vấn đề mới nhất");
    expect(markup).toContain("Nghiêm trọng");
    expect(markup).toContain("Cảnh báo");
    expect(markup).toContain("Thông tin");
    expect(markup).not.toContain("Reading latest issues");
  });

  it("formats a real scannedAt through intl.formatDate instead of the loading caption", () => {
    // Asserted on the surrounding translated text rather than the exact
    // date/time value, which depends on the CI runner's timezone — same
    // reasoning as the {price}/month assertion in BacklinksPageStates.test.ts.
    const markup = renderWithIntl(
      "vi",
      createElement(LighthouseIssuesHeader, {
        backLabel: "Site Audit",
        onBack: () => {},
        scannedAt: "2026-07-28 10:00:00",
        finalUrl: "https://example.com/",
        severityCounts: SEVERITY_COUNTS,
      }),
    );

    expect(markup).toContain("Quét lúc");
    expect(markup).not.toContain("Đang tải vấn đề mới nhất");
    // D1's zone-less "YYYY-MM-DD HH:MM:SS" shape must parse as UTC — 2026, not
    // 1970 or NaN — proving parseLighthouseTimestamp ran, not a bare `new
    // Date(...)`.
    expect(markup).toContain("2026");
  });
});

const SCORES: LighthouseScores = {
  performance: 47,
  accessibility: 92,
  "best-practices": 83,
  seo: 100,
};

const METRICS: LighthouseMetrics = {
  firstContentfulPaint: {
    score: 45,
    displayValue: "3.1 s",
    numericValue: 3100,
  },
  largestContentfulPaint: {
    score: 12,
    displayValue: "6.4 s",
    numericValue: 6400,
  },
  totalBlockingTime: { score: 79, displayValue: "290 ms", numericValue: 290 },
  cumulativeLayoutShift: {
    score: 92,
    displayValue: "0.03",
    numericValue: 0.03,
  },
  speedIndex: { score: 86, displayValue: "3.7 s", numericValue: 3700 },
  timeToInteractive: {
    score: 13,
    displayValue: "12.8 s",
    numericValue: 12800,
  },
  interactionToNextPaint: {
    score: null,
    displayValue: null,
    numericValue: null,
  },
  serverResponseTime: { score: 90, displayValue: "52 ms", numericValue: 52 },
};

describe("LighthouseIssuesSummary", () => {
  it("translates the four score-gauge labels and leaves Lighthouse's own metric text and abbreviations untouched, in English", () => {
    const markup = renderWithIntl(
      "en",
      createElement(LighthouseIssuesSummary, {
        scores: SCORES,
        metrics: METRICS,
      }),
    );

    expect(markup).toContain("Performance");
    expect(markup).toContain("Accessibility");
    expect(markup).toContain("Best Practices");
    expect(markup).toContain("SEO");
    // issue.score-style gauge value, run through intl.formatNumber.
    expect(markup).toContain("47");
    // FCP/LCP/etc. are Lighthouse's own metric abbreviations — the same
    // category as Core Web Vitals — so they stay literal in every locale.
    expect(markup).toContain("FCP");
    expect(markup).toContain("LCP");
    // Lighthouse's own pre-formatted displayValue text, not a number EchoSEO
    // formats itself, so it renders as received.
    expect(markup).toContain("3.1 s");
    expect(markup).toContain("290 ms");
  });

  it("translates the four score-gauge labels in Vietnamese and still leaves the metric text and abbreviations untouched", () => {
    const markup = renderWithIntl(
      "vi",
      createElement(LighthouseIssuesSummary, {
        scores: SCORES,
        metrics: METRICS,
      }),
    );

    expect(markup).toContain("Hiệu suất");
    expect(markup).toContain("Khả năng truy cập");
    expect(markup).toContain("Thực hành tốt nhất");
    expect(markup).toContain("SEO");
    expect(markup).toContain("FCP");
    expect(markup).toContain("3.1 s");
    expect(markup).not.toContain("Performance");
    expect(markup).not.toContain("Best Practices");
  });
});

const ROW_ISSUE: LighthouseIssue = {
  category: "accessibility",
  auditKey: "color-contrast",
  title:
    "Background and foreground colors do not have a sufficient contrast ratio",
  description: "",
  score: 62,
  scoreDisplayMode: "binary",
  displayValue: null,
  impactMs: null,
  impactBytes: null,
  severity: "warning",
  items: [],
};

describe("LighthouseIssueList", () => {
  it("shows the loading state in both locales", () => {
    expect(
      renderWithIntl(
        "en",
        createElement(LighthouseIssueList, { issues: [], isLoading: true }),
      ),
    ).toContain("Loading issues");
    expect(
      renderWithIntl(
        "vi",
        createElement(LighthouseIssueList, { issues: [], isLoading: true }),
      ),
    ).toContain("Đang tải vấn đề");
  });

  it("shows the default empty state in both locales", () => {
    expect(
      renderWithIntl(
        "en",
        createElement(LighthouseIssueList, { issues: [], isLoading: false }),
      ),
    ).toContain("No actionable issues for this category.");
    expect(
      renderWithIntl(
        "vi",
        createElement(LighthouseIssueList, { issues: [], isLoading: false }),
      ),
    ).toContain("Không có vấn đề nào cần xử lý cho danh mục này.");
  });

  it("prefers a caller-supplied empty message (e.g. the legacy-payload notice) over the default", () => {
    const markup = renderWithIntl(
      "vi",
      createElement(LighthouseIssueList, {
        issues: [],
        isLoading: false,
        emptyMessage: "Thông báo tuỳ chỉnh",
      }),
    );

    expect(markup).toContain("Thông báo tuỳ chỉnh");
    expect(markup).not.toContain("Không có vấn đề nào cần xử lý");
  });

  it("renders column headers, the provider-text notice and each row's translated category in English", () => {
    const markup = renderWithIntl(
      "en",
      createElement(LighthouseIssueList, {
        issues: [ROW_ISSUE],
        isLoading: false,
      }),
    );

    expect(markup).toContain("Severity");
    expect(markup).toContain("Issue");
    expect(markup).toContain("Category");
    expect(markup).toContain("Impact");
    expect(markup).toContain("Score");
    expect(markup).toContain("shown in English");
    expect(markup).toContain("Accessibility");
    expect(markup).toContain(
      "Background and foreground colors do not have a sufficient contrast ratio",
    );
  });

  it("renders column headers, the provider-text notice and each row's translated category in Vietnamese", () => {
    const markup = renderWithIntl(
      "vi",
      createElement(LighthouseIssueList, {
        issues: [ROW_ISSUE],
        isLoading: false,
      }),
    );

    expect(markup).toContain("Mức độ");
    expect(markup).toContain("Vấn đề");
    expect(markup).toContain("Danh mục");
    expect(markup).toContain("Tác động");
    expect(markup).toContain("Điểm");
    expect(markup).toContain("hiển thị bằng tiếng Anh");
    expect(markup).toContain("Khả năng truy cập");
    // Lighthouse's own rule title stays English inside a Vietnamese row too.
    expect(markup).toContain(
      "Background and foreground colors do not have a sufficient contrast ratio",
    );
  });
});
