/**
 * Minimal Resend transport: one POST, no SDK.
 *
 * Follows the shape of `src/server/email/loops-client.ts` — bearer auth, log and
 * throw on a non-2xx — and adds the two things this funnel needs: a verdict on
 * whether a failure is worth retrying, and a guarantee that nothing it logs can
 * carry a visitor's address.
 */
import { EmailSendError } from "./email-send-error";

const RESEND_SEND_URL = "https://api.resend.com/emails";

/** Trim the logged upstream body; a diagnostic, not an archive. */
const MAX_LOGGED_ERROR_LENGTH = 500;

/**
 * Anything email-shaped, replaced before the upstream body reaches a log.
 *
 * Resend's error bodies are provider-controlled and validation errors routinely
 * quote the offending field back — so "we only log the status" cannot be an
 * assumption about someone else's API, it has to be enforced here.
 */
const EMAIL_PATTERN = /[^\s"'<>@]+@[^\s"'<>@]+\.[^\s"'<>@,)]+/g;

function redactAddresses(text: string): string {
  return text.replace(EMAIL_PATTERN, "[redacted]");
}

/**
 * Which failures mean "the next message fails too".
 *
 * Resend's documented 4xx surface contains no per-recipient rejection at all —
 * a dead or suppressed mailbox is accepted with a 200 and bounces later. What it
 * does contain is deployment faults, and these three are unambiguous: 401 is a
 * missing or restricted key, 403 is a revoked key or an unverified sender
 * domain, 429 is our rate or daily/monthly quota. None of them is about the
 * recipient, and grinding through a batch of them only wastes calls.
 *
 * Everything else — 5xx, a timeout, an idempotency-key collision, and yes a
 * stray 422 — is left to fail one message at a time, because it might be about
 * that one message and stopping the batch would punish everyone else for it.
 */
function isDeploymentWideStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 429;
}

/**
 * Pulls `user@host` out of a `"Display Name <user@host>"` From value (or
 * returns the value as-is if it has no `<...>` wrapper). `from` is always an
 * operator-set config value already trusted enough to send real mail through
 * Resend, so this stays a plain extraction rather than a validator.
 */
function extractMailboxAddress(from: string): string {
  const angleMatch = /<([^>]+)>/.exec(from);
  return (angleMatch?.[1] ?? from).trim();
}

/**
 * Gmail's bulk-sender rules — and spam filters generally — expect every
 * automated message to carry a way to opt out; the missing header is itself a
 * negative signal, even for double opt-in transactional mail like this one.
 *
 * There is no unsubscribe route or token anywhere in this codebase (checked
 * leads-repository.ts, the routes tree, and every `unsubscribe` reference —
 * there are none) and building one is out of scope here. So this is the
 * `mailto:` form, not the URL + one-click form: it reuses the funnel's own
 * verified sending mailbox as the reply target, which needs no new
 * infrastructure. `List-Unsubscribe-Post: List-Unsubscribe=One-Click` only
 * applies to the URL form (RFC 8058), so it is deliberately not sent.
 */
function listUnsubscribeHeader(from: string): string {
  return `<mailto:${extractMailboxAddress(from)}?subject=unsubscribe>`;
}

interface ResendSendInput {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  /**
   * Makes a retry safe: Resend holds the key for 24h and answers a repeat with
   * the original result instead of sending again. Without it, a send that
   * succeeds but whose response is lost (a timeout, a dropped connection) looks
   * exactly like a failure, and the retry mails the visitor twice.
   */
  idempotencyKey: string;
  /**
   * Monitored reply mailbox, or absent when the deployment has none configured
   * (see sender.ts — it is never invented). A From nobody can reply to is a
   * mild negative signal to spam filters. Resend has a dedicated `reply_to`
   * body field for exactly this, so it goes there rather than into the
   * catch-all `headers` object below.
   */
  replyTo?: string;
}

export async function sendViaResend(input: ResendSendInput): Promise<void> {
  const { apiKey, from, to, subject, text, html, idempotencyKey, replyTo } =
    input;

  // Idempotency-Key is a transport header — it tells Resend's API how to
  // treat *this HTTP request*, so it belongs in `fetch`'s `headers`. List-
  // Unsubscribe and Reply-To describe the *outgoing email message* instead,
  // so they belong in the JSON body (as `reply_to` and `headers` respectively)
  // — putting them in the HTTP request headers would compile and send fine
  // while silently doing nothing to the actual message.
  const response = await fetch(RESEND_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
      // Dropped by JSON.stringify when undefined, so an unconfigured
      // deployment sends with no Reply-To at all rather than an empty one.
      reply_to: replyTo,
      headers: {
        "List-Unsubscribe": listUnsubscribeHeader(from),
      },
    }),
  });

  if (response.ok) return;

  const rawBody = await response.text().catch(() => "");
  console.error("free-seo-check: Resend rejected a send", {
    status: response.status,
    error: redactAddresses(rawBody).slice(0, MAX_LOGGED_ERROR_LENGTH),
  });

  throw new EmailSendError(
    `Resend send failed (${response.status})`,
    isDeploymentWideStatus(response.status),
  );
}
