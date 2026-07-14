/**
 * Email delivery seam for the Free Deep SEO Checker.
 *
 * Slice 1 ships a no-op logging sender so the double opt-in flow runs
 * end-to-end without a provider. Phase 5 replaces `getEmailSender()` with the
 * real Resend implementation (sender domain + SPF/DKIM). Handlers depend only
 * on the `EmailSender` interface, so nothing downstream changes when it lands.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/** Logs instead of sending — the Slice 1 default (no provider wired yet). */
const noopEmailSender: EmailSender = {
  async send(message: EmailMessage): Promise<void> {
    console.info(
      `[free-seo-check:email] would send "${message.subject}" to ${message.to}`,
    );
  },
};

export function getEmailSender(): EmailSender {
  return noopEmailSender;
}
