import { buildWeeklyReportEmail } from "../src/server/features/reports/weekly-report-email";
import { writeFileSync } from "node:fs";
import { getIssueFixText } from "../src/server/features/audit/issues/issue-fix-text";
import type { Locale } from "../src/server/lib/seo-rules/types";
import type { ReportIssue } from "../src/server/features/reports/report-types";

const period = {
  startDate: "2026-08-11",
  endDate: "2026-08-17",
  prevStartDate: "2026-08-04",
  prevEndDate: "2026-08-10",
  key: "2026-W33",
};

// Resolve rule copy the way the real pipeline does (report-issues.ts), so the
// preview shows what a reader receives rather than whatever the fixture typed.
const issue = (
  ruleId: string,
  url: string,
  group: string,
  severity: ReportIssue["severity"],
  locale: Locale,
): ReportIssue => {
  const fix = getIssueFixText(ruleId, locale);
  if (!fix) throw new Error("unknown rule id in preview fixture: " + ruleId);
  // Spread the resolved fix so the preview carries every field the email reads
  // — citation, quote and the localized flag included — exactly as
  // report-issues.ts assembles it in production.
  return { ruleId, url, issueGroup: group, severity, ...fix };
};

const totals = {
  clicks: 1284,
  impressions: 41902,
  ctr: 0.0306,
  position: 18.4,
};
const prevTotals = {
  clicks: 1102,
  impressions: 38771,
  ctr: 0.0284,
  position: 19.7,
};
const row = (key: string, clicks: number, impressions: number) => ({
  key,
  clicks,
  impressions,
  ctr: clicks / impressions,
  position: 12.5,
});

for (const locale of ["en", "vi"] as const satisfies readonly Locale[]) {
  const mail = buildWeeklyReportEmail({
    to: "ventrarocket.work@gmail.com",
    subscriptionId: "sub-preview",
    data: {
      locale,
      siteLabel: "kello.ventrarocket.vn",
      period,
      reportUrl: "https://app.echoseo.ventrarocket.vn/p/demo/audit",
      unsubscribeUrl:
        "https://app.echoseo.ventrarocket.vn/r/unsubscribe?t=demo",
      issues: {
        state: "ok",
        current: {
          auditId: "a2",
          sealedAt: "2026-08-17T03:00:00.000Z",
          pagesCrawled: 812,
        },
        baseline: {
          auditId: "a1",
          sealedAt: "2026-08-10T03:00:00.000Z",
          pagesCrawled: 806,
        },
        newIssues: [
          issue(
            "meta-title",
            "https://kello.ventrarocket.vn/vi/bang-gia",
            "meta",
            "critical",
            locale,
          ),
          issue(
            "audit-broken-internal-link",
            "https://kello.ventrarocket.vn/vi/lien-he",
            "server",
            "high",
            locale,
          ),
        ],
        regressedIssues: [
          issue(
            "meta-description",
            "https://kello.ventrarocket.vn/",
            "meta",
            "high",
            locale,
          ),
        ],
        fixedCount: 4,
        fixedRules: [
          {
            ruleId: "meta-title",
            label: "Title tag present, 10-60 characters",
            resolvedCount: 3,
          },
          {
            ruleId: "img-alt",
            label: "Images have alt text",
            resolvedCount: 1,
          },
        ],
        criticalCount: 1,
      },
      search: {
        state: "ok",
        siteUrl: "sc-domain:kello.ventrarocket.vn",
        totals,
        prevTotals,
        topPages: [
          row("https://kello.ventrarocket.vn/vi/bang-gia", 210, 5400),
          row("https://kello.ventrarocket.vn/", 180, 9100),
        ],
        topQueries: [
          row("thuê xe đà nẵng", 96, 2400),
          row("giá thuê xe tự lái", 74, 1900),
        ],
        devices: [row("MOBILE", 800, 26000), row("DESKTOP", 420, 14000)],
        countries: [row("vnm", 1100, 35000), row("usa", 90, 4200)],
      },
    },
  });
  writeFileSync("/tmp/weekly-" + locale + ".html", mail.html);
  console.log(
    locale,
    "| subject:",
    mail.subject,
    "| html bytes:",
    mail.html.length,
    "| text bytes:",
    mail.text.length,
  );
}
