import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailMessage } from "@/server/email/sender";
import { EmailSendError } from "@/server/email/email-send-error";
import type { AuditTarget } from "@/server/features/audit/repositories/AuditTargetRepository";
import type { ReportSubscription } from "@/server/features/reports/ReportSubscriptionRepository";
import type {
  ReportIssue,
  ReportPeriod,
  WeeklyIssueReport,
} from "@/server/features/reports/report-types";

const {
  getEmailSenderMock,
  getAppPublicOriginMock,
  buildWeeklyIssueReportMock,
  newCriticalIssuesMock,
  gatherWeeklySearchSignalsMock,
  tryClaimMock,
  markSentMock,
  releaseMock,
  countSentSinceMock,
  recordSentMock,
  sendMock,
} = vi.hoisted(() => ({
  getEmailSenderMock: vi.fn(),
  getAppPublicOriginMock: vi.fn(),
  buildWeeklyIssueReportMock: vi.fn(),
  newCriticalIssuesMock: vi.fn(),
  gatherWeeklySearchSignalsMock: vi.fn(),
  tryClaimMock: vi.fn(),
  markSentMock: vi.fn(),
  releaseMock: vi.fn(),
  countSentSinceMock: vi.fn(),
  recordSentMock: vi.fn(),
  sendMock: vi.fn<(message: EmailMessage) => Promise<void>>(),
}));

vi.mock("@/server/email/sender", () => ({
  getEmailSender: getEmailSenderMock,
}));
vi.mock("@/server/lib/public-origin", () => ({
  getAppPublicOrigin: getAppPublicOriginMock,
}));
vi.mock("@/server/features/reports/report-issues", () => ({
  buildWeeklyIssueReport: buildWeeklyIssueReportMock,
  newCriticalIssues: newCriticalIssuesMock,
}));
vi.mock("@/server/features/gsc/weeklySearchPerformance", () => ({
  gatherWeeklySearchSignals: gatherWeeklySearchSignalsMock,
}));
vi.mock("@/server/features/reports/ReportSubscriptionRepository", () => ({
  ReportSendRepository: {
    tryClaim: tryClaimMock,
    markSent: markSentMock,
    release: releaseMock,
    countSentSince: countSentSinceMock,
    attachAudit: vi.fn(),
    getById: vi.fn(),
  },
  ReportSubscriptionRepository: { recordSent: recordSentMock },
}));

// Imported after the mocks are registered: a static import would bind the real
// repository and mail sender before `vi.mock` hoisting can replace them. This
// is the pattern the free checker's delivery tests already use.
const { ALERT_THROTTLE_MS, deliverCriticalAlert, deliverWeeklyReport } =
  await import("@/server/features/reports/WeeklyReportService");

const PERIOD: ReportPeriod = {
  startDate: "2026-08-07",
  endDate: "2026-08-13",
  prevStartDate: "2026-07-31",
  prevEndDate: "2026-08-06",
  key: "2026-W33",
};

const SUBSCRIPTION = {
  id: "sub-1",
  targetId: "target-1",
  projectId: "proj-1",
  organizationId: "org-1",
  cadence: "weekly",
  recipientEmail: "seo@example.com",
  locale: "en",
  enabled: true,
  ownerUserId: "user-1",
  ownerEmail: "owner@example.com",
  maxPages: 100,
  unsubscribeToken: "tok-1",
  lastSentAt: null,
  unsubscribedAt: null,
  createdAt: "2026-08-01 00:00:00",
  updatedAt: "2026-08-01 00:00:00",
} as ReportSubscription;

const TARGET = {
  id: "target-1",
  projectId: "proj-1",
  organizationId: "org-1",
  origin: "https://example.com",
  allowedHostsJson: "[]",
  maxPagesLimit: 5000,
  retentionDays: 90,
  indexnowKey: null,
  createdAt: "2026-08-01 00:00:00",
  updatedAt: "2026-08-01 00:00:00",
} as AuditTarget;

const CRITICAL: ReportIssue = {
  ruleId: "server-indexable",
  url: "https://example.com/pricing",
  issueGroup: "technical",
  severity: "critical",
  label: "Page is indexable",
  problem: "A noindex directive keeps this page out of Google.",
  fixSteps: ["Remove the noindex meta tag"],
  googleSourceUrl: "https://developers.google.com/search/docs/noindex",
  guideQuote: "You can prevent a page from appearing in Google Search.",
  lastReviewedDate: "2026-01-15",
  localized: true,
};

const EMPTY_REPORT: WeeklyIssueReport = { state: "no_audit" };

beforeEach(() => {
  getEmailSenderMock.mockResolvedValue({ send: sendMock });
  getAppPublicOriginMock.mockResolvedValue("https://app.example.com");
  buildWeeklyIssueReportMock.mockResolvedValue(EMPTY_REPORT);
  gatherWeeklySearchSignalsMock.mockResolvedValue({ state: "not_connected" });
  newCriticalIssuesMock.mockReturnValue([]);
  countSentSinceMock.mockResolvedValue(0);
  tryClaimMock.mockResolvedValue({ id: "send-1" });
  sendMock.mockResolvedValue(undefined);
});

describe("deliverWeeklyReport", () => {
  it("refuses to send when no public origin is configured", async () => {
    // Every link in the report is absolute. Mailing links that resolve nowhere
    // spends the sender's reputation for a message that cannot be acted on.
    getAppPublicOriginMock.mockResolvedValue(null);

    const outcome = await deliverWeeklyReport({
      subscription: SUBSCRIPTION,
      target: TARGET,
      period: PERIOD,
      sendId: "send-1",
    });

    expect(outcome).toBe("deferred");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("records the send on both the claim and the subscription", async () => {
    const outcome = await deliverWeeklyReport({
      subscription: SUBSCRIPTION,
      target: TARGET,
      period: PERIOD,
      sendId: "send-1",
    });

    expect(outcome).toBe("sent");
    expect(markSentMock).toHaveBeenCalledWith("send-1", expect.any(String));
    expect(recordSentMock).toHaveBeenCalledWith("sub-1", expect.any(String));
  });

  it("reports a deployment-wide mail failure as blocked", async () => {
    // A revoked API key fails every subscription; a caller looping over sites
    // needs to stop rather than burn the rest of the batch.
    sendMock.mockRejectedValue(new EmailSendError("Resend 401", true));

    const outcome = await deliverWeeklyReport({
      subscription: SUBSCRIPTION,
      target: TARGET,
      period: PERIOD,
      sendId: "send-1",
    });

    expect(outcome).toBe("blocked");
    expect(markSentMock).not.toHaveBeenCalled();
  });

  it("still builds the report when Search Console is unreachable", async () => {
    gatherWeeklySearchSignalsMock.mockResolvedValue({
      state: "error",
      message: "HTTP 500",
    });

    const outcome = await deliverWeeklyReport({
      subscription: SUBSCRIPTION,
      target: TARGET,
      period: PERIOD,
      sendId: "send-1",
    });

    expect(outcome).toBe("sent");
  });
});

describe("deliverCriticalAlert", () => {
  it("stays quiet when nothing critical appeared", async () => {
    const outcome = await deliverCriticalAlert({
      subscription: SUBSCRIPTION,
      target: TARGET,
      auditId: "audit-9",
    });

    expect(outcome).toBe("skipped");
    expect(tryClaimMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends at most one alert per subscription per day", async () => {
    newCriticalIssuesMock.mockReturnValue([CRITICAL]);
    countSentSinceMock.mockResolvedValue(1);

    const outcome = await deliverCriticalAlert({
      subscription: SUBSCRIPTION,
      target: TARGET,
      auditId: "audit-9",
    });

    expect(outcome).toBe("skipped");
    // A site mid-migration re-crawls repeatedly; without this the owner is
    // mailed on every run until they stop reading the address.
    expect(tryClaimMock).not.toHaveBeenCalled();
    expect(countSentSinceMock).toHaveBeenCalledWith(
      "sub-1",
      "alert",
      expect.any(String),
    );
  });

  it("measures the throttle window against the caller's clock", async () => {
    newCriticalIssuesMock.mockReturnValue([CRITICAL]);
    const now = new Date("2026-08-14T10:00:00Z");

    await deliverCriticalAlert({
      subscription: SUBSCRIPTION,
      target: TARGET,
      auditId: "audit-9",
      now,
    });

    expect(countSentSinceMock).toHaveBeenCalledWith(
      "sub-1",
      "alert",
      new Date(now.getTime() - ALERT_THROTTLE_MS).toISOString(),
    );
  });

  it("claims the crawl so a workflow replay cannot alert twice", async () => {
    newCriticalIssuesMock.mockReturnValue([CRITICAL]);
    tryClaimMock.mockResolvedValue(null);

    const outcome = await deliverCriticalAlert({
      subscription: SUBSCRIPTION,
      target: TARGET,
      auditId: "audit-9",
    });

    expect(outcome).toBe("skipped");
    expect(tryClaimMock).toHaveBeenCalledWith({
      subscriptionId: "sub-1",
      kind: "alert",
      periodKey: "audit-9",
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("releases the claim when the send fails", async () => {
    // Holding a claim for a mail that never left would make the unique index
    // permanently suppress the alert for this crawl.
    newCriticalIssuesMock.mockReturnValue([CRITICAL]);
    sendMock.mockRejectedValue(new EmailSendError("Resend 500", false));

    const outcome = await deliverCriticalAlert({
      subscription: SUBSCRIPTION,
      target: TARGET,
      auditId: "audit-9",
    });

    expect(outcome).toBe("deferred");
    expect(releaseMock).toHaveBeenCalledWith("send-1");
  });

  it("sends the alert and marks the claim", async () => {
    newCriticalIssuesMock.mockReturnValue([CRITICAL]);

    const outcome = await deliverCriticalAlert({
      subscription: SUBSCRIPTION,
      target: TARGET,
      auditId: "audit-9",
    });

    expect(outcome).toBe("sent");
    expect(markSentMock).toHaveBeenCalledWith("send-1", expect.any(String));
    const message = sendMock.mock.calls[0]?.[0];
    expect(message?.to).toBe("seo@example.com");
    expect(message?.idempotencyKey).toBe("report-alert:sub-1:audit-9");
    expect(message?.unsubscribeUrl).toBe(
      "https://app.example.com/api/reports/unsubscribe?token=tok-1",
    );
  });
});
