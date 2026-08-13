/**
 * The two emails this feature sends.
 *
 * Design rule that decides the whole layout: **the technical findings and their
 * fixes come before the Search Console numbers.** Google already mails every
 * property owner a free performance summary — clicks, impressions, top pages,
 * top queries. Reproducing that and putting it on top would make this mail a
 * worse copy of one the recipient already receives. The thing no one else sends
 * is the part underneath the graph: what broke this week, and the exact steps
 * to fix it, quoted from Google's own guidance. That goes first; the familiar
 * numbers follow as context.
 *
 * Both builders are pure — no I/O, no clock — so the full matrix of states (no
 * crawl yet, nothing comparable, Search Console not connected, grant expired,
 * genuinely quiet week) is unit testable without a network or a database.
 *
 * Every string that reaches HTML goes through the `html-layout` helpers, which
 * escape their own text arguments. Nothing here concatenates raw markup around
 * untrusted values.
 */
import {
  emailButton,
  emailDivider,
  emailFooter,
  emailHeading,
  emailLink,
  emailMuted,
  emailParagraph,
  emailRawParagraph,
  emailSection,
  emailTable,
  emailHtmlDocument,
  type EmailCell,
} from "@/server/email/html-layout";
import type { EmailMessage } from "@/server/email/sender";
import {
  COPY,
  severityLabel,
  type Copy,
} from "@/server/features/reports/report-email-copy";
import {
  DETAILED_ISSUE_LIMIT,
  dimensionTable,
  formatDelta,
  formatNumber,
  formatPosition,
  issueBlock,
  issueCard,
  totalsTable,
} from "@/server/features/reports/report-email-parts";
import type {
  ReportIssue,
  WeeklyReportData,
} from "@/server/features/reports/report-types";
import type { Locale } from "@/server/lib/seo-rules";

/** Plain-text mirror. Kept deliberately terse: it exists for clients that
 *  refuse HTML and for spam scoring, not as a second report. */
function buildText(
  data: WeeklyReportData,
  copy: Copy,
  subject: string,
): string {
  const lines: string[] = [
    subject,
    "",
    copy.greeting(data.siteLabel),
    copy.periodLine(data.period.startDate, data.period.endDate),
    copy.comparedLine(data.period.prevStartDate, data.period.prevEndDate),
    "",
  ];

  const issues = data.issues;
  if (issues.state === "no_audit") {
    lines.push(copy.noAuditTitle, copy.noAuditBody, "");
  } else if (issues.state === "not_comparable") {
    lines.push(copy.notComparableTitle, copy.notComparableBody, "");
  } else {
    const newIssues = issues.newIssues;
    const regressed = issues.state === "ok" ? issues.regressedIssues : [];
    if (issues.state === "no_baseline") lines.push(copy.firstCrawlNote, "");
    if (newIssues.length === 0 && regressed.length === 0) {
      lines.push(copy.noIssuesTitle, copy.noIssuesBody, "");
    }
    for (const issue of newIssues.slice(0, DETAILED_ISSUE_LIMIT)) {
      lines.push(
        `- [${severityLabel(issue.severity, copy)}] ${issue.label} — ${issue.url}`,
      );
      for (const step of issue.fixSteps) lines.push(`    * ${step}`);
    }
    // Order is fixed by the requirement: what is new (with its fix steps),
    // then what got fixed, then what came back. Credit lands between the two
    // demands on the reader's time rather than after both.
    if (issues.state === "ok" && issues.fixedCount > 0) {
      lines.push("", copy.fixedIntro(issues.fixedCount));
    }
    if (regressed.length > 0) {
      lines.push("", copy.regressedTitle);
      for (const issue of regressed.slice(0, DETAILED_ISSUE_LIMIT)) {
        lines.push(`- ${issue.label} — ${issue.url}`);
      }
    }
    lines.push("");
  }

  const search = data.search;
  if (search.state === "ok") {
    lines.push(
      copy.searchTitle,
      `${copy.clicks}: ${formatNumber(search.totals.clicks, data.locale)} (${formatDelta(search.totals.clicks, search.prevTotals.clicks, data.locale)})`,
      `${copy.impressions}: ${formatNumber(search.totals.impressions, data.locale)} (${formatDelta(search.totals.impressions, search.prevTotals.impressions, data.locale)})`,
      `${copy.position}: ${formatPosition(search.totals.position, data.locale)}`,
      "",
    );
  } else if (search.state === "not_connected") {
    lines.push(copy.searchNotConnectedTitle, copy.searchNotConnectedBody, "");
  } else if (search.state === "needs_reconnect") {
    lines.push(copy.searchReconnectTitle, copy.searchReconnectBody, "");
  } else if (search.state === "error") {
    lines.push(copy.searchErrorTitle, copy.searchErrorBody, "");
  } else {
    lines.push(copy.searchNoDataTitle, copy.searchNoDataBody, "");
  }

  lines.push(
    `${copy.ctaLabel}: ${data.reportUrl}`,
    "",
    copy.footerWhy,
    `${copy.unsubscribe}: ${data.unsubscribeUrl}`,
  );
  return lines.join("\n");
}

function buildSubject(data: WeeklyReportData, copy: Copy): string {
  const issues = data.issues;
  if (issues.state === "no_audit" || issues.state === "not_comparable") {
    return copy.subjectClean(data.siteLabel);
  }
  if (issues.criticalCount > 0) {
    return copy.subjectAlert(data.siteLabel, issues.criticalCount);
  }
  const newCount =
    issues.state === "ok"
      ? issues.newIssues.length + issues.regressedIssues.length
      : issues.newIssues.length;
  return newCount > 0
    ? copy.subjectIssues(data.siteLabel, newCount)
    : copy.subjectClean(data.siteLabel);
}

function buildIssuesHtml(data: WeeklyReportData, copy: Copy): string {
  const issues = data.issues;
  if (issues.state === "no_audit") {
    return emailSection(copy.noAuditTitle, emailParagraph(copy.noAuditBody));
  }
  if (issues.state === "not_comparable") {
    return emailSection(
      copy.notComparableTitle,
      emailParagraph(copy.notComparableBody),
    );
  }

  const blocks: string[] = [];
  if (issues.state === "no_baseline") {
    blocks.push(emailParagraph(copy.firstCrawlNote));
  }

  const newIssues = issues.newIssues;
  const regressed = issues.state === "ok" ? issues.regressedIssues : [];

  if (newIssues.length === 0 && regressed.length === 0) {
    blocks.push(
      emailSection(copy.noIssuesTitle, emailParagraph(copy.noIssuesBody)),
    );
  }
  if (newIssues.length > 0) {
    blocks.push(
      issueBlock(copy.newIssuesTitle, null, newIssues, newIssues.length, copy),
    );
  }
  // New first (that is what the fix steps are for), then resolved, then
  // regressed — the order the phase requires, and the reason the whole block
  // renders above the Search Console numbers.
  if (issues.state === "ok" && issues.fixedCount > 0) {
    const rows: EmailCell[][] = issues.fixedRules.map((rule) => [
      { text: rule.label },
      { text: String(rule.resolvedCount), align: "right" },
    ]);
    blocks.push(
      emailSection(
        copy.fixedTitle,
        [
          emailParagraph(copy.fixedIntro(issues.fixedCount)),
          rows.length > 0
            ? emailTable({
                headers: [copy.ruleColumn, copy.countColumn],
                rows,
              })
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    );
  }
  if (regressed.length > 0) {
    blocks.push(
      issueBlock(
        copy.regressedTitle,
        copy.regressedIntro,
        regressed,
        regressed.length,
        copy,
      ),
    );
  }
  return blocks.join("\n");
}

function buildSearchHtml(data: WeeklyReportData, copy: Copy): string {
  const search = data.search;
  if (search.state === "not_connected") {
    return emailSection(
      copy.searchNotConnectedTitle,
      emailParagraph(copy.searchNotConnectedBody),
    );
  }
  if (search.state === "needs_reconnect") {
    return emailSection(
      copy.searchReconnectTitle,
      emailParagraph(copy.searchReconnectBody),
    );
  }
  if (search.state === "error") {
    return emailSection(
      copy.searchErrorTitle,
      [emailParagraph(copy.searchErrorBody), emailMuted(search.message)].join(
        "\n",
      ),
    );
  }
  if (search.state === "no_data") {
    return emailSection(
      copy.searchNoDataTitle,
      emailParagraph(copy.searchNoDataBody),
    );
  }

  return emailSection(
    copy.searchTitle,
    [
      emailMuted(copy.searchSourceNote),
      totalsTable(search.totals, search.prevTotals, copy, data.locale),
      dimensionTable(copy.topPages, search.topPages, copy, data.locale, true),
      dimensionTable(
        copy.topQueries,
        search.topQueries,
        copy,
        data.locale,
        false,
      ),
      dimensionTable(copy.devices, search.devices, copy, data.locale, false),
      dimensionTable(
        copy.countries,
        search.countries,
        copy,
        data.locale,
        false,
      ),
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

/**
 * Build the message. `idempotencyKey` is derived from the subscription and the
 * reporting period, never from the clock: a retry of a send whose outcome was
 * never learned must be the same message, not a second one.
 */
export function buildWeeklyReportEmail(input: {
  to: string;
  subscriptionId: string;
  data: WeeklyReportData;
}): EmailMessage {
  const { data } = input;
  const copy = COPY[data.locale] ?? COPY.en;
  const subject = buildSubject(data, copy);

  const html = emailHtmlDocument(
    subject,
    [
      emailHeading(data.siteLabel, 1),
      emailParagraph(copy.greeting(data.siteLabel)),
      emailMuted(
        `${copy.periodLine(data.period.startDate, data.period.endDate)} · ${copy.comparedLine(
          data.period.prevStartDate,
          data.period.prevEndDate,
        )}`,
      ),
      emailDivider(),
      buildIssuesHtml(data, copy),
      emailDivider(),
      buildSearchHtml(data, copy),
      emailButton(data.reportUrl, copy.ctaLabel),
      emailFooter(
        [
          emailMuted(copy.footerWhy),
          emailRawParagraph(emailLink(data.unsubscribeUrl, copy.unsubscribe)),
        ].join("\n"),
      ),
    ].join("\n"),
    data.locale,
  );

  return {
    to: input.to,
    subject,
    text: buildText(data, copy, subject),
    html,
    idempotencyKey: `weekly-report:${input.subscriptionId}:${data.period.key}`,
    unsubscribeUrl: data.unsubscribeUrl,
  };
}

/**
 * The out-of-band alert: a crawl just introduced critical issues and the owner
 * should not have to wait until Monday to learn about it.
 *
 * Deliberately much shorter than the weekly report. It answers one question —
 * what broke and how do I fix it — and says nothing about traffic. Its
 * `idempotencyKey` is the crawl, not the clock, so a workflow replay that
 * re-notifies cannot produce a second alert about the same crawl.
 */
export function buildCriticalAlertEmail(input: {
  to: string;
  subscriptionId: string;
  auditId: string;
  locale: Locale;
  siteLabel: string;
  issues: ReportIssue[];
  reportUrl: string;
  unsubscribeUrl: string;
}): EmailMessage {
  const copy = COPY[input.locale] ?? COPY.en;
  const subject = copy.subjectAlert(input.siteLabel, input.issues.length);
  const detailed = input.issues.slice(0, DETAILED_ISSUE_LIMIT);
  const remaining = input.issues.length - detailed.length;

  const html = emailHtmlDocument(
    subject,
    [
      emailHeading(copy.alertTitle, 1),
      emailParagraph(copy.alertLead(input.siteLabel)),
      emailSection(
        copy.newIssuesTitle,
        [
          detailed.map((issue) => issueCard(issue, copy)).join(emailDivider()),
          remaining > 0 ? emailMuted(copy.moreIssues(remaining)) : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
      emailButton(input.reportUrl, copy.ctaLabel),
      emailFooter(
        [
          emailMuted(copy.alertNote),
          emailMuted(copy.footerWhy),
          emailRawParagraph(emailLink(input.unsubscribeUrl, copy.unsubscribe)),
        ].join("\n"),
      ),
    ].join("\n"),
    input.locale,
  );

  const text = [
    subject,
    "",
    copy.alertLead(input.siteLabel),
    "",
    ...detailed.flatMap((issue) => [
      `- [${severityLabel(issue.severity, copy)}] ${issue.label} — ${issue.url}`,
      ...issue.fixSteps.map((step) => `    * ${step}`),
    ]),
    remaining > 0 ? copy.moreIssues(remaining) : "",
    "",
    `${copy.ctaLabel}: ${input.reportUrl}`,
    "",
    copy.alertNote,
    copy.footerWhy,
    `${copy.unsubscribe}: ${input.unsubscribeUrl}`,
  ].join("\n");

  return {
    to: input.to,
    subject,
    text,
    html,
    idempotencyKey: `report-alert:${input.subscriptionId}:${input.auditId}`,
    unsubscribeUrl: input.unsubscribeUrl,
  };
}
