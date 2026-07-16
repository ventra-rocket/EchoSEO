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
import { emailHtmlDocument } from "./html-layout";
import type { EmailMessage, EmailSender } from "./sender";

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
}

function buildDeepCheckConfirmationEmail(
  input: DeepCheckConfirmationInput,
): EmailMessage {
  const { to, leadId, confirmUrl, targetUrl } = input;

  const subject = "Confirm your SEO deep check";
  const text = [
    `You asked us to run a deep SEO check on ${targetUrl}. Confirm this address and it starts right away.`,
    "",
    `Confirm here: ${confirmUrl}`,
    "",
    "This link expires in 24 hours. If you didn't request this, ignore this email — nothing runs and we delete the address.",
  ].join("\n");

  const safeTarget = escapeHtml(targetUrl);
  const safeConfirm = escapeHtml(confirmUrl);
  const html = emailHtmlDocument(
    subject,
    [
      `<p>You asked us to run a deep SEO check on <strong>${safeTarget}</strong>. Confirm this address and it starts right away.</p>`,
      `<p><a href="${safeConfirm}">Confirm my deep check</a></p>`,
      `<p style="color:#6b7280;font-size:13px">This link expires in 24 hours. If you didn't request this, ignore this email — nothing runs and we delete the address.</p>`,
    ].join("\n"),
  );

  return { to, subject, text, html, idempotencyKey: `confirm:${leadId}` };
}

export async function sendDeepCheckConfirmation(
  sender: EmailSender,
  input: DeepCheckConfirmationInput,
): Promise<void> {
  await sender.send(buildDeepCheckConfirmationEmail(input));
}
