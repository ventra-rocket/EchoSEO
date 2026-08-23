import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { workersEnv } = vi.hoisted(() => ({
  workersEnv: {} as Record<string, unknown>,
}));

vi.mock("cloudflare:workers", () => ({ env: workersEnv }));

// The module memoizes the Workers env lookup, so each case needs a fresh copy.
async function loadRuntimeEnv() {
  vi.resetModules();
  return import("./runtime-env");
}

function resetEnv() {
  for (const key of Object.keys(workersEnv)) delete workersEnv[key];
  delete process.env.SOME_SECRET;
}

describe("getOptionalEnvValue", () => {
  const originalProcessEnv = { ...process.env };

  beforeEach(resetEnv);
  afterEach(() => {
    process.env = { ...originalProcessEnv };
  });

  it("reads a non-empty Workers binding value", async () => {
    workersEnv.SOME_SECRET = "live-key";
    const { getOptionalEnvValue } = await loadRuntimeEnv();
    await expect(getOptionalEnvValue("SOME_SECRET")).resolves.toBe("live-key");
  });

  it("treats an empty-string Workers binding value as unset", async () => {
    // A secret set to "" is unconfigured, not configured-to-blank. Returning ""
    // reads as "operator set this" at every call site and disables the fallback
    // (resend-client only omits `reply_to` when this is undefined).
    workersEnv.SOME_SECRET = "";
    const { getOptionalEnvValue } = await loadRuntimeEnv();
    await expect(getOptionalEnvValue("SOME_SECRET")).resolves.toBeUndefined();
  });

  it("ignores a non-string binding (a real binding, not a var)", async () => {
    workersEnv.SOME_SECRET = { fetch: () => undefined };
    const { getOptionalEnvValue } = await loadRuntimeEnv();
    await expect(getOptionalEnvValue("SOME_SECRET")).resolves.toBeUndefined();
  });

  it("falls through an empty process.env value to the Workers binding", async () => {
    process.env.SOME_SECRET = "";
    workersEnv.SOME_SECRET = "live-key";
    const { getOptionalEnvValue } = await loadRuntimeEnv();
    await expect(getOptionalEnvValue("SOME_SECRET")).resolves.toBe("live-key");
  });

  it("prefers process.env over the Workers binding", async () => {
    process.env.SOME_SECRET = "from-process";
    workersEnv.SOME_SECRET = "from-worker";
    const { getOptionalEnvValue } = await loadRuntimeEnv();
    await expect(getOptionalEnvValue("SOME_SECRET")).resolves.toBe(
      "from-process",
    );
  });
});

describe("getRequiredEnvValue", () => {
  beforeEach(resetEnv);

  it("throws for an empty-string Workers binding value", async () => {
    workersEnv.SOME_SECRET = "";
    const { getRequiredEnvValue } = await loadRuntimeEnv();
    await expect(getRequiredEnvValue("SOME_SECRET")).rejects.toThrow(
      "Missing required environment variable: SOME_SECRET",
    );
  });

  it("keeps a whitespace-only value: only a blank string is unset", async () => {
    workersEnv.SOME_SECRET = "   ";
    const { getRequiredEnvValue } = await loadRuntimeEnv();
    await expect(getRequiredEnvValue("SOME_SECRET")).resolves.toBe("   ");
  });
});
