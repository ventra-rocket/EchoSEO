import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, revertMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  revertMock: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: { DEEP_SEO_CHECK_WORKFLOW: { create: createMock } },
}));
vi.mock("./seo-reports-repository", () => ({
  revertQueuedReportToConfirming: revertMock,
}));

const { enqueueDeepCheck } = await import("./deep-check-enqueue");

beforeEach(() => {
  vi.clearAllMocks();
  createMock.mockResolvedValue(undefined);
  revertMock.mockResolvedValue(undefined);
});

describe("enqueueDeepCheck", () => {
  it("creates the workflow with the report id as the instance id and does not revert", async () => {
    await enqueueDeepCheck("r1", "https://x.test/");

    expect(createMock).toHaveBeenCalledWith({
      id: "r1",
      params: { reportId: "r1", url: "https://x.test/" },
    });
    expect(revertMock).not.toHaveBeenCalled();
  });

  it("reverts queued->confirming and rethrows when create fails", async () => {
    const failure = new Error("workflow create failed");
    createMock.mockRejectedValue(failure);

    await expect(enqueueDeepCheck("r1", "https://x.test/")).rejects.toBe(
      failure,
    );
    expect(revertMock).toHaveBeenCalledWith("r1");
  });

  it("still surfaces the original create error when the revert itself fails", async () => {
    const failure = new Error("workflow create failed");
    createMock.mockRejectedValue(failure);
    revertMock.mockRejectedValue(new Error("d1 write failed"));

    // The report stays queued, but the caller sees the root cause, not the
    // secondary revert failure.
    await expect(enqueueDeepCheck("r1", "https://x.test/")).rejects.toBe(
      failure,
    );
  });
});
