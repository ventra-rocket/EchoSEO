import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOptionalEnvValueMock } = vi.hoisted(() => ({
  getOptionalEnvValueMock: vi.fn(),
}));

vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: getOptionalEnvValueMock,
}));

const { getScreenshotDailyCeiling, isScreenshotDisabled } =
  await import("./deep-check-config");

beforeEach(() => {
  vi.clearAllMocks();
  getOptionalEnvValueMock.mockResolvedValue(undefined);
});

describe("getScreenshotDailyCeiling", () => {
  // 600 = one render per strategy (mobile + desktop) over the pre-strategy 300.
  it("defaults to 600 when the env var is unset", async () => {
    await expect(getScreenshotDailyCeiling()).resolves.toBe(600);
    expect(getOptionalEnvValueMock).toHaveBeenCalledWith(
      "FREE_SCREENSHOT_DAILY_CEILING",
    );
  });

  it("stays operator-tunable through the env var", async () => {
    getOptionalEnvValueMock.mockResolvedValue("50");
    await expect(getScreenshotDailyCeiling()).resolves.toBe(50);
  });

  it.each([["junk"], ["0"], ["-3"], [""]])(
    "falls back to the default on a non-positive-integer value %j",
    async (raw) => {
      getOptionalEnvValueMock.mockResolvedValue(raw);
      await expect(getScreenshotDailyCeiling()).resolves.toBe(600);
    },
  );
});

describe("isScreenshotDisabled", () => {
  it("is off unless the kill-switch is exactly 'true'", async () => {
    await expect(isScreenshotDisabled()).resolves.toBe(false);

    getOptionalEnvValueMock.mockResolvedValue("1");
    await expect(isScreenshotDisabled()).resolves.toBe(false);

    getOptionalEnvValueMock.mockResolvedValue("true");
    await expect(isScreenshotDisabled()).resolves.toBe(true);
  });
});
