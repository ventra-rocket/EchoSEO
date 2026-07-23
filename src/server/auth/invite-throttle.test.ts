/**
 * The invite throttle checks a per-org gate then a narrower per-(org, email)
 * gate against the fixed-window rate-limit DO, short-circuits on the first
 * block, and fails open when the DO is unreachable. The DO's own window logic is
 * covered by rate-limit.test.ts; here the DO call is mocked so only the gate
 * assembly + fail-open behavior is under test.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkIpRateLimitMock } = vi.hoisted(() => ({
  checkIpRateLimitMock:
    vi.fn<
      (
        ns: unknown,
        key: string,
        opts: { limit: number; windowMs: number },
      ) => Promise<{ allowed: boolean }>
    >(),
}));

vi.mock("cloudflare:workers", () => ({ env: { RATE_LIMIT_DO: {} } }));
vi.mock("@/server/services/seo-check/rate-limit-do", () => ({
  checkIpRateLimit: checkIpRateLimitMock,
}));

const { checkInviteThrottle } = await import("./invite-throttle");

const INPUT = { organizationId: "org1", emailNormalized: "a@b.test" };
const HOUR_MS = 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  checkIpRateLimitMock.mockResolvedValue({ allowed: true });
});

describe("checkInviteThrottle", () => {
  it("checks per-org, per-(org,email), then global per-email with their default limits", async () => {
    const decision = await checkInviteThrottle(INPUT);

    expect(decision.allowed).toBe(true);
    expect(checkIpRateLimitMock).toHaveBeenCalledTimes(3);
    const keys = checkIpRateLimitMock.mock.calls.map((c) => c[1]);
    expect(keys).toEqual([
      "invite-org:org1",
      "invite-org-email:org1:a@b.test",
      "invite-email:a@b.test",
    ]);
    expect(checkIpRateLimitMock.mock.calls[0]?.[2]).toEqual({
      limit: 20,
      windowMs: HOUR_MS,
    });
    expect(checkIpRateLimitMock.mock.calls[1]?.[2]).toEqual({
      limit: 3,
      windowMs: HOUR_MS,
    });
    expect(checkIpRateLimitMock.mock.calls[2]?.[2]).toEqual({
      limit: 6,
      windowMs: HOUR_MS,
    });
  });

  it("blocks on the per-org gate and short-circuits the rest", async () => {
    checkIpRateLimitMock.mockResolvedValueOnce({ allowed: false });
    const decision = await checkInviteThrottle(INPUT);

    expect(decision.allowed).toBe(false);
    expect(checkIpRateLimitMock).toHaveBeenCalledTimes(1);
  });

  it("blocks on the per-(org,email) gate and short-circuits the global gate", async () => {
    checkIpRateLimitMock
      .mockResolvedValueOnce({ allowed: true }) // per-org
      .mockResolvedValueOnce({ allowed: false }); // per-(org,email)
    const decision = await checkInviteThrottle(INPUT);

    expect(decision.allowed).toBe(false);
    expect(checkIpRateLimitMock).toHaveBeenCalledTimes(2);
  });

  it("blocks on the global per-email gate (cross-org doss protection)", async () => {
    checkIpRateLimitMock
      .mockResolvedValueOnce({ allowed: true }) // per-org
      .mockResolvedValueOnce({ allowed: true }) // per-(org,email)
      .mockResolvedValueOnce({ allowed: false }); // global per-email
    const decision = await checkInviteThrottle(INPUT);

    expect(decision.allowed).toBe(false);
    expect(checkIpRateLimitMock).toHaveBeenCalledTimes(3);
  });

  it("fails open when the rate-limit store throws (never blocks a valid invite)", async () => {
    checkIpRateLimitMock.mockRejectedValueOnce(new Error("DO unreachable"));
    const decision = await checkInviteThrottle(INPUT);

    expect(decision.allowed).toBe(true);
  });
});
