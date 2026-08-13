/**
 * Email delivery seam for the Free Deep SEO Checker.
 *
 * Resolves to Resend when the deployment is configured to send, and to a logging
 * no-op when it is not. Handlers depend only on the `EmailSender` interface.
 *
 * The no-op is not leftover scaffolding: it is what a fork, a self-hoster with no
 * Resend account, and `pnpm dev` all run on — `RESEND_API_KEY` is a secret, so
 * absent by default, while the From address is a committed var and so present.
 * The funnel works end-to-end without a provider; the mail goes to the log
 * instead of an inbox.
 */
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { sendViaResend } from "./resend-client";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /**
   * Stable identity for this logical message, so a retry of a send whose outcome
   * was never learned cannot mail the visitor twice. Must be derived from what
   * the message is about (the report, the lead) — never random, or a retry is
   * just a second message.
   */
  idempotencyKey: string;
  /**
   * Absolute https URL that unsubscribes the recipient in one request.
   *
   * Set it for periodic mail — a weekly report is bulk under Gmail's and
   * Yahoo's sender rules, and bulk senders must honour a one-click opt-out
   * (RFC 8058), which only the URL form of List-Unsubscribe can express.
   * Transactional mail leaves it unset and keeps the `mailto:` form, which is
   * all a double-opt-in one-off needs and costs no new infrastructure.
   */
  unsubscribeUrl?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Logs instead of sending — used whenever the deployment cannot send.
 *
 * Names the message, never the recipient: this runs on the anonymous funnel, and
 * a misconfigured production deployment falling back here must not turn every
 * visitor's address into a log line.
 */
const noopEmailSender: EmailSender = {
  async send(message: EmailMessage): Promise<void> {
    console.info(
      `[free-seo-check:email] would send "${message.subject}" (${message.idempotencyKey})`,
    );
  },
};

function resendEmailSender(
  apiKey: string,
  from: string,
  replyTo: string | undefined,
): EmailSender {
  return {
    async send(message: EmailMessage): Promise<void> {
      await sendViaResend({ apiKey, from, replyTo, ...message });
    },
  };
}

/**
 * Both settings are required to send: a key alone cannot pick a From address, and
 * a From address outside the key's verified domain is rejected by Resend anyway.
 * Missing the key means "this deployment does not send mail" — a valid
 * configuration, not an error, and the one every fork and `pnpm dev` runs in.
 *
 * The two halves are not symmetrical, so they are not judged alike.
 * `FREE_CHECK_EMAIL_FROM` is a committed var, so it is *present by default*
 * everywhere, including dev — complaining about a From with no key would fire on
 * every send in exactly the setups the no-op exists to serve, and a warning that
 * cries wolf on first run is worse than no warning. The reverse never happens by
 * default: a key is only ever set deliberately, so a key with nowhere to send
 * from is always someone's mistake and always worth saying out loud.
 */
export async function getEmailSender(): Promise<EmailSender> {
  const [apiKey, from, replyTo] = await Promise.all([
    getOptionalEnvValue("RESEND_API_KEY"),
    getOptionalEnvValue("FREE_CHECK_EMAIL_FROM"),
    // Optional and deliberately never hardcoded: there is no mailbox this
    // funnel's mail is actually monitored at today. A From nobody can reply
    // to is a mild negative signal to spam filters, but a Reply-To pointed at
    // an address nobody reads would be worse than no Reply-To at all — so
    // this stays absent until an operator sets one, same as RESEND_API_KEY.
    getOptionalEnvValue("FREE_CHECK_EMAIL_REPLY_TO"),
  ]);

  if (apiKey && from) return resendEmailSender(apiKey, from, replyTo);

  if (apiKey && !from) {
    console.error(
      "free-seo-check: RESEND_API_KEY is set but FREE_CHECK_EMAIL_FROM is not — nothing will be sent",
    );
  }

  return noopEmailSender;
}
