import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportRow } from "./seo-reports-repository";
import type { EmailMessage } from "@/server/email/sender";
import { EmailSendError } from "@/server/email/email-send-error";

const {
  getFreeCheckPublicOriginMock,
  getRetentionWindowsMock,
  getEmailSenderMock,
  resolveCanonicalRootMock,
  findReportEmailTargetMock,
  findReportsAwaitingEmailMock,
  tryClaimReportEmailMock,
  releaseReportEmailClaimMock,
  sendMock,
} = vi.hoisted(() => ({
  getFreeCheckPublicOriginMock: vi.fn(),
  getRetentionWindowsMock: vi.fn(),
  getEmailSenderMock: vi.fn(),
  resolveCanonicalRootMock: vi.fn(),
  findReportEmailTargetMock: vi.fn(),
  findReportsAwaitingEmailMock: vi.fn(),
  tryClaimReportEmailMock: vi.fn(),
  releaseReportEmailClaimMock: vi.fn(),
  sendMock: vi.fn<(message: EmailMessage) => Promise<void>>(),
}));

vi.mock("./deep-check-config", () => ({
  getFreeCheckPublicOrigin: getFreeCheckPublicOriginMock,
  getRetentionWindows: getRetentionWindowsMock,
}));
vi.mock("@/server/email/sender", () => ({
  getEmailSender: getEmailSenderMock,
}));
vi.mock("./report-view", () => ({
  resolveCanonicalRoot: resolveCanonicalRootMock,
}));
vi.mock("./seo-reports-repository", () => ({
  findReportEmailTarget: findReportEmailTargetMock,
  findReportsAwaitingEmail: findReportsAwaitingEmailMock,
  tryClaimReportEmail: tryClaimReportEmailMock,
  releaseReportEmailClaim: releaseReportEmailClaimMock,
}));

const { sendReportReadyEmail, sweepReportReadyEmails } =
  await import("./report-ready-email");

function makeReport(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    id: "report-1",
    leadId: "lead-1",
    domain: "example.test",
    url: "https://example.test/page",
    locale: "en",
    status: "done",
    canonicalReportId: null,
    r2Key: "deep-reports/report-1.json",
    error: null,
    finishedAt: "2026-07-16 03:00:00",
    emailSentAt: null,
    createdAt: "2026-07-16 02:00:00",
    updatedAt: "2026-07-16 03:00:00",
    ...overrides,
  };
}

const TARGET = { report: makeReport(), email: "visitor@example.test" };

beforeEach(() => {
  vi.clearAllMocks();
  getFreeCheckPublicOriginMock.mockResolvedValue("https://echoseo.test");
  getRetentionWindowsMock.mockResolvedValue({
    reportRetentionDays: 30,
    unconfirmedGraceDays: 7,
  });
  getEmailSenderMock.mockResolvedValue({ send: sendMock });
  sendMock.mockResolvedValue(undefined);
  resolveCanonicalRootMock.mockImplementation((row: ReportRow) =>
    Promise.resolve(row),
  );
  findReportEmailTargetMock.mockResolvedValue(TARGET);
  findReportsAwaitingEmailMock.mockResolvedValue([]);
  tryClaimReportEmailMock.mockResolvedValue(true);
  releaseReportEmailClaimMock.mockResolvedValue(undefined);
});

describe("sendReportReadyEmail", () => {
  it("mails the report link to the confirmed address", async () => {
    await sendReportReadyEmail("report-1");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const message = sendMock.mock.calls[0]?.[0];
    expect(message.to).toBe("visitor@example.test");
    expect(message.text).toContain("https://echoseo.test/r/report-1");
    expect(message.html).toContain("https://echoseo.test/r/report-1");
    // The mail states its own expiry from the live retention window, so the two
    // cannot drift into promising different things.
    expect(message.text).toContain("30 days");
  });

  it("claims before sending", async () => {
    await sendReportReadyEmail("report-1");

    expect(tryClaimReportEmailMock).toHaveBeenCalledWith("report-1");
    expect(tryClaimReportEmailMock.mock.invocationCallOrder[0]).toBeLessThan(
      sendMock.mock.invocationCallOrder[0],
    );
  });

  it("does not send when another route already claimed the email", async () => {
    tryClaimReportEmailMock.mockResolvedValue(false);

    await sendReportReadyEmail("report-1");

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does not send when the report is owed no mail", async () => {
    findReportEmailTargetMock.mockResolvedValue(null);

    await sendReportReadyEmail("report-1");

    expect(tryClaimReportEmailMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends nothing when no public origin is configured", async () => {
    // A mail whose only purpose is a link must not go out linkless.
    getFreeCheckPublicOriginMock.mockResolvedValue(null);

    await sendReportReadyEmail("report-1");

    expect(findReportEmailTargetMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a blip", new EmailSendError("resend 503", false)],
    ["a deployment-wide fault", new EmailSendError("resend 403", true)],
    ["an unrecognised error", new Error("d1 blip")],
  ])(
    "hands the claim back after %s, and never throws",
    async (_label, thrown) => {
      // No failure here means "never deliverable": Resend has no per-recipient
      // rejection, so every one of these is fixable and this visitor is still owed
      // their report. Keeping the claim would silently lose it forever.
      // The caller is also a Workflow whose report already exists — throwing would
      // discard finished work over a mail problem.
      sendMock.mockRejectedValue(thrown);

      await expect(sendReportReadyEmail("report-1")).resolves.toBeUndefined();

      expect(releaseReportEmailClaimMock).toHaveBeenCalledWith("report-1");
    },
  );

  it("waits on a follower whose canonical is still running", async () => {
    const follower = makeReport({
      id: "follower-1",
      status: "queued",
      canonicalReportId: "canonical-1",
      r2Key: null,
      finishedAt: null,
    });
    findReportEmailTargetMock.mockResolvedValue({
      report: follower,
      email: "visitor@example.test",
    });
    resolveCanonicalRootMock.mockResolvedValue(
      makeReport({ id: "canonical-1", status: "running" }),
    );

    await sendReportReadyEmail("follower-1");

    expect(tryClaimReportEmailMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("mails a follower its own link once the canonical is done", async () => {
    const follower = makeReport({
      id: "follower-1",
      status: "queued",
      canonicalReportId: "canonical-1",
      r2Key: null,
      finishedAt: null,
    });
    findReportEmailTargetMock.mockResolvedValue({
      report: follower,
      email: "visitor@example.test",
    });
    resolveCanonicalRootMock.mockResolvedValue(
      makeReport({ id: "canonical-1", status: "done" }),
    );

    await sendReportReadyEmail("follower-1");

    // The follower's own id — /r/{id} resolves the chain, and this is the link
    // the visitor was promised.
    expect(sendMock.mock.calls[0]?.[0].text).toContain(
      "https://echoseo.test/r/follower-1",
    );
  });

  it("resolves the chain rather than reading the row's own status", async () => {
    // A follower keeps `queued` forever, so trusting its status would mean it is
    // never announced; trusting one hop would miss a 2-hop chain.
    const follower = makeReport({
      id: "follower-1",
      status: "queued",
      canonicalReportId: "canonical-1",
    });
    findReportEmailTargetMock.mockResolvedValue({
      report: follower,
      email: "visitor@example.test",
    });
    resolveCanonicalRootMock.mockResolvedValue(makeReport({ status: "done" }));

    await sendReportReadyEmail("follower-1");

    expect(resolveCanonicalRootMock).toHaveBeenCalledWith(follower);
  });

  it("announces a broken chain, which the report page reports as failed", async () => {
    resolveCanonicalRootMock.mockResolvedValue(null);

    await sendReportReadyEmail("report-1");

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("announces a failed check without calling it ready", async () => {
    findReportEmailTargetMock.mockResolvedValue({
      report: makeReport({ status: "failed", error: "nope", r2Key: null }),
      email: "visitor@example.test",
    });

    await sendReportReadyEmail("report-1");

    expect(sendMock.mock.calls[0]?.[0].subject).toBe(
      "Your SEO deep check is finished",
    );
  });
});

describe("sweepReportReadyEmails", () => {
  it("delivers every candidate it is handed", async () => {
    findReportsAwaitingEmailMock.mockResolvedValue([
      { report: makeReport({ id: "a" }), email: "a@example.test" },
      { report: makeReport({ id: "b" }), email: "b@example.test" },
    ]);

    await sweepReportReadyEmails();

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("keeps going after one send fails for its own reasons", async () => {
    findReportsAwaitingEmailMock.mockResolvedValue([
      { report: makeReport({ id: "a" }), email: "a@example.test" },
      { report: makeReport({ id: "b" }), email: "b@example.test" },
    ]);
    sendMock.mockRejectedValueOnce(new EmailSendError("resend 503", false));

    await sweepReportReadyEmails();

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(releaseReportEmailClaimMock).toHaveBeenCalledWith("a");
  });

  it("stops at the first deployment-wide fault instead of grinding the batch", async () => {
    // A revoked key or an unverified sender domain fails identically for every
    // remaining row. Without this, one bad config costs a doomed provider call
    // per candidate, every five minutes, forever.
    findReportsAwaitingEmailMock.mockResolvedValue([
      { report: makeReport({ id: "a" }), email: "a@example.test" },
      { report: makeReport({ id: "b" }), email: "b@example.test" },
      { report: makeReport({ id: "c" }), email: "c@example.test" },
    ]);
    sendMock.mockRejectedValue(new EmailSendError("resend 401", true));

    await sweepReportReadyEmails();

    expect(sendMock).toHaveBeenCalledTimes(1);
    // Stopping costs nothing: the row it stopped on is unclaimed and still owed
    // its mail, and so is everyone behind it.
    expect(releaseReportEmailClaimMock).toHaveBeenCalledWith("a");
    expect(tryClaimReportEmailMock).toHaveBeenCalledTimes(1);
  });

  it("reports an empty run, so a cron that stopped firing is visible", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await sweepReportReadyEmails();

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("[cron] free-seo-check report emails"),
    );
    log.mockRestore();
  });
});
