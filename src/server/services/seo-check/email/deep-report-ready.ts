/**
 * "Your deep check is finished" email for the Free Deep SEO Checker.
 *
 * One template covers both outcomes. The subject stays neutral and the report
 * page tells the visitor whether it succeeded — "your report is ready" on a
 * failed check would be a lie, and a second template for the same single link
 * would only drift from this one.
 *
 * The wording fights an unusual headwind: "free SEO audit for your site" is one
 * of the most-spammed messages in existence, so a legitimate, double-opt-in
 * report reads to a filter exactly like the genre it belongs to. Two things
 * follow. The word "free" is left out — it is a top-scoring spam token and the
 * mail does not need to mention the price. And the copy leads with the thing no
 * cold sender can say: that the recipient asked for this, at a named address, on
 * a page they were just on.
 *
 * The target URL is whatever the visitor typed, so it is HTML-escaped before it
 * reaches the HTML body.
 */
import { escapeHtml } from "../output-encode";
import { emailHtmlDocument } from "./html-layout";
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

  const subject = "Your SEO deep check is finished";
  const text = [
    `The deep check you requested for ${targetUrl} has finished.`,
    "",
    `View it here: ${reportUrl}`,
    "",
    `This link works for ${retentionDays} days, after which the report and your email address are deleted.`,
    "",
    "You are getting this because you requested this check and confirmed your email address. We send nothing else.",
  ].join("\n");

  const safeTarget = escapeHtml(targetUrl);
  const safeReport = escapeHtml(reportUrl);
  const html = emailHtmlDocument(
    subject,
    [
      `<p>The deep check you requested for <strong>${safeTarget}</strong> has finished.</p>`,
      `<p><a href="${safeReport}">View my deep report</a></p>`,
      `<p>This link works for ${retentionDays} days, after which the report and your email address are deleted.</p>`,
      `<p style="color:#6b7280;font-size:13px">You are getting this because you requested this check and confirmed your email address. We send nothing else.</p>`,
    ].join("\n"),
  );

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
