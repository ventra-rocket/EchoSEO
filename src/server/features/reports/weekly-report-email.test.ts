import { describe, expect, it } from "vitest";
import {
  buildCriticalAlertEmail,
  buildWeeklyReportEmail,
} from "@/server/features/reports/weekly-report-email";
import type {
  ReportIssue,
  ReportPeriod,
  WeeklyReportData,
  WeeklySearchSignals,
} from "@/server/features/reports/report-types";

const PERIOD: ReportPeriod = {
  startDate: "2026-08-07",
  endDate: "2026-08-13",
  prevStartDate: "2026-07-31",
  prevEndDate: "2026-08-06",
  key: "2026-W33",
};

function issue(overrides: Partial<ReportIssue> = {}): ReportIssue {
  return {
    ruleId: "server-indexable",
    url: "https://example.com/pricing",
    issueGroup: "technical",
    severity: "critical",
    label: "Page is indexable",
    problem: "A noindex directive keeps this page out of Google.",
    fixSteps: ["Remove the noindex meta tag", "Request re-indexing"],
    googleSourceUrl: "https://developers.google.com/search/docs/noindex",
    guideQuote: "You can prevent a page from appearing in Google Search.",
    lastReviewedDate: "2026-01-15",
    localized: true,
    ...overrides,
  };
}

const OK_SEARCH: WeeklySearchSignals = {
  state: "ok",
  siteUrl: "sc-domain:example.com",
  totals: { clicks: 120, impressions: 4000, ctr: 0.03, position: 12.4 },
  prevTotals: { clicks: 100, impressions: 3800, ctr: 0.026, position: 14.1 },
  topPages: [
    {
      key: "https://example.com/pricing",
      clicks: 40,
      impressions: 900,
      ctr: 0.044,
      position: 8.2,
    },
  ],
  topQueries: [
    {
      key: "seo tool",
      clicks: 30,
      impressions: 800,
      ctr: 0.037,
      position: 9.1,
    },
  ],
  devices: [
    { key: "MOBILE", clicks: 80, impressions: 2600, ctr: 0.03, position: 13.0 },
  ],
  countries: [
    { key: "vnm", clicks: 60, impressions: 1800, ctr: 0.033, position: 11.2 },
  ],
};

function data(overrides: Partial<WeeklyReportData> = {}): WeeklyReportData {
  return {
    locale: "en",
    siteLabel: "example.com",
    period: PERIOD,
    issues: {
      state: "ok",
      current: {
        auditId: "audit-2",
        sealedAt: "2026-08-14 03:00:00",
        pagesCrawled: 84,
      },
      baseline: {
        auditId: "audit-1",
        sealedAt: "2026-08-07 03:00:00",
        pagesCrawled: 82,
      },
      newIssues: [issue()],
      regressedIssues: [],
      fixedCount: 3,
      fixedRules: [
        { ruleId: "meta-title", label: "Title tag present", resolvedCount: 3 },
      ],
      criticalCount: 1,
    },
    search: OK_SEARCH,
    reportUrl: "https://app.example.com/p/proj-1/audit/issues",
    unsubscribeUrl: "https://app.example.com/api/reports/unsubscribe?token=t0k",
    ...overrides,
  };
}

describe("buildWeeklyReportEmail", () => {
  it("puts the fixes above the Search Console numbers", () => {
    // The whole point of this email: Google already sends the performance
    // summary for free. If the numbers drift above the remediation, the mail
    // has become a worse copy of one the recipient already gets.
    const message = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data(),
    });

    const issuesAt = message.html.indexOf("New issues found this week");
    const searchAt = message.html.indexOf("Search Console performance");
    expect(issuesAt).toBeGreaterThan(-1);
    expect(searchAt).toBeGreaterThan(-1);
    expect(issuesAt).toBeLessThan(searchAt);
  });

  it("orders the technical block new, then fixed, then regressed", () => {
    const message = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data({
        issues: {
          state: "ok",
          current: {
            auditId: "audit-2",
            sealedAt: "2026-08-14 03:00:00",
            pagesCrawled: 84,
          },
          baseline: {
            auditId: "audit-1",
            sealedAt: "2026-08-07 03:00:00",
            pagesCrawled: 82,
          },
          newIssues: [issue()],
          regressedIssues: [issue({ url: "https://example.com/back" })],
          fixedCount: 3,
          fixedRules: [
            {
              ruleId: "meta-title",
              label: "Title tag present",
              resolvedCount: 3,
            },
          ],
          criticalCount: 1,
        },
      }),
    });

    // Credit sits between the two demands on the reader's attention, not after
    // both of them.
    const newAt = message.html.indexOf("New issues found this week");
    const fixedAt = message.html.indexOf("Fixed since last week");
    const regressedAt = message.html.indexOf("Issues that came back");
    expect(newAt).toBeGreaterThan(-1);
    expect(fixedAt).toBeGreaterThan(newAt);
    expect(regressedAt).toBeGreaterThan(fixedAt);

    const textFixedAt = message.text.indexOf("3 issues are gone");
    const textRegressedAt = message.text.indexOf("Issues that came back");
    expect(textFixedAt).toBeGreaterThan(-1);
    expect(textRegressedAt).toBeGreaterThan(textFixedAt);
  });

  it("carries the fix steps and the Google citation", () => {
    const message = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data(),
    });

    expect(message.html).toContain("Remove the noindex meta tag");
    expect(message.html).toContain(
      "You can prevent a page from appearing in Google Search.",
    );
    expect(message.text).toContain("Remove the noindex meta tag");
  });

  it("names the reporting window and its comparison window", () => {
    const message = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data(),
    });

    // Without the dates the lag looks like missing traffic rather than a
    // deliberate window shift.
    expect(message.html).toContain("2026-08-07");
    expect(message.html).toContain("2026-08-13");
    expect(message.html).toContain("2026-07-31");
  });

  it("shows no numbers at all when the Search Console grant is dead", () => {
    const message = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data({ search: { state: "needs_reconnect" } }),
    });

    expect(message.html).toContain("Search Console needs reconnecting");
    // Zeros here would read as a traffic collapse. Nothing that looks like a
    // totals table may render in this state.
    expect(message.html).not.toContain("Avg. position");
  });

  it("separates a genuine zero week from a failed read", () => {
    const noData = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data({ search: { state: "no_data", siteUrl: "sc-domain:x" } }),
    });
    const failed = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data({ search: { state: "error", message: "HTTP 500" } }),
    });

    expect(noData.html).toContain("This is a real zero");
    expect(failed.html).toContain("Search data unavailable");
    expect(failed.html).toContain("HTTP 500");
  });

  it("says so plainly when the crawls cannot be compared", () => {
    const message = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data({
        issues: {
          state: "not_comparable",
          reason: "baseline_not_materialized",
        },
      }),
    });

    expect(message.html).toContain("Comparison unavailable");
    // Claiming "no new issues" from an uncomparable pair would be a lie.
    expect(message.html).not.toContain("No new issues");
  });

  it("leads the subject with the critical count", () => {
    const message = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data(),
    });
    expect(message.subject).toBe("example.com: 1 critical SEO issue found");
  });

  it("keys idempotency on the period, not the clock", () => {
    const first = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data(),
    });
    const retry = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data(),
    });

    expect(first.idempotencyKey).toBe("weekly-report:sub-1:2026-W33");
    expect(retry.idempotencyKey).toBe(first.idempotencyKey);
  });

  it("hands the unsubscribe URL to the transport for one-click", () => {
    const message = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data(),
    });

    expect(message.unsubscribeUrl).toBe(
      "https://app.example.com/api/reports/unsubscribe?token=t0k",
    );
    expect(message.html).toContain("Turn these emails off");
  });

  it("escapes crawled content", () => {
    const message = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data({
        issues: {
          state: "no_baseline",
          current: {
            auditId: "audit-1",
            sealedAt: "2026-08-14 03:00:00",
            pagesCrawled: 10,
          },
          newIssues: [
            issue({
              label: '<script>alert("x")</script>',
              url: "https://example.com/?q=<img onerror=1>",
            }),
          ],
          criticalCount: 1,
        },
      }),
    });

    expect(message.html).not.toContain("<script>alert");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).not.toContain("<img onerror");
  });

  it("renders Vietnamese when the subscription asks for it", () => {
    const message = buildWeeklyReportEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      data: data({ locale: "vi" }),
    });

    expect(message.html).toContain('lang="vi"');
    expect(message.html).toContain("Lỗi mới phát hiện trong tuần");
  });
});

describe("buildCriticalAlertEmail", () => {
  it("keys idempotency on the crawl so a replay cannot double-send", () => {
    const message = buildCriticalAlertEmail({
      to: "seo@example.com",
      subscriptionId: "sub-1",
      auditId: "audit-9",
      locale: "en",
      siteLabel: "example.com",
      issues: [issue()],
      reportUrl: "https://app.example.com/p/proj-1/audit/issues",
      unsubscribeUrl: "https://app.example.com/api/reports/unsubscribe?token=t",
    });

    expect(message.idempotencyKey).toBe("report-alert:sub-1:audit-9");
    expect(message.subject).toContain("critical");
    expect(message.html).toContain("Remove the noindex meta tag");
    // An alert answers "what broke", not "how is traffic".
    expect(message.html).not.toContain("Search Console performance");
  });
});
