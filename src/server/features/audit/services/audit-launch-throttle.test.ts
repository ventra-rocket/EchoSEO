import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkIpRateLimitMock } = vi.hoisted(() => ({
  checkIpRateLimitMock:
    vi.fn<
      (
        namespace: unknown,
        key: string,
        options: { limit: number; windowMs: number },
      ) => Promise<{ allowed: boolean }>
    >(),
}));

vi.mock("cloudflare:workers", () => ({ env: { RATE_LIMIT_DO: {} } }));
vi.mock("@/server/services/seo-check/rate-limit-do", () => ({
  checkIpRateLimit: checkIpRateLimitMock,
}));

const { assertAuditLaunchWithinThrottle } =
  await import("./audit-launch-throttle");

beforeEach(() => {
  vi.clearAllMocks();
  checkIpRateLimitMock.mockResolvedValue({ allowed: true });
});

describe("assertAuditLaunchWithinThrottle", () => {
  it("skips the operator throttle outside hosted mode", async () => {
    await expect(
      assertAuditLaunchWithinThrottle({
        authMode: "cloudflare_access",
        organizationId: "org-1",
      }),
    ).resolves.toBeUndefined();

    expect(checkIpRateLimitMock).not.toHaveBeenCalled();
  });

  it("uses a per-organization hourly counter in hosted mode", async () => {
    await assertAuditLaunchWithinThrottle({
      authMode: "hosted",
      organizationId: "org-1",
    });

    expect(checkIpRateLimitMock).toHaveBeenCalledWith(
      expect.anything(),
      "audit-launch-org:org-1",
      { limit: 10, windowMs: 60 * 60 * 1000 },
    );
  });

  it("rejects a launch when the organization budget is exhausted", async () => {
    checkIpRateLimitMock.mockResolvedValue({ allowed: false });

    await expect(
      assertAuditLaunchWithinThrottle({
        authMode: "hosted",
        organizationId: "org-1",
      }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("fails closed when the counter is unavailable", async () => {
    const outage = new Error("rate-limit DO unavailable");
    checkIpRateLimitMock.mockRejectedValue(outage);

    await expect(
      assertAuditLaunchWithinThrottle({
        authMode: "hosted",
        organizationId: "org-1",
      }),
    ).rejects.toBe(outage);
  });
});
