import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  isHostedServerAuthModeMock,
  postHogConstructor,
  captureExceptionImmediateMock,
  captureMock,
  shutdownMock,
  mockEnv,
} = vi.hoisted(() => ({
  isHostedServerAuthModeMock: vi.fn(),
  postHogConstructor: vi.fn(),
  captureExceptionImmediateMock: vi.fn(),
  captureMock: vi.fn(),
  shutdownMock: vi.fn(),
  // Mutable so each test can toggle POSTHOG keys; posthog.ts reads `env`
  // lazily inside getServerPostHogClient(), so mutation is observed at call time.
  mockEnv: {} as Record<string, string | undefined>,
}));

vi.mock("cloudflare:workers", () => ({ env: mockEnv }));

vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: isHostedServerAuthModeMock,
}));

// Methods return promises inline (not via mock return values) so the real
// module's `await client.shutdown().catch(...)` works regardless of the
// suite's mock-reset config; the spies only record that they were called.
vi.mock("posthog-node", () => ({
  PostHog: class {
    constructor(...args: unknown[]) {
      postHogConstructor(...args);
    }
    captureExceptionImmediate(...args: unknown[]) {
      captureExceptionImmediateMock(...args);
      return Promise.resolve();
    }
    capture(...args: unknown[]) {
      captureMock(...args);
    }
    shutdown() {
      shutdownMock();
      return Promise.resolve();
    }
  },
}));

import { captureServerError, captureServerEvent } from "./posthog";

const POSTHOG_KEYS = {
  POSTHOG_PUBLIC_KEY: "phc_test",
  POSTHOG_HOST: "https://ph.example.com",
};

async function captureBoth() {
  await captureServerError(new Error("boom"));
  await captureServerEvent({
    distinctId: "user-1",
    event: "did_thing",
    organizationId: "org-1",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.POSTHOG_PUBLIC_KEY = undefined;
  mockEnv.POSTHOG_HOST = undefined;
});

describe("server posthog self-host gating", () => {
  it("never constructs a client or captures in self-host, even with keys set", async () => {
    // Keys present so the ONLY thing that can prevent capture is the auth gate —
    // this makes the invariant falsifiable (removing the guard fails the test).
    Object.assign(mockEnv, POSTHOG_KEYS);
    isHostedServerAuthModeMock.mockResolvedValue(false);

    await captureBoth();

    expect(postHogConstructor).not.toHaveBeenCalled();
    expect(captureExceptionImmediateMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("does not construct a client when hosted but POSTHOG keys are unset", async () => {
    isHostedServerAuthModeMock.mockResolvedValue(true);

    await captureBoth();

    expect(postHogConstructor).not.toHaveBeenCalled();
  });

  it("captures when hosted and POSTHOG keys are present", async () => {
    Object.assign(mockEnv, POSTHOG_KEYS);
    isHostedServerAuthModeMock.mockResolvedValue(true);

    await captureBoth();

    expect(postHogConstructor).toHaveBeenCalled();
    expect(captureExceptionImmediateMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledTimes(1);
  });
});
