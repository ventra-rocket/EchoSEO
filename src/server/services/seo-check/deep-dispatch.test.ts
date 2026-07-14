import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  isDeepCheckDisabledMock,
  checkDeepCheckQuotasMock,
  reserveDomainDayMock,
  releaseDomainDayMock,
  attachReportToCanonicalMock,
  markReportFailedMock,
  revertQueuedReportToConfirmingMock,
  enqueueDeepCheckMock,
} = vi.hoisted(() => ({
  isDeepCheckDisabledMock: vi.fn<() => Promise<boolean>>(),
  checkDeepCheckQuotasMock: vi.fn(),
  reserveDomainDayMock: vi.fn(),
  releaseDomainDayMock: vi.fn(),
  attachReportToCanonicalMock: vi.fn(),
  markReportFailedMock: vi.fn(),
  revertQueuedReportToConfirmingMock: vi.fn(),
  enqueueDeepCheckMock: vi.fn(),
}));

vi.mock("./deep-check-config", () => ({
  isDeepCheckDisabled: isDeepCheckDisabledMock,
}));
vi.mock("./deep-check-quota", () => ({
  checkDeepCheckQuotas: checkDeepCheckQuotasMock,
}));
vi.mock("./dedupe-repository", () => ({
  reserveDomainDay: reserveDomainDayMock,
  releaseDomainDay: releaseDomainDayMock,
}));
vi.mock("./seo-reports-repository", () => ({
  attachReportToCanonical: attachReportToCanonicalMock,
  markReportFailed: markReportFailedMock,
  revertQueuedReportToConfirming: revertQueuedReportToConfirmingMock,
}));
vi.mock("./deep-check-enqueue", () => ({
  enqueueDeepCheck: enqueueDeepCheckMock,
}));

const { dispatchDeepCheck } = await import("./deep-dispatch");

const INPUT = {
  reportId: "r1",
  domain: "b.test",
  url: "https://b.test/",
  emailNormalized: "a@b.test",
};
const DOMAIN_DAY = /^b\.test:\d{4}-\d{2}-\d{2}$/;

beforeEach(() => {
  vi.clearAllMocks();
  isDeepCheckDisabledMock.mockResolvedValue(false);
  reserveDomainDayMock.mockResolvedValue({
    won: true,
    canonicalReportId: "r1",
  });
  checkDeepCheckQuotasMock.mockResolvedValue({ allowed: true });
  releaseDomainDayMock.mockResolvedValue(undefined);
  attachReportToCanonicalMock.mockResolvedValue(undefined);
  markReportFailedMock.mockResolvedValue(undefined);
  revertQueuedReportToConfirmingMock.mockResolvedValue(undefined);
  enqueueDeepCheckMock.mockResolvedValue(undefined);
});

describe("dispatchDeepCheck", () => {
  it("enqueues the audit when it wins the reservation and passes quota", async () => {
    await dispatchDeepCheck(INPUT);

    expect(enqueueDeepCheckMock).toHaveBeenCalledWith("r1", "https://b.test/");
    expect(attachReportToCanonicalMock).not.toHaveBeenCalled();
    expect(markReportFailedMock).not.toHaveBeenCalled();
    expect(releaseDomainDayMock).not.toHaveBeenCalled();
  });

  it("fails the report on the kill-switch without reserving or spending", async () => {
    isDeepCheckDisabledMock.mockResolvedValue(true);
    await dispatchDeepCheck(INPUT);

    expect(markReportFailedMock).toHaveBeenCalledWith("r1", expect.any(String));
    expect(reserveDomainDayMock).not.toHaveBeenCalled();
    expect(checkDeepCheckQuotasMock).not.toHaveBeenCalled();
    expect(enqueueDeepCheckMock).not.toHaveBeenCalled();
  });

  it("attaches to the canonical (no second audit) when it loses the reservation", async () => {
    reserveDomainDayMock.mockResolvedValue({
      won: false,
      canonicalReportId: "canonical-x",
    });
    await dispatchDeepCheck(INPUT);

    expect(attachReportToCanonicalMock).toHaveBeenCalledWith(
      "r1",
      "canonical-x",
    );
    expect(checkDeepCheckQuotasMock).not.toHaveBeenCalled();
    expect(enqueueDeepCheckMock).not.toHaveBeenCalled();
    expect(releaseDomainDayMock).not.toHaveBeenCalled();
  });

  it("releases the reservation and fails the report when quota blocks", async () => {
    checkDeepCheckQuotasMock.mockResolvedValue({
      allowed: false,
      message: "limit reached",
    });
    await dispatchDeepCheck(INPUT);

    expect(releaseDomainDayMock).toHaveBeenCalledWith(
      expect.stringMatching(DOMAIN_DAY),
      "r1",
    );
    expect(markReportFailedMock).toHaveBeenCalledWith("r1", "limit reached");
    expect(enqueueDeepCheckMock).not.toHaveBeenCalled();
  });

  it("releases the reservation, reverts the CAS, and rethrows when enqueue fails", async () => {
    const failure = new Error("workflow create failed");
    enqueueDeepCheckMock.mockRejectedValue(failure);

    await expect(dispatchDeepCheck(INPUT)).rejects.toBe(failure);
    expect(releaseDomainDayMock).toHaveBeenCalledWith(
      expect.stringMatching(DOMAIN_DAY),
      "r1",
    );
    expect(revertQueuedReportToConfirmingMock).toHaveBeenCalledWith("r1");
  });

  it("reverts the CAS without a stray release when the reservation itself throws", async () => {
    const failure = new Error("d1 blip");
    reserveDomainDayMock.mockRejectedValue(failure);

    await expect(dispatchDeepCheck(INPUT)).rejects.toBe(failure);
    // Never held a reservation → nothing to release, but must revert the CAS so a
    // retried confirm re-runs the whole dispatch.
    expect(releaseDomainDayMock).not.toHaveBeenCalled();
    expect(revertQueuedReportToConfirmingMock).toHaveBeenCalledWith("r1");
  });

  it("releases and reverts when the quota check throws after winning", async () => {
    const failure = new Error("DO unavailable");
    checkDeepCheckQuotasMock.mockRejectedValue(failure);

    await expect(dispatchDeepCheck(INPUT)).rejects.toBe(failure);
    expect(releaseDomainDayMock).toHaveBeenCalledWith(
      expect.stringMatching(DOMAIN_DAY),
      "r1",
    );
    expect(revertQueuedReportToConfirmingMock).toHaveBeenCalledWith("r1");
  });

  it("reserves under the (domain, day) key", async () => {
    await dispatchDeepCheck(INPUT);
    expect(reserveDomainDayMock).toHaveBeenCalledWith(
      expect.stringMatching(DOMAIN_DAY),
      "r1",
    );
  });
});
