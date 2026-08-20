/**
 * The audit report, as one HTML document.
 *
 * Single source of truth for both rendered outputs: Browser Rendering prints it
 * to PDF, and the same bytes are served as `.doc` for a consultant to edit. Two
 * renderers, one document, so the two can never disagree about content.
 *
 * Not built on `server/email/html-layout.ts` on purpose. That module is tuned
 * for email clients — inline styles on every element, table-based structure —
 * and it is serving the live weekly report. A printed report wants the opposite:
 * a real stylesheet with `@page`, page-break control, and print colour
 * adjustment. Sharing it would mean bending one document type to the other's
 * constraints; the duplication that matters (content) is not duplicated.
 *
 * Word reads a `<style>` block well enough for headings, tables and colour, so
 * one stylesheet serves both targets.
 *
 * Every value interpolated here is escaped. Nothing in this file states a number
 * the crawl did not measure: chapters whose data this export does not collect are
 * named as absent rather than filled with plausible text.
 */
import { escapeHtml } from "@/server/services/seo-check/output-encode";
import { getIssueFixText } from "@/server/features/audit/issues/issue-fix-text";
import type { ExportOccurrence } from "@/server/features/audit/exports/audit-export-build";
import type { ReportLocale } from "@/shared/audit-export-format";
import { REPORT_COPY } from "@/server/features/audit/exports/report-copy";

/** Worst first. Anything unrecognised sorts last rather than throwing. */
const SEVERITY_ORDER = ["critical", "high", "warn", "medium", "low"];

const SEVERITY_TONE: Record<string, string> = {
  critical: "sev-critical",
  high: "sev-high",
  warn: "sev-warn",
  medium: "sev-warn",
  low: "sev-low",
};

/** How many affected URLs a finding lists before it just states the count. */
const SAMPLE_URLS_PER_FINDING = 8;

interface ReportFinding {
  ruleId: string;
  severity: string;
  issueGroup: string;
  urls: string[];
}

interface ReportInput {
  auditId: string;
  startUrl: string;
  /** When the crawl was sealed; null when it is not known. */
  snapshotSealedAt: string | null;
  exportedAt: string;
  occurrences: ExportOccurrence[];
  /** True when the audit had more issues than the export row ceiling allowed. */
  truncated: boolean;
  /** Which language the document is written in. */
  locale: ReportLocale;
}

function severityRank(severity: string): number {
  const index = SEVERITY_ORDER.indexOf(severity);
  return index === -1 ? SEVERITY_ORDER.length : index;
}

/**
 * One finding per rule, worst severity first, then by breadth. A report that
 * listed 5,000 rows would be a spreadsheet; the ZIP export is already that.
 */
function groupFindings(occurrences: ExportOccurrence[]): ReportFinding[] {
  const byRule = new Map<string, ReportFinding>();
  for (const occurrence of occurrences) {
    const existing = byRule.get(occurrence.ruleId);
    if (existing) {
      existing.urls.push(occurrence.url);
      continue;
    }
    byRule.set(occurrence.ruleId, {
      ruleId: occurrence.ruleId,
      severity: occurrence.severity,
      issueGroup: occurrence.issueGroup,
      urls: [occurrence.url],
    });
  }
  return [...byRule.values()].toSorted(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      b.urls.length - a.urls.length,
  );
}

function countBySeverity(findings: ReportFinding[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(
      finding.severity,
      (counts.get(finding.severity) ?? 0) + finding.urls.length,
    );
  }
  return counts;
}

/** A date the reader can hold, or an honest blank. Never a fabricated one. */
function readableDate(iso: string | null, absent: string): string {
  if (!iso) return absent;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? absent : at.toISOString().slice(0, 10);
}

function severityBadge(severity: string): string {
  const tone = SEVERITY_TONE[severity] ?? "sev-low";
  return `<span class="badge ${tone}">${escapeHtml(severity)}</span>`;
}

function summaryTable(
  counts: Map<string, number>,
  copy: Record<string, string>,
): string {
  const rows = SEVERITY_ORDER.filter((severity) => counts.has(severity))
    .map(
      (severity) =>
        `<tr><td>${severityBadge(severity)}</td><td class="num">${counts
          .get(severity)
          ?.toLocaleString()}</td></tr>`,
    )
    .join("");
  if (!rows) {
    return `<p class="muted">${escapeHtml(copy.noIssues)}</p>`;
  }
  return `<table class="figures"><thead><tr><th>${escapeHtml(
    copy.severity,
  )}</th><th class="num">${escapeHtml(
    copy.affected,
  )}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function findingSection(
  finding: ReportFinding,
  index: number,
  locale: ReportLocale,
  copy: Record<string, string>,
): string {
  const fix = getIssueFixText(finding.ruleId, locale);
  const heading = fix ? fix.label : finding.ruleId;
  const shown = finding.urls.slice(0, SAMPLE_URLS_PER_FINDING);
  const remaining = finding.urls.length - shown.length;

  const problem = fix
    ? `<p>${escapeHtml(fix.problem)}</p>`
    : // A rule the catalogue cannot explain is a defect, not something to
      // paper over with invented prose.
      `<p class="muted">${escapeHtml(copy.noFixText)}</p>`;

  const steps = fix?.fixSteps.length
    ? `<h4>${escapeHtml(copy.howToFix)}</h4><ol>${fix.fixSteps
        .map((step) => `<li>${escapeHtml(step)}</li>`)
        .join("")}</ol>`
    : "";

  const citation = fix
    ? `<blockquote>${escapeHtml(fix.guideQuote)}
         <cite>Google — <a href="${escapeHtml(
           fix.googleSourceUrl,
         )}">${escapeHtml(fix.googleSourceUrl)}</a>, reviewed ${escapeHtml(
           fix.lastReviewedDate,
         )}</cite>
       </blockquote>`
    : "";

  const urlList = `<h4>${escapeHtml(copy.affectedPages)}</h4><ul class="urls">${shown
    .map((url) => `<li>${escapeHtml(url)}</li>`)
    .join("")}</ul>${
    remaining > 0
      ? `<p class="muted">${remaining.toLocaleString()} ${escapeHtml(copy.andMore)}</p>`
      : ""
  }`;

  return `<section class="finding">
    <h3>${index + 1}. ${escapeHtml(heading)} ${severityBadge(finding.severity)}</h3>
    <p class="meta">${escapeHtml(copy.group)}: ${escapeHtml(
      finding.issueGroup,
    )} · ${escapeHtml(copy.rule)}: <code>${escapeHtml(
      finding.ruleId,
    )}</code> · ${finding.urls.length.toLocaleString()} ${escapeHtml(
      finding.urls.length === 1 ? copy.urlWord : copy.urlsWord,
    )}</p>
    ${problem}
    ${steps}
    ${citation}
    ${urlList}
  </section>`;
}

const STYLESHEET = `
  @page { size: A4; margin: 18mm 16mm 20mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         color: #1f2937; font-size: 11pt; line-height: 1.5; margin: 0; }
  h1 { font-size: 26pt; margin: 0 0 8pt; }
  h2 { font-size: 15pt; margin: 22pt 0 8pt; padding-bottom: 4pt;
       border-bottom: 1px solid #e5e7eb; page-break-after: avoid; }
  h3 { font-size: 12.5pt; margin: 16pt 0 4pt; page-break-after: avoid; }
  h4 { font-size: 10.5pt; margin: 10pt 0 3pt; text-transform: uppercase;
       letter-spacing: .04em; color: #6b7280; page-break-after: avoid; }
  p { margin: 0 0 7pt; }
  .cover { page-break-after: always; padding-top: 46mm; }
  .cover .domain { font-size: 17pt; color: #111827; margin-bottom: 22pt; }
  .cover dl { display: grid; grid-template-columns: auto 1fr; gap: 4pt 14pt; font-size: 10pt; }
  .cover dt { color: #6b7280; }
  .cover dd { margin: 0; }
  .muted { color: #6b7280; }
  .meta { color: #6b7280; font-size: 9.5pt; margin-bottom: 6pt; }
  code { font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace; font-size: 9.5pt; }
  table { border-collapse: collapse; width: 100%; page-break-inside: avoid; }
  th, td { border: 1px solid #e5e7eb; padding: 5pt 7pt; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-size: 9.5pt; text-transform: uppercase; letter-spacing: .04em; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .badge { display: inline-block; padding: 1pt 6pt; border-radius: 9pt;
           font-size: 8.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
  .sev-critical { background: #fee2e2; color: #991b1b; }
  .sev-high { background: #ffedd5; color: #9a3412; }
  .sev-warn { background: #fef3c7; color: #92400e; }
  .sev-low { background: #e5e7eb; color: #374151; }
  .finding { page-break-inside: avoid; margin-bottom: 6pt; }
  ol, ul { margin: 0 0 7pt; padding-left: 16pt; }
  li { margin-bottom: 2pt; }
  .urls { list-style: none; padding-left: 0; }
  .urls li { font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace;
             font-size: 9pt; word-break: break-all; color: #374151; }
  blockquote { margin: 8pt 0; padding: 6pt 10pt; border-left: 3px solid #e5e7eb;
               background: #f9fafb; font-size: 10pt; page-break-inside: avoid; }
  blockquote cite { display: block; margin-top: 4pt; font-size: 9pt; color: #6b7280; font-style: normal; }
  a { color: #2563eb; }
  .notice { border: 1px solid #e5e7eb; padding: 8pt 10pt; background: #f9fafb;
            font-size: 10pt; page-break-inside: avoid; }
`;

export function buildReportHtml(input: ReportInput): string {
  const copy = REPORT_COPY[input.locale];
  const findings = groupFindings(input.occurrences);
  const counts = countBySeverity(findings);
  const host = (() => {
    try {
      return new URL(input.startUrl).host;
    } catch {
      return input.startUrl;
    }
  })();

  const priorities = findings.slice(0, 3);
  const prioritiesHtml = priorities.length
    ? `<ol>${priorities
        .map((finding) => {
          const fix = getIssueFixText(finding.ruleId, input.locale);
          return `<li><strong>${escapeHtml(
            fix?.label ?? finding.ruleId,
          )}</strong> — ${finding.urls.length.toLocaleString()} ${escapeHtml(
            finding.urls.length === 1 ? copy.urlWord : copy.urlsWord,
          )} ${severityBadge(finding.severity)}</li>`;
        })
        .join("")}</ol>`
    : `<p class="muted">${escapeHtml(copy.nothingToPrioritise)}</p>`;

  // Said out loud rather than passed off as translated: the cross-page rules
  // carry no Vietnamese overrides yet, so a `vi` report is partly English and
  // the reader is told which part and why.
  const fallbackNotice =
    input.locale !== "en" &&
    findings.some(
      (finding) =>
        getIssueFixText(finding.ruleId, input.locale)?.localized === false,
    )
      ? `<p class="notice">${escapeHtml(copy.englishFallback)}</p>`
      : "";

  return `<!doctype html>
<html lang="${escapeHtml(input.locale)}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(copy.title)} — ${escapeHtml(host)}</title>
<style>${STYLESHEET}</style>
</head>
<body>
  <div class="cover">
    <h1>${escapeHtml(copy.title)}</h1>
    <p class="domain">${escapeHtml(host)}</p>
    <dl>
      <dt>${escapeHtml(copy.startUrl)}</dt><dd>${escapeHtml(input.startUrl)}</dd>
      <dt>${escapeHtml(copy.sealed)}</dt><dd>${escapeHtml(
        readableDate(input.snapshotSealedAt, copy.notRecorded),
      )}</dd>
      <dt>${escapeHtml(copy.generated)}</dt><dd>${escapeHtml(
        readableDate(input.exportedAt, copy.notRecorded),
      )}</dd>
      <dt>${escapeHtml(copy.auditId)}</dt><dd><code>${escapeHtml(
        input.auditId,
      )}</code></dd>
      <dt>${escapeHtml(copy.source)}</dt><dd>${escapeHtml(copy.sourceValue)}</dd>
    </dl>
  </div>

  <h2>${escapeHtml(copy.summary)}</h2>
  ${summaryTable(counts, copy)}
  <h4>${escapeHtml(copy.startHere)}</h4>
  ${prioritiesHtml}
  ${input.truncated ? `<p class="notice">${escapeHtml(copy.truncated)}</p>` : ""}
  ${fallbackNotice}

  <h2>${escapeHtml(copy.findings)}</h2>
  ${
    findings.length
      ? findings
          .map((finding, index) =>
            findingSection(finding, index, input.locale, copy),
          )
          .join("")
      : `<p class="muted">${escapeHtml(copy.noIssues)}</p>`
  }

  <h2>${escapeHtml(copy.absentTitle)}</h2>
  <p class="notice">${escapeHtml(copy.absentBody)}</p>
</body>
</html>`;
}
