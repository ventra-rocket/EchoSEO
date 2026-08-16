/**
 * Turn a thrown audit failure into a line worth storing.
 *
 * The audit that motivated this died with
 * `WorkflowInternalError: Step discover-urls-1 output is too large. Maximum
 * allowed size is 1MiB.` — a sentence that names the bug exactly. It existed only
 * in the Workflows API, so the product showed a guess instead, and the guess
 * accused the user's site of blocking us. Storing the real line is what makes the
 * next failure diagnosable from the UI rather than from `wrangler`.
 *
 * Bounded because it is rendered: a stack trace in a banner is not an
 * explanation, and D1 rows should not carry unbounded text.
 */
const MAX_LENGTH = 300;

export function describeAuditFailure(error: unknown): string {
  const raw = readMessage(error);
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed)
    return "The crawl stopped with an error that carried no message.";
  return collapsed.length > MAX_LENGTH
    ? `${collapsed.slice(0, MAX_LENGTH - 1)}…`
    : collapsed;
}

function readMessage(error: unknown): string {
  if (error instanceof Error) {
    // `name` carries the useful half of a Workflows error ("WorkflowInternalError"),
    // and `message` alone would drop it.
    return error.name && error.name !== "Error"
      ? `${error.name}: ${error.message}`
      : error.message;
  }
  if (typeof error === "string") return error;
  return String(error);
}
