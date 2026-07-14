import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkIpRateLimitMock, getDeepCheckLimitsMock } = vi.hoisted(() => ({
  checkIpRateLimitMock:
    vi.fn<
      (
        ns: unknown,
        key: string,
        opts: { limit: number; windowMs: number },
      ) => Promise<{ allowed: boolean }>
    >(),
  getDeepCheckLimitsMock: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({ env: { RATE_LIMIT_DO: {} } }));
vi.mock("./rate-limit-do", () => ({ checkIpRateLimit: checkIpRateLimitMock }));
vi.mock("./deep-check-config", () => ({
  DEEP_CHECK_WINDOW_MS: 86_400_000,
  getDeepCheckLimits: getDeepCheckLimitsMock,
}));

const { checkDeepCheckQuotas } = await import("./deep-check-quota");

const INPUT = { emailNormalized: "a@b.test", domain: "b.test" };

beforeEach(() => {
  vi.clearAllMocks();
  getDeepCheckLimitsMock.mockResolvedValue({
    psiDailyCeiling: 200,
    perDomainDaily: 3,
    perEmailDaily: 5,
  });
  checkIpRateLimitMock.mockResolvedValue({ allowed: true });
});

describe("checkDeepCheckQuotas", () => {
  it("allows and checks global, domain, then email in order with their limits", async () => {
    const decision = await checkDeepCheckQuotas(INPUT);

    expect(decision.allowed).toBe(true);
    expect(checkIpRateLimitMock).toHaveBeenCalledTimes(3);
    const keys = checkIpRateLimitMock.mock.calls.map((c) => c[1]);
    expect(keys).toEqual([
      "deep-psi-global",
      "deep-domain:b.test",
      "deep-email:a@b.test",
    ]);
    expect(checkIpRateLimitMock.mock.calls[0]?.[2]).toEqual({
      limit: 200,
      windowMs: 86_400_000,
    });
    expect(checkIpRateLimitMock.mock.calls[1]?.[2]?.limit).toBe(3);
    expect(checkIpRateLimitMock.mock.calls[2]?.[2]?.limit).toBe(5);
  });

  it("blocks on the global ceiling and short-circuits the per-actor gates", async () => {
    checkIpRateLimitMock.mockResolvedValueOnce({ allowed: false });
    const decision = await checkDeepCheckQuotas(INPUT);

    expect(decision.allowed).toBe(false);
    expect(decision.message).toBeTruthy();
    expect(checkIpRateLimitMock).toHaveBeenCalledTimes(1);
  });

  it("blocks on the per-email gate", async () => {
    checkIpRateLimitMock
      .mockResolvedValueOnce({ allowed: true }) // global
      .mockResolvedValueOnce({ allowed: true }) // domain
      .mockResolvedValueOnce({ allowed: false }); // email
    const decision = await checkDeepCheckQuotas(INPUT);

    expect(decision.allowed).toBe(false);
    expect(checkIpRateLimitMock).toHaveBeenCalledTimes(3);
  });
});
