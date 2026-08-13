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
import { emailHtmlDocument } from "@/server/email/html-layout";
import type { EmailMessage, EmailSender } from "@/server/email/sender";
import type { Locale } from "@/server/lib/seo-rules";

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
  /** The requester's language; missing/unknown falls back to English. */
  locale?: Locale;
}

/**
 * Per-locale copy. The Vietnamese preserves the anti-spam intent of the English
 * (see the file header) — it leads with "you requested this" and never uses the
 * word "miễn phí" (the VN "free" spam token). `leadBefore`/`leadAfter` bracket
 * the untrusted target URL so the HTML body can bold just the escaped URL.
 */
const COPY: Record<
  Locale,
  {
    subject: string;
    leadBefore: string;
    leadAfter: string;
    viewHere: (url: string) => string;
    ctaLabel: string;
    retention: (days: number) => string;
    footer: string;
  }
> = {
  en: {
    subject: "Your SEO deep check is finished",
    leadBefore: "The deep check you requested for ",
    leadAfter: " has finished.",
    viewHere: (url) => `View it here: ${url}`,
    ctaLabel: "View my deep report",
    retention: (days) =>
      `This link works for ${days} days, after which the report and your email address are deleted.`,
    footer:
      "You are getting this because you requested this check and confirmed your email address. We send nothing else.",
  },
  vi: {
    subject: "Bản kiểm tra SEO chuyên sâu của bạn đã xong",
    leadBefore: "Bản kiểm tra chuyên sâu bạn yêu cầu cho ",
    leadAfter: " đã hoàn tất.",
    viewHere: (url) => `Xem tại đây: ${url}`,
    ctaLabel: "Xem báo cáo chuyên sâu",
    retention: (days) =>
      `Liên kết này hoạt động trong ${days} ngày, sau đó báo cáo và địa chỉ email của bạn sẽ bị xoá.`,
    footer:
      "Bạn nhận email này vì đã yêu cầu bản kiểm tra này và xác nhận địa chỉ email. Chúng tôi không gửi gì khác.",
  },
};

function buildDeepReportReadyEmail(input: DeepReportReadyInput): EmailMessage {
  const { to, reportId, reportUrl, targetUrl, retentionDays } = input;
  const locale = input.locale ?? "en";
  const copy = COPY[locale];

  const subject = copy.subject;
  const text = [
    `${copy.leadBefore}${targetUrl}${copy.leadAfter}`,
    "",
    copy.viewHere(reportUrl),
    "",
    copy.retention(retentionDays),
    "",
    copy.footer,
  ].join("\n");

  const safeTarget = escapeHtml(targetUrl);
  const safeReport = escapeHtml(reportUrl);
  const html = emailHtmlDocument(
    subject,
    [
      `<p>${copy.leadBefore}<strong>${safeTarget}</strong>${copy.leadAfter}</p>`,
      `<p><a href="${safeReport}">${copy.ctaLabel}</a></p>`,
      `<p>${copy.retention(retentionDays)}</p>`,
      `<p style="color:#6b7280;font-size:13px">${copy.footer}</p>`,
    ].join("\n"),
    locale,
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
