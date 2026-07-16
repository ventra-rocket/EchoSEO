/**
 * "Your deep check is finished" email for the Free Deep SEO Checker.
 *
 * One template covers both outcomes. The subject stays neutral and the report
 * page tells the visitor whether it succeeded — "your report is ready" on a
 * failed check would be a lie, and a second template for the same single link
 * would only drift from this one.
 *
 * The target URL is whatever the visitor typed, so it is HTML-escaped before it
 * reaches the HTML body.
 */
import { escapeHtml } from "../output-encode";
import type { EmailMessage, EmailSender } from "./sender";

interface DeepReportReadyInput {
  to: string;
  /** The report being announced; also its identity for retry-safe sending. */
  reportId: string;
  /** Own-origin `/r/{id}` page carrying the report. */
  reportUrl: string;
  /** The page the visitor asked us to deep-check (untrusted). */
  targetUrl: string;
  /** Days the report is kept, so the mail states its own expiry honestly. */
  retentionDays: number;
}

function buildDeepReportReadyEmail(input: DeepReportReadyInput): EmailMessage {
  const { to, reportId, reportUrl, targetUrl, retentionDays } = input;

  const subject = "Your free SEO deep check is finished";
  const text = [
    `Your free deep SEO check for ${targetUrl} has finished.`,
    "",
    `View it here: ${reportUrl}`,
    "",
    `This link works for ${retentionDays} days, after which the report and your email address are deleted.`,
  ].join("\n");

  const safeTarget = escapeHtml(targetUrl);
  const safeReport = escapeHtml(reportUrl);
  const html = [
    `<p>Your free deep SEO check for <strong>${safeTarget}</strong> has finished.</p>`,
    `<p><a href="${safeReport}">View my deep report</a></p>`,
    `<p>This link works for ${retentionDays} days, after which the report and your email address are deleted.</p>`,
  ].join("\n");

  // One report gets one announcement, however many times the sweep retries it.
  return {
    to,
    subject,
    text,
    html,
    idempotencyKey: `report-ready:${reportId}`,
  };
}

export async function sendDeepReportReady(
  sender: EmailSender,
  input: DeepReportReadyInput,
): Promise<void> {
  await sender.send(buildDeepReportReadyEmail(input));
}
