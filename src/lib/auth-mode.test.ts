import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAuthMode,
  isEmailVerificationBypassed,
  isHostedAuthMode,
  isHostedClientAuthMode,
} from "./auth-mode";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAuthMode", () => {
  it("round-trips every mode the app implements", () => {
    expect(getAuthMode("hosted")).toBe("hosted");
    expect(getAuthMode("cloudflare_access")).toBe("cloudflare_access");
    expect(getAuthMode("local_noauth")).toBe("local_noauth");
  });

  // The whole safety story rests on this. AUTH_MODE reaches the client as a
  // build-time constant, so a build that never saw the value inlines nothing —
  // and that must never resolve to the public-signup mode. Everything else in
  // this file is downstream of the default being Access-gated.
  it("fails closed to cloudflare_access, never hosted", () => {
    for (const value of [undefined, null, "", "hosted ", "HOSTED", "typo"]) {
      expect(getAuthMode(value)).toBe("cloudflare_access");
    }
  });
});

describe("isHostedAuthMode", () => {
  it("is true only for an exact hosted value", () => {
    expect(isHostedAuthMode("hosted")).toBe(true);
    expect(isHostedAuthMode("cloudflare_access")).toBe(false);
    expect(isHostedAuthMode("local_noauth")).toBe(false);
    expect(isHostedAuthMode(undefined)).toBe(false);
  });
});

describe("client build-time flags", () => {
  it("reads the value baked into the bundle", () => {
    vi.stubEnv("AUTH_MODE", "hosted");
    expect(isHostedClientAuthMode()).toBe(true);

    vi.stubEnv("AUTH_MODE", "cloudflare_access");
    expect(isHostedClientAuthMode()).toBe(false);
  });

  // A hosted deployment whose bundle baked nothing renders the self-host
  // product: HostedPlanGate stops gating, the Google button disappears, PostHog
  // goes quiet. The value being absent is the failure mode, not an edge case.
  it("is not hosted when the bundle baked nothing", () => {
    vi.stubEnv("AUTH_MODE", "");
    expect(isHostedClientAuthMode()).toBe(false);
  });

  it("treats the email-verification bypass as opt-in only", () => {
    vi.stubEnv("BYPASS_EMAIL_VERIFICATION", "true");
    expect(isEmailVerificationBypassed()).toBe(true);

    vi.stubEnv("BYPASS_EMAIL_VERIFICATION", "1");
    expect(isEmailVerificationBypassed()).toBe(false);

    vi.stubEnv("BYPASS_EMAIL_VERIFICATION", "");
    expect(isEmailVerificationBypassed()).toBe(false);
  });
});

/**
 * `pnpm run deploy` runs scripts/deploy-preflight.mjs first so a build can never
 * ship a bundle whose baked AUTH_MODE disagrees with the Worker's runtime value
 * (docs/self-host-auth-mode-spec.md). These exercise the real script against a
 * throwaway wrangler config.
 *
 * Determinism: the fixture declares only AUTH_MODE, and a prefixed process.env
 * value outranks every `.env*` file in Vite's resolution — so the outcome does
 * not depend on whichever `.env.local` the machine happens to have.
 */
describe("deploy preflight", () => {
  const fixtures: string[] = [];

  afterEach(() => {
    for (const dir of fixtures.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function runPreflight(runtimeAuthMode: string, buildAuthMode: string) {
    const dir = mkdtempSync(join(tmpdir(), "preflight-"));
    fixtures.push(dir);
    const config = join(dir, "wrangler.json");
    writeFileSync(
      config,
      JSON.stringify({
        name: "preflight-fixture",
        main: "src/server.ts",
        compatibility_date: "2025-09-02",
        vars: { AUTH_MODE: runtimeAuthMode },
      }),
    );

    return spawnSync(
      process.execPath,
      ["scripts/deploy-preflight.mjs", "--config", config],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, AUTH_MODE: buildAuthMode },
      },
    );
  }

  it("passes when the bundle bakes what the Worker runs", () => {
    const result = runPreflight("hosted", "hosted");

    expect(result.status).toBe(0);
  }, 20_000);

  it("fails, naming the value, when the two disagree", () => {
    const result = runPreflight("hosted", "local_noauth");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("AUTH_MODE");
    expect(result.stderr).toContain("hosted");
    expect(result.stderr).toContain("local_noauth");
  }, 20_000);
});
