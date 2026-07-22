/**
 * The workspace invitation email must never fail an invite: an unconfigured
 * template (the operator has not created it) skips the send instead of throwing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { envVars, fetchMock } = vi.hoisted(() => ({
  envVars: {} as Record<string, string>,
  fetchMock:
    vi.fn<
      (
        url: string,
        init: { body: string },
      ) => Promise<{ ok: boolean; json?: () => Promise<unknown> }>
    >(),
}));
vi.mock("cloudflare:workers", () => ({ env: envVars }));

const { sendHostedInvitationEmail } = await import("./loops");

const invite = {
  email: "invitee@example.com",
  inviterName: "Alice",
  organizationName: "Acme",
  acceptUrl: "https://app.example.com/accept-invitation/inv_1",
};

describe("sendHostedInvitationEmail", () => {
  beforeEach(() => {
    for (const key of Object.keys(envVars)) delete envVars[key];
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips the send when the invite template is not configured", async () => {
    envVars.LOOPS_API_KEY = "key"; // key present, template absent
    await expect(sendHostedInvitationEmail(invite)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips the send when the API key is not configured", async () => {
    envVars.LOOPS_TRANSACTIONAL_INVITE_ID = "tmpl"; // template present, key absent
    await sendHostedInvitationEmail(invite);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the transactional with the accept link when configured", async () => {
    envVars.LOOPS_API_KEY = "key";
    envVars.LOOPS_TRANSACTIONAL_INVITE_ID = "tmpl";

    await sendHostedInvitationEmail(invite);

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = fetchMock.mock.calls[0][1].body;
    expect(body).toContain('"transactionalId":"tmpl"');
    expect(body).toContain("https://app.example.com/accept-invitation/inv_1");
  });

  it("does not throw when Loops rejects the send", async () => {
    envVars.LOOPS_API_KEY = "key";
    envVars.LOOPS_TRANSACTIONAL_INVITE_ID = "tmpl";
    fetchMock.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "nope" }),
    });

    // A Loops outage must not fail invite-member — the invitation is already
    // written, so the send is best-effort.
    await expect(sendHostedInvitationEmail(invite)).resolves.toBeUndefined();
  });
});
