import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RedditAttributionInput } from "@/shared/reddit-attribution";

const { isHostedServerAuthModeMock, findFirstMock, insertMock, updateMock } =
  vi.hoisted(() => ({
    isHostedServerAuthModeMock: vi.fn(),
    findFirstMock: vi.fn(),
    insertMock: vi.fn(),
    updateMock: vi.fn(),
  }));

vi.mock("cloudflare:workers", () => ({
  // No REDDIT_* keys — a self-host deployment never sets them.
  env: {},
}));

vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: isHostedServerAuthModeMock,
}));

vi.mock("@/db", () => ({
  db: {
    query: { redditAttributions: { findFirst: findFirstMock } },
    insert: insertMock,
    update: updateMock,
  },
}));

vi.mock("@/db/schema", () => ({ redditAttributions: {} }));

import { captureRedditConversion } from "./reddit-conversions";

const validAttribution: RedditAttributionInput = { clickId: "rdt_cid_123" };

const baseArgs = {
  attribution: validAttribution,
  conversionId: "signup:user-1",
  email: "user@example.com",
  eventType: "SIGN_UP" as const,
  organizationId: "org-1",
  userId: "user-1",
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  insertMock.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  updateMock.mockReturnValue({
    set: vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("captureRedditConversion self-host gating", () => {
  it("short-circuits without touching the DB or Reddit in self-host mode", async () => {
    isHostedServerAuthModeMock.mockResolvedValue(false);

    const status = await captureRedditConversion(baseArgs);

    expect(status).toBe("skipped");
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proceeds past the gate in hosted mode (stores, no send without keys)", async () => {
    isHostedServerAuthModeMock.mockResolvedValue(true);
    findFirstMock.mockResolvedValue(undefined);

    const status = await captureRedditConversion(baseArgs);

    // Hosted path runs the upsert but stops before the Reddit API call because
    // REDDIT_* env keys are unset in this deployment.
    expect(status).toBe("stored");
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
