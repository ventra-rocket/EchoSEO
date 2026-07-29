/**
 * The workspace invitation email must never fail an invite: a missing Resend
 * configuration or mail outage leaves the persisted invitation usable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { envVars, fetchMock } = vi.hoisted(() => ({
  envVars: {} as Record<string, string>,
  fetchMock: vi.fn<
    (
      url: string,
      init: { body: string },
    ) => Promise<{
      ok: boolean;
      status?: number;
      text?: () => Promise<string>;
    }>
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

  it("skips the send when Resend is not configured", async () => {
    envVars.AUTH_EMAIL_FROM = "EchoSEO <reports@example.com>";
    await expect(sendHostedInvitationEmail(invite)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips the send when the sender is not configured", async () => {
    envVars.RESEND_API_KEY = "re_test";
    await sendHostedInvitationEmail(invite);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the invitation through Resend when configured", async () => {
    envVars.RESEND_API_KEY = "re_test";
    envVars.AUTH_EMAIL_FROM = "EchoSEO <reports@example.com>";

    await sendHostedInvitationEmail(invite);

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = fetchMock.mock.calls[0][1].body;
    expect(body).toContain('"to":"invitee@example.com"');
    expect(body).toContain("https://app.example.com/accept-invitation/inv_1");
  });

  it("does not throw when Resend rejects the send", async () => {
    envVars.RESEND_API_KEY = "re_test";
    envVars.AUTH_EMAIL_FROM = "EchoSEO <reports@example.com>";
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('{"error":"nope"}'),
    });

    // A Loops outage must not fail invite-member — the invitation is already
    // written, so the send is best-effort.
    await expect(sendHostedInvitationEmail(invite)).resolves.toBeUndefined();
  });
});
