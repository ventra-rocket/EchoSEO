import { describe, expect, it } from "vitest";
import {
  CHAT_RATE_MAX_IN_WINDOW,
  CHAT_RATE_WINDOW_MS,
  MAX_CHAT_MESSAGE_CHARS,
  evaluateChatGuardrails,
} from "./chatGuardrails";

const NOW = 1_700_000_000_000;

function verdict(
  overrides: Partial<Parameters<typeof evaluateChatGuardrails>[0]> = {},
) {
  return evaluateChatGuardrails({
    incomingChars: 40,
    userMessageCount: 1,
    questionLimit: 20,
    recentTimestamps: [],
    now: NOW,
    ...overrides,
  });
}

describe("onboarding chat guardrails", () => {
  it("admits an ordinary question and records when it happened", () => {
    expect(verdict()).toEqual({ blocked: null, timestamps: [NOW] });
  });

  it("refuses a paste bomb before it reaches the model", () => {
    expect(verdict({ incomingChars: MAX_CHAT_MESSAGE_CHARS + 1 })).toEqual({
      blocked: "messageTooLong",
    });
    // The boundary itself is allowed: the limit is a ceiling, not a target.
    expect(verdict({ incomingChars: MAX_CHAT_MESSAGE_CHARS })).toEqual({
      blocked: null,
      timestamps: [NOW],
    });
  });

  it("refuses a burst once the window is full", () => {
    const full = Array.from(
      { length: CHAT_RATE_MAX_IN_WINDOW },
      (_, i) => NOW - i * 100,
    );

    expect(verdict({ recentTimestamps: full })).toEqual({
      blocked: "tooManyRequests",
    });
  });

  it("forgets timestamps that have left the window", () => {
    const stale = Array.from({ length: CHAT_RATE_MAX_IN_WINDOW }, (_, i) => {
      return NOW - CHAT_RATE_WINDOW_MS - i * 100;
    });

    // Every stale entry is dropped, so the turn is admitted and the persisted
    // list does not grow without bound.
    expect(verdict({ recentTimestamps: stale })).toEqual({
      blocked: null,
      timestamps: [NOW],
    });
  });

  it("stops the conversation at its turn cap", () => {
    expect(verdict({ userMessageCount: 21, questionLimit: 20 })).toEqual({
      blocked: "questionLimit",
    });
    expect(verdict({ userMessageCount: 20, questionLimit: 20 })).toEqual({
      blocked: null,
      timestamps: [NOW],
    });
  });

  it("checks length before the rate limit so a paste bomb is named for what it is", () => {
    const full = Array.from({ length: CHAT_RATE_MAX_IN_WINDOW }, () => NOW);

    // Both limits are violated. Reporting "too fast" would send the user back
    // to retry the same oversized message a minute later.
    expect(
      verdict({
        incomingChars: MAX_CHAT_MESSAGE_CHARS + 500,
        recentTimestamps: full,
      }),
    ).toEqual({ blocked: "messageTooLong" });
  });

  it("refuses a burst before it eats the turn cap", () => {
    const full = Array.from({ length: CHAT_RATE_MAX_IN_WINDOW }, () => NOW);

    // A script at the cap boundary should be told to slow down, not told it has
    // used up an allowance that the burst itself consumed.
    expect(
      verdict({
        userMessageCount: 21,
        questionLimit: 20,
        recentTimestamps: full,
      }),
    ).toEqual({ blocked: "tooManyRequests" });
  });

  it("lets a tool continuation through without spending a rate slot", () => {
    const full = Array.from({ length: CHAT_RATE_MAX_IN_WINDOW }, () => NOW);

    // The turn was already admitted; the model pausing for a tool call must not
    // look like a second request, or every multi-step answer would break at the
    // limit.
    expect(verdict({ incomingChars: null, recentTimestamps: full })).toEqual({
      blocked: null,
      timestamps: full,
    });
  });

  it("still applies the turn cap to a continuation", () => {
    // Otherwise a conversation past its cap could keep streaming for as long as
    // the model kept asking for tools.
    expect(
      verdict({ incomingChars: null, userMessageCount: 99, questionLimit: 20 }),
    ).toEqual({ blocked: "questionLimit" });
  });
});
