import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendViaResend } from "./resend-client";
import { EmailSendError } from "./email-send-error";

const INPUT = {
  apiKey: "re_test",
  from: "EchoSEO <reports@mail.example.test>",
  to: "visitor@example.test",
  subject: "Your free SEO deep check is finished",
  text: "text body",
  html: "<p>html body</p>",
  idempotencyKey: "report-ready:abc",
};

function mockFetch(response: Response) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("sendViaResend", () => {
  it("posts the message with bearer auth and an idempotency key", async () => {
    const fetchMock = mockFetch(new Response('{"id":"x"}', { status: 200 }));

    await sendViaResend(INPUT);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");

    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer re_test");
    // Resend holds the key for 24h and answers a repeat with the original
    // result, so a retry after a lost response cannot mail the visitor twice.
    expect(headers.get("idempotency-key")).toBe("report-ready:abc");

    const body: unknown = JSON.parse(
      typeof init?.body === "string" ? init.body : "null",
    );
    expect(body).toEqual({
      from: INPUT.from,
      to: INPUT.to,
      subject: INPUT.subject,
      text: INPUT.text,
      html: INPUT.html,
      // Unconditional: every free-checker email carries an opt-out signal,
      // whether or not a Reply-To mailbox is configured.
      headers: {
        "List-Unsubscribe":
          "<mailto:reports@mail.example.test?subject=unsubscribe>",
      },
    });
  });

  it("puts List-Unsubscribe and Reply-To in the JSON body, never the HTTP request headers", async () => {
    const fetchMock = mockFetch(new Response('{"id":"x"}', { status: 200 }));

    await sendViaResend({ ...INPUT, replyTo: "team@example.test" });

    const [, init] = fetchMock.mock.calls[0] ?? [];

    // The transport headers are what Resend's API itself reads (auth,
    // idempotency) — a header meant for the outgoing email would silently do
    // nothing if it landed here instead of in the body.
    const httpHeaders = new Headers(init?.headers);
    expect(httpHeaders.has("list-unsubscribe")).toBe(false);
    expect(httpHeaders.has("reply-to")).toBe(false);

    const body: unknown = JSON.parse(
      typeof init?.body === "string" ? init.body : "null",
    );
    expect(body).toMatchObject({
      reply_to: "team@example.test",
      headers: {
        "List-Unsubscribe":
          "<mailto:reports@mail.example.test?subject=unsubscribe>",
      },
    });
  });

  it("omits reply_to from the body when the sender has no Reply-To configured", async () => {
    const fetchMock = mockFetch(new Response('{"id":"x"}', { status: 200 }));

    await sendViaResend(INPUT);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body: unknown = JSON.parse(
      typeof init?.body === "string" ? init.body : "null",
    );
    expect(body).not.toHaveProperty("reply_to");
  });

  it("builds List-Unsubscribe's mailto from the From address, ignoring the display name", async () => {
    const fetchMock = mockFetch(new Response('{"id":"x"}', { status: 200 }));

    await sendViaResend({
      ...INPUT,
      from: "EchoSEO Reports <notify@mail.example.test>",
    });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body: unknown = JSON.parse(
      typeof init?.body === "string" ? init.body : "null",
    );
    expect(body).toMatchObject({
      headers: {
        "List-Unsubscribe":
          "<mailto:notify@mail.example.test?subject=unsubscribe>",
      },
    });
  });

  // Statuses and meanings are Resend's documented error surface, not guesses.
  // The cut is "would the next message fail the same way?", which is the only
  // question the batch caller asks.
  it.each([
    // Ours, and identical for everyone: stop the batch.
    ["401 missing_api_key", 401, true],
    ["403 invalid_api_key / unverified domain", 403, true],
    ["429 rate_limit_exceeded / daily_quota_exceeded", 429, true],
    // Might be this one message: keep going, the rest may be fine.
    ["500 application_error", 500, false],
    ["503 upstream", 503, false],
    ["408 timeout", 408, false],
    ["409 concurrent_idempotent_requests", 409, false],
    ["422 invalid_parameter", 422, false],
    ["400 invalid_idempotency_key", 400, false],
  ])("reports %s as deploymentWide=%s", async (_label, status, wide) => {
    mockFetch(new Response("{}", { status }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const error: unknown = await sendViaResend(INPUT).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(EmailSendError);
    expect(error).toMatchObject({ deploymentWide: wide });
  });

  it("redacts an address the provider echoed back into its error body", async () => {
    // Resend's error bodies are provider-controlled and validation errors quote
    // the offending field, so "we never log the address" has to be enforced here
    // rather than assumed of someone else's API.
    mockFetch(
      new Response(
        JSON.stringify({
          message: `Invalid \`to\` field: ${INPUT.to} is suppressed`,
          name: "validation_error",
        }),
        { status: 422 },
      ),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendViaResend(INPUT)).rejects.toThrow(EmailSendError);

    const logged = JSON.stringify(error.mock.calls);
    expect(logged).not.toContain(INPUT.to);
    expect(logged).not.toContain("visitor@");
    // Still diagnosable: the status and the provider's reason survive.
    expect(logged).toContain("422");
    expect(logged).toContain("validation_error");
  });
});
