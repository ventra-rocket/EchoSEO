/**
 * What both templates must and must not say.
 *
 * These are not style preferences. Gmail put the first real send in spam with
 * "similar to messages that were identified as spam in the past" — authentication
 * passed, the content lost. "Free SEO audit for your site" is one of the most
 * spammed messages there is, so every token this mail shares with that genre
 * costs it, and the one thing that genre can never claim is that the recipient
 * asked.
 */
import { describe, expect, it, vi } from "vitest";
import { sendDeepCheckConfirmation } from "./deep-check-confirmation";
import { sendDeepReportReady } from "./deep-report-ready";
import type { EmailMessage } from "./sender";

async function capture(
  send: (sender: { send: (m: EmailMessage) => Promise<void> }) => Promise<void>,
): Promise<EmailMessage> {
  const sendMock = vi.fn<(message: EmailMessage) => Promise<void>>();
  sendMock.mockResolvedValue(undefined);
  await send({ send: sendMock });
  const message = sendMock.mock.calls[0]?.[0];
  if (!message) throw new Error("no message was sent");
  return message;
}

const confirmation = () =>
  capture((sender) =>
    sendDeepCheckConfirmation(sender, {
      to: "visitor@example.test",
      leadId: "lead-1",
      confirmUrl: "https://echoseo.test/free-seo-check/confirm?token=abc",
      targetUrl: "https://example.test/",
    }),
  );

const reportReady = () =>
  capture((sender) =>
    sendDeepReportReady(sender, {
      to: "visitor@example.test",
      reportId: "report-1",
      reportUrl: "https://echoseo.test/r/report-1",
      targetUrl: "https://example.test/",
      retentionDays: 30,
    }),
  );

describe.each([
  ["the confirmation email", confirmation],
  ["the report-ready email", reportReady],
])("%s", (_label, build) => {
  it("keeps the word 'free' out of the subject", async () => {
    const { subject } = await build();

    // A top-scoring spam token, and the mail does not need to mention a price.
    expect(subject.toLowerCase()).not.toContain("free");
  });

  it("says the recipient asked for this", async () => {
    const { text } = await build();

    // The one claim a cold sender cannot honestly make.
    expect(text.toLowerCase()).toMatch(/you asked|you requested/);
  });

  it("sends a whole HTML document, not a fragment", async () => {
    const { html } = await build();

    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("</html>");
  });

  it("escapes the visitor-supplied target URL", async () => {
    const sendMock = vi.fn<(message: EmailMessage) => Promise<void>>();
    sendMock.mockResolvedValue(undefined);

    await sendDeepReportReady(
      { send: sendMock },
      {
        to: "visitor@example.test",
        reportId: "report-1",
        reportUrl: "https://echoseo.test/r/report-1",
        targetUrl: '"><script>alert(1)</script>',
        retentionDays: 30,
      },
    );

    expect(sendMock.mock.calls[0]?.[0].html).not.toContain("<script>");
  });
});

describe("the confirmation email", () => {
  it("carries the confirm link in both bodies", async () => {
    const { text, html } = await confirmation();

    // Nothing runs until this link is clicked — losing it ends the funnel.
    expect(text).toContain(
      "https://echoseo.test/free-seo-check/confirm?token=abc",
    );
    expect(html).toContain(
      "https://echoseo.test/free-seo-check/confirm?token=abc",
    );
  });
});

describe("the report-ready email", () => {
  it("states its own expiry from the live retention window", async () => {
    const { text } = await reportReady();

    expect(text).toContain("30 days");
  });
});
