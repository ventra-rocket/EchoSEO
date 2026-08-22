/**
 * Spend and abuse limits for the onboarding strategy chat.
 *
 * The chat is the only surface in EchoSEO where a signed-up user can spend
 * operator money by typing. Every turn costs an OpenRouter call with the full
 * fact sheet in the prompt, up to five tool steps and up to 4,000 output
 * tokens. Until this module existed the only cap lived inside the billing gate,
 * which is skipped entirely when `HOSTED_ACCESS_OPEN=true` — the configuration
 * production actually runs. So the deployed behaviour was: unlimited turns per
 * project, no length limit, no rate limit.
 *
 * These checks are deliberately cheap and local: they run before the model is
 * called, need no network, and cannot themselves cost anything. They are a
 * floor under the billing gate, not a replacement for it.
 */

/**
 * Per-message input ceiling. Roughly 500 tokens: enough for a real question
 * about a site, far below the "paste an entire document and bill the operator
 * for reading it" range. The model's context is over 100k, so nothing but this
 * check stands between a paste bomb and a bill.
 */
export const MAX_CHAT_MESSAGE_CHARS = 2000;

/** Sliding window for the burst limit. */
export const CHAT_RATE_WINDOW_MS = 60_000;

/**
 * Turns allowed inside one window. A human asking questions never hits six per
 * minute; a script does it immediately. The turn cap alone would still let that
 * script spend the whole allowance in two seconds, which is why this exists
 * separately.
 */
export const CHAT_RATE_MAX_IN_WINDOW = 6;

type ChatGuardrailBlock =
  | "messageTooLong"
  | "tooManyRequests"
  | "questionLimit";

type ChatGuardrailVerdict =
  | { blocked: ChatGuardrailBlock }
  | { blocked: null; timestamps: number[] };

/**
 * Decide whether one incoming turn may reach the model.
 *
 * Pure on purpose: the Durable Object owns the storage and the streaming, and
 * this owns the arithmetic, so the limits can be tested without a DO, a model
 * or a network. `timestamps` comes back pruned to the current window with `now`
 * appended, ready to persist — the caller never has to reimplement the pruning
 * and get it subtly different.
 *
 * Order matters. Length is checked first because it is the cheapest signal and
 * the most likely to be a mistake rather than abuse; the rate limit second so a
 * burst is refused before it consumes turns from the cap; the cap last because
 * it is the one a legitimate user eventually reaches.
 */
export function evaluateChatGuardrails(input: {
  /** Characters in the incoming user message, or null for a tool continuation. */
  incomingChars: number | null;
  /** User turns already stored in this conversation, including the incoming one. */
  userMessageCount: number;
  /** Turn cap for the caller's billing mode. */
  questionLimit: number;
  /** Recent accepted-turn timestamps, oldest first. */
  recentTimestamps: readonly number[];
  now: number;
}): ChatGuardrailVerdict {
  // Bound locally so the compiler keeps the narrowing across the `&&`; reading
  // `input.incomingChars` twice loses it.
  const incomingChars = input.incomingChars;
  const isNewUserTurn = incomingChars !== null;

  if (isNewUserTurn && incomingChars > MAX_CHAT_MESSAGE_CHARS) {
    return { blocked: "messageTooLong" };
  }

  const inWindow = input.recentTimestamps.filter(
    (at) => input.now - at < CHAT_RATE_WINDOW_MS,
  );

  if (isNewUserTurn && inWindow.length >= CHAT_RATE_MAX_IN_WINDOW) {
    return { blocked: "tooManyRequests" };
  }

  if (input.userMessageCount > input.questionLimit) {
    return { blocked: "questionLimit" };
  }

  // A tool continuation is the tail of a turn that was already admitted, so it
  // must not consume a second slot in the window.
  return {
    blocked: null,
    timestamps: isNewUserTurn ? [...inWindow, input.now] : inWindow,
  };
}
