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
}

export async function sendViaResend(input: ResendSendInput): Promise<void> {
  const { apiKey, from, to, subject, text, html, idempotencyKey } = input;

  const response = await fetch(RESEND_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from, to, subject, text, html }),
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
