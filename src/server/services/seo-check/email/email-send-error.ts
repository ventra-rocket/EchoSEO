/**
 * Provider-agnostic send failure, carrying the one thing a batch caller must
 * know: is the next message going to fail the same way?
 *
 * Note what this deliberately does *not* model: "this recipient is permanently
 * undeliverable". Resend has no such error — a dead or suppressed mailbox is
 * accepted with a 200 and bounces asynchronously afterwards. Every failure that
 * reaches this class is therefore about us (our key, our sender domain, our
 * payload) or about a passing blip, and none of them is a reason to give up on
 * mailing a visitor who is owed a report.
 */
export class EmailSendError extends Error {
  constructor(
    message: string,
    /**
     * True when the fault is the deployment's, not this message's: the same call
     * for anyone else fails identically, so a batch should stop rather than
     * repeat it. False for a blip worth carrying on past.
     */
    readonly deploymentWide: boolean,
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}
