import { useEffect, useRef } from "react";

/**
 * How long a queued submit waits for a Turnstile token before it gives up.
 *
 * The widget's 8s render guard cannot cover this state: it is disarmed the
 * moment `turnstile.render()` returns an id, which happens whether or not the
 * challenge ever answers. A challenge that renders and never mints a token
 * therefore leaves the queue waiting on Cloudflare's own `error-callback`,
 * measured at 44s in production — 44 seconds of a button that says "Starting
 * your check…" and nothing else.
 *
 * The value has to sit above that 8s guard, or it would pre-empt the widget's
 * own faster and more specific exit for "never painted". 12s adds headroom for
 * a challenge that is merely slow and caps the silence at roughly a quarter of
 * the 44s. The top of the 10-15s range buys little: releasing a challenge that
 * would still have answered costs the visitor one extra click — their next
 * submit remounts the challenge — not the check.
 */
export const QUEUED_SUBMIT_DEADLINE_MS = 12_000;

/**
 * Arms the deadline for a queued submit, returning the disarm function, or
 * `undefined` when there is nothing to wait for.
 *
 * The state guard lives here rather than in the caller so that "a token is
 * already in hand" provably schedules no timer at all: the caller is a React
 * effect, so a token arriving re-runs it, and the previous cleanup plus this
 * `undefined` are what stop a stray deadline from surfacing a verification
 * error over a check that already ran.
 */
export function armQueuedSubmitDeadline(
  queued: boolean,
  token: string | null,
  onDeadline: () => void,
): (() => void) | undefined {
  if (!queued || token !== null) return undefined;
  const timer = setTimeout(onDeadline, QUEUED_SUBMIT_DEADLINE_MS);
  return () => clearTimeout(timer);
}

/**
 * Runs `onDeadline` once a queued submit has waited out the deadline without a
 * token, and clears the timer on unmount, on the token landing, and on any
 * other release of the queue.
 *
 * `onDeadline` is held in a ref instead of being a dependency: the caller
 * re-creates the callback on every render, and a deadline that re-arms on every
 * render never arrives — which is the silence this exists to end.
 */
export function useQueuedSubmitDeadline(
  queued: boolean,
  token: string | null,
  onDeadline: () => void,
): void {
  const onDeadlineRef = useRef(onDeadline);
  onDeadlineRef.current = onDeadline;
  useEffect(
    () => armQueuedSubmitDeadline(queued, token, () => onDeadlineRef.current()),
    [queued, token],
  );
}
