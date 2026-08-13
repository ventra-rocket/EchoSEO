/**
 * Minimal Resend transport: one POST, no SDK.
 *
 * Shared by every Resend-backed template in the app — the free checker's
 * transactional mail, hosted-auth mail, and the periodic reports. Follows the
 * shape of its sibling `loops-client.ts` — bearer auth, log and throw on a
 * non-2xx — and adds the two things mail here needs: a verdict on whether a
 * failure is worth retrying, and a guarantee that nothing it logs can carry a
 * recipient's address.
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
 * The `List-Unsubscribe` (and, when possible, `List-Unsubscribe-Post`) pair for
 * one message.
 *
 * Gmail's and Yahoo's bulk-sender rules — and spam filters generally — expect
 * every automated message to carry a way to opt out; the missing header is
 * itself a negative signal, even for double opt-in transactional mail.
 *
 * Which form is correct depends on what the message *is*, so the caller
 * decides by supplying `unsubscribeUrl` or not:
 *
 * - **Periodic/bulk mail** (the weekly report) passes a URL. Bulk senders are
 *   required to support one-click, and RFC 8058 defines one-click as a POST to
 *   a URL — so `List-Unsubscribe-Post` is sent alongside it. Gmail will not
 *   render its own unsubscribe affordance without the pair.
 * - **Transactional mail** (the free checker's confirmation and report-ready
 *   messages) passes nothing and gets the `mailto:` form, reusing the funnel's
 *   own verified sending mailbox as the opt-out target. That form predates any
 *   unsubscribe route in this codebase and needs no infrastructure;
 *   `List-Unsubscribe-Post` is deliberately omitted because RFC 8058 one-click
 *   applies to the URL form only, and claiming it over `mailto:` is a protocol
 *   error receivers do notice.
 */
function listUnsubscribeHeaders(
  from: string,
  unsubscribeUrl: string | undefined,
): Record<string, string> {
  if (unsubscribeUrl === undefined) {
    return {
      "List-Unsubscribe": `<mailto:${extractMailboxAddress(from)}?subject=unsubscribe>`,
    };
  }

  assertOneClickUnsubscribeUrl(unsubscribeUrl);

  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/**
 * Rejects an unsubscribe URL that would poison the header, before anything is
 * sent.
 *
 * Refusing to send is the lesser harm here. A malformed or non-http header
 * value does not bounce — the message is accepted, receivers quietly downgrade
 * or spam-file it, and the failure only surfaces weeks later as a reputation
 * problem nobody can trace. A thrown error surfaces on the first send instead.
 *
 * `http:` is allowed for localhost only: `pnpm dev` has no TLS, and forcing
 * https there would mean the one code path that builds these headers is never
 * exercised outside production. Anywhere else, plain http in a header mail
 * clients POST to is a downgrade the recipient never agreed to.
 *
 * Not deploymentWide: the URL is built per subscription, so a bad one says
 * nothing about the next recipient's, and stopping the batch would withhold
 * everyone else's report over one row.
 */
function assertOneClickUnsubscribeUrl(unsubscribeUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(unsubscribeUrl);
  } catch {
    throw new EmailSendError("Unsubscribe URL is not an absolute URL", false);
  }

  const isLocalhost =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol === "https:") return;
  if (parsed.protocol === "http:" && isLocalhost) return;

  throw new EmailSendError(
    `Unsubscribe URL must be https (got ${parsed.protocol})`,
    false,
  );
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
  /**
   * Absolute https URL that unsubscribes the recipient in one request, for
   * periodic/bulk mail. Absent for transactional mail, which keeps the
   * `mailto:` form — see `listUnsubscribeHeaders`.
   */
  unsubscribeUrl?: string;
}

export async function sendViaResend(input: ResendSendInput): Promise<void> {
  const {
    apiKey,
    from,
    to,
    subject,
    text,
    html,
    idempotencyKey,
    replyTo,
    unsubscribeUrl,
  } = input;

  // Validated before the request is built, not after: a rejected URL must cost
  // nothing and, in particular, must not burn `idempotencyKey` on a send that
  // Resend would then replay for 24h.
  const messageHeaders = listUnsubscribeHeaders(from, unsubscribeUrl);

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
      headers: messageHeaders,
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
