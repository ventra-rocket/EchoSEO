/**
 * Double opt-in confirmation email for the Free Deep SEO Checker.
 *
 * Body is intentionally minimal: one line of context + one confirm link. The
 * target URL is attacker-controlled (whatever the visitor typed), so it is
 * HTML-escaped before it reaches the HTML body.
 */
import { escapeHtml } from "../output-encode";
import type { EmailMessage, EmailSender } from "./sender";

interface DeepCheckConfirmationInput {
  to: string;
  /** Own-origin confirm landing URL carrying the single-use token. */
  confirmUrl: string;
  /** The page the visitor asked us to deep-check (untrusted). */
  targetUrl: string;
}

function buildDeepCheckConfirmationEmail(
  input: DeepCheckConfirmationInput,
): EmailMessage {
  const { to, confirmUrl, targetUrl } = input;

  const subject = "Confirm your free SEO deep check";
  const text = [
    `Confirm your free deep SEO check for ${targetUrl}.`,
    "",
    `Confirm here: ${confirmUrl}`,
    "",
    "This link expires in 24 hours. If you didn't request this, ignore this email.",
  ].join("\n");

  const safeTarget = escapeHtml(targetUrl);
  const safeConfirm = escapeHtml(confirmUrl);
  const html = [
    `<p>Confirm your free deep SEO check for <strong>${safeTarget}</strong>.</p>`,
    `<p><a href="${safeConfirm}">Confirm my deep check</a></p>`,
    `<p>This link expires in 24 hours. If you didn't request this, ignore this email.</p>`,
  ].join("\n");

  return { to, subject, text, html };
}

export async function sendDeepCheckConfirmation(
  sender: EmailSender,
  input: DeepCheckConfirmationInput,
): Promise<void> {
  await sender.send(buildDeepCheckConfirmationEmail(input));
}
