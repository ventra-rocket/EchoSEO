import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOptionalEnvValueMock, sendViaResendMock } = vi.hoisted(() => ({
  getOptionalEnvValueMock: vi.fn(),
  sendViaResendMock: vi.fn(),
}));

vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: getOptionalEnvValueMock,
}));
vi.mock("./resend-client", () => ({ sendViaResend: sendViaResendMock }));

const { getEmailSender } = await import("./sender");

const MESSAGE = {
  to: "visitor@example.test",
  subject: "Confirm your free SEO deep check",
  text: "text body",
  html: "<p>html body</p>",
  idempotencyKey: "confirm:lead-1",
};

/**
 * What a fresh clone runs: @cloudflare/vite-plugin loads wrangler.jsonc's vars
 * into the dev worker, so the From address is set; the key is a secret and is
 * not.
 */
const DEV_ENV = {
  FREE_CHECK_EMAIL_FROM: "EchoSEO <reports@mail.example.test>",
};

function env(values: Record<string, string | null>) {
  getOptionalEnvValueMock.mockImplementation((name: string) =>
    Promise.resolve(values[name] ?? null),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sendViaResendMock.mockResolvedValue(undefined);
});

describe("getEmailSender", () => {
  it("sends through Resend when the deployment is configured to send", async () => {
    env({
      RESEND_API_KEY: "re_test",
      FREE_CHECK_EMAIL_FROM: "EchoSEO <reports@mail.example.test>",
    });

    await (await getEmailSender()).send(MESSAGE);

    expect(sendViaResendMock).toHaveBeenCalledWith({
      apiKey: "re_test",
      from: "EchoSEO <reports@mail.example.test>",
      ...MESSAGE,
    });
  });

  it.each([
    // What `pnpm dev` and a fork actually run: the From address is a committed
    // var so it is always present, and only the secret is missing.
    ["dev and forks — a From address from wrangler.jsonc, no key", DEV_ENV],
    ["a deployment with neither set", {}],
  ])("logs instead of sending, quietly, with %s", async (_label, values) => {
    env(values);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await (await getEmailSender()).send(MESSAGE);

    expect(sendViaResendMock).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(expect.stringContaining("would send"));
    // Sending nothing is this deployment's configuration, not a fault. A
    // warning on every send of a first `pnpm dev` run teaches people to ignore
    // warnings.
    expect(error).not.toHaveBeenCalled();
  });

  it("never logs the recipient", async () => {
    // A misconfigured production deployment falls back here, and it must not
    // turn every visitor's address into a log line.
    env(DEV_ENV);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await (await getEmailSender()).send(MESSAGE);

    expect(JSON.stringify(info.mock.calls)).not.toContain(MESSAGE.to);
  });

  it("complains about a key with no From address", async () => {
    // The one direction that never happens by default: a key is only ever set
    // deliberately, so a key with nowhere to send from is always a mistake.
    env({ RESEND_API_KEY: "re_test" });
    vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await (await getEmailSender()).send(MESSAGE);

    expect(sendViaResendMock).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("FREE_CHECK_EMAIL_FROM"),
    );
  });
});
