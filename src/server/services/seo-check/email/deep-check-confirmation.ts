/**
 * Double opt-in confirmation email for the Free Deep SEO Checker.
 *
 * This is the one that has to arrive. Nothing crawls until the recipient clicks
 * the link in it, so a copy that lands in spam does not degrade the funnel — it
 * ends it, and leaves someone who asked for a report waiting for one that will
 * never run.
 *
 * That is what the wording is for. "Free SEO audit for your site" is one of the
 * most-spammed messages in existence, and a legitimate opt-in confirmation reads
 * to a filter exactly like the genre it belongs to. So the word "free" is left
 * out — it is a top-scoring spam token and the mail does not need to mention the
 * price — and the copy leads with the thing no cold sender can honestly say:
 * that the recipient asked for this, seconds ago, on a page they were just on.
 *
 * The target URL is attacker-controlled (whatever the visitor typed), so it is
 * HTML-escaped before it reaches the HTML body.
 */
import { escapeHtml } from "../output-encode";
import { emailHtmlDocument } from "@/server/email/html-layout";
import type { EmailMessage, EmailSender } from "@/server/email/sender";
import type { Locale } from "@/server/lib/seo-rules";

interface DeepCheckConfirmationInput {
  to: string;
  /**
   * The lead this opt-in belongs to; also its identity for retry-safe sending.
   * A visitor who retries a failed request gets a new lead and so a new key —
   * correctly, because that really is a different opt-in with a different token.
   */
  leadId: string;
  /** Own-origin confirm landing URL carrying the single-use token. */
  confirmUrl: string;
  /** The page the visitor asked us to deep-check (untrusted). */
  targetUrl: string;
  /** The requester's language; missing/unknown falls back to English. */
  locale?: Locale;
}

/**
 * Per-locale copy. The Vietnamese keeps the same anti-spam intent as the English
 * (see the file header): it leads with "you just asked for this" and avoids the
 * word "miễn phí" — the VN equivalent of the "free" spam token.
 * `leadBefore`/`leadAfter` bracket the untrusted target URL so the HTML body can
 * bold just the escaped URL.
 */
const COPY: Record<
  Locale,
  {
    subject: string;
    leadBefore: string;
    leadAfter: string;
    confirmHere: (url: string) => string;
    ctaLabel: string;
    expiry: string;
  }
> = {
  en: {
    subject: "Confirm your SEO deep check",
    leadBefore: "You asked us to run a deep SEO check on ",
    leadAfter: ". Confirm this address and it starts right away.",
    confirmHere: (url) => `Confirm here: ${url}`,
    ctaLabel: "Confirm my deep check",
    expiry:
      "This link expires in 24 hours. If you didn't request this, ignore this email — nothing runs and we delete the address.",
  },
  vi: {
    subject: "Xác nhận yêu cầu kiểm tra SEO chuyên sâu",
    leadBefore: "Bạn vừa yêu cầu kiểm tra SEO chuyên sâu cho ",
    leadAfter: ". Xác nhận địa chỉ này và quá trình sẽ bắt đầu ngay.",
    confirmHere: (url) => `Xác nhận tại đây: ${url}`,
    ctaLabel: "Xác nhận kiểm tra chuyên sâu",
    expiry:
      "Liên kết này hết hạn sau 24 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này — không có gì chạy và chúng tôi sẽ xoá địa chỉ của bạn.",
  },
};

function buildDeepCheckConfirmationEmail(
  input: DeepCheckConfirmationInput,
): EmailMessage {
  const { to, leadId, confirmUrl, targetUrl } = input;
  const locale = input.locale ?? "en";
  const copy = COPY[locale];

  const subject = copy.subject;
  const text = [
    `${copy.leadBefore}${targetUrl}${copy.leadAfter}`,
    "",
    copy.confirmHere(confirmUrl),
    "",
    copy.expiry,
  ].join("\n");

  const safeTarget = escapeHtml(targetUrl);
  const safeConfirm = escapeHtml(confirmUrl);
  const html = emailHtmlDocument(
    subject,
    [
      `<p>${copy.leadBefore}<strong>${safeTarget}</strong>${copy.leadAfter}</p>`,
      `<p><a href="${safeConfirm}">${copy.ctaLabel}</a></p>`,
      `<p style="color:#6b7280;font-size:13px">${copy.expiry}</p>`,
    ].join("\n"),
    locale,
  );

  return { to, subject, text, html, idempotencyKey: `confirm:${leadId}` };
}

export async function sendDeepCheckConfirmation(
  sender: EmailSender,
  input: DeepCheckConfirmationInput,
): Promise<void> {
  await sender.send(buildDeepCheckConfirmationEmail(input));
}
