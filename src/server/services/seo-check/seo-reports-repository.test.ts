/**
 * Report queries against a real SQLite database.
 *
 * The email delivery tests mock this module, which hides the two things that can
 * only go wrong in SQL: the claim CAS that stops a visitor getting the same mail
 * twice, and the candidate predicate that decides who is owed mail at all. Rows
 * are seeded through the **production write paths** so the statuses and
 * timestamp formats are the ones the predicates actually meet in D1.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "./__tests__/free-check-test-db";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { createLeadWithReport, markLeadConfirmed } =
  await import("./leads-repository");
const {
  attachReportToCanonical,
  findReportById,
  findReportEmailTarget,
  findReportsAwaitingEmail,
  markReportDone,
  markReportFailed,
  markReportRunning,
  releaseReportEmailClaim,
  tryClaimReportEmail,
  tryQueueConfirmingReport,
} = await import("./seo-reports-repository");

let raw: FreeCheckTestDb["raw"];

beforeEach(async () => {
  const created = await createFreeCheckTestDb();
  raw = created.raw;
  testDb.current = created.db;
});

let seq = 0;
function ids() {
  seq += 1;
  return { leadId: `lead-${seq}`, reportId: `report-${seq}` };
}

/** Seeds a lead + its report the way deep-start does. */
async function seedLead(
  options: { domain?: string; confirmed?: boolean } = {},
): Promise<{ leadId: string; reportId: string; email: string }> {
  const { leadId, reportId } = ids();
  const domain = options.domain ?? `d${seq}.test`;
  const email = `u${seq}@example.test`;

  await createLeadWithReport(
    {
      id: leadId,
      email,
      emailNormalized: email,
      url: `https://${domain}/page`,
      domain,
      locale: "en",
      source: "free-seo-check",
      confirmToken: `token-${seq}`,
      confirmTokenExpiresAt: new Date("2099-01-01T00:00:00.000Z").toISOString(),
    },
    {
      id: reportId,
      leadId,
      domain,
      url: `https://${domain}/page`,
      locale: "en",
      status: "confirming",
    },
  );

  if (options.confirmed !== false) {
    await markLeadConfirmed(leadId, new Date().toISOString());
  }
  return { leadId, reportId, email };
}

/** Drives a seeded report to `done`, exactly as confirm + the Workflow do. */
async function seedDoneReport(options: { domain?: string } = {}) {
  const seeded = await seedLead(options);
  await tryQueueConfirmingReport(seeded.reportId);
  await markReportDone(seeded.reportId, `deep-reports/${seeded.reportId}.json`);
  return seeded;
}

describe("tryClaimReportEmail", () => {
  it("lets exactly one caller claim the email", async () => {
    const { reportId } = await seedDoneReport();

    // The Workflow and the sweep both try; a second copy of the same mail is
    // the failure this CAS exists to prevent.
    expect(await tryClaimReportEmail(reportId)).toBe(true);
    expect(await tryClaimReportEmail(reportId)).toBe(false);
  });

  it("survives concurrent claims", async () => {
    const { reportId } = await seedDoneReport();

    const results = await Promise.all([
      tryClaimReportEmail(reportId),
      tryClaimReportEmail(reportId),
      tryClaimReportEmail(reportId),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("does not touch updated_at", async () => {
    // Retention measures a deduped row's age from updated_at. If claiming (or
    // releasing) bumped it, a send that keeps failing and retrying every few
    // minutes would push the row's deletion out forever and strand the lead's
    // address — the exact class of bug that already cost a review round.
    const { reportId } = await seedDoneReport();
    const before = await findReportById(reportId);

    await tryClaimReportEmail(reportId);
    await releaseReportEmailClaim(reportId);
    const after = await findReportById(reportId);

    expect(after?.updatedAt).toBe(before?.updatedAt);
  });

  it("re-opens the claim after a release", async () => {
    const { reportId } = await seedDoneReport();

    await tryClaimReportEmail(reportId);
    await releaseReportEmailClaim(reportId);

    expect(await tryClaimReportEmail(reportId)).toBe(true);
  });
});

describe("findReportsAwaitingEmail", () => {
  it("returns a finished report with its confirmed lead's address", async () => {
    const { reportId, email } = await seedDoneReport();

    const rows = await findReportsAwaitingEmail(10);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.report.id).toBe(reportId);
    expect(rows[0]?.email).toBe(email);
  });

  it("returns a failed report — a failure is a finished outcome", async () => {
    const seeded = await seedLead();
    await tryQueueConfirmingReport(seeded.reportId);
    await markReportFailed(
      seeded.reportId,
      "The deep check could not be completed.",
    );

    const rows = await findReportsAwaitingEmail(10);

    expect(rows.map((row) => row.report.id)).toEqual([seeded.reportId]);
  });

  it("returns a dedupe follower, which never leaves `queued` on its own", async () => {
    const canonical = await seedDoneReport({ domain: "shared.test" });
    const follower = await seedLead({ domain: "shared.test" });
    await tryQueueConfirmingReport(follower.reportId);
    await attachReportToCanonical(follower.reportId, canonical.reportId);

    const rows = await findReportsAwaitingEmail(10);

    // Both: the canonical is done, and the follower rides its result.
    expect(rows.map((row) => row.report.id).toSorted()).toEqual(
      [canonical.reportId, follower.reportId].toSorted(),
    );
  });

  it("skips a lead that never confirmed", async () => {
    const seeded = await seedLead({ confirmed: false });
    await tryQueueConfirmingReport(seeded.reportId);
    await markReportDone(seeded.reportId, "deep-reports/x.json");

    expect(await findReportsAwaitingEmail(10)).toEqual([]);
  });

  it("skips a report whose email is already claimed", async () => {
    const { reportId } = await seedDoneReport();
    await tryClaimReportEmail(reportId);

    expect(await findReportsAwaitingEmail(10)).toEqual([]);
  });

  it.each([
    ["confirming", async (_id: string) => {}],
    ["queued", async (id: string) => void (await tryQueueConfirmingReport(id))],
    [
      "running",
      async (id: string) => {
        await tryQueueConfirmingReport(id);
        await markReportRunning(id);
      },
    ],
  ])(
    "skips a report still %s with nothing to announce",
    async (_label, drive) => {
      const seeded = await seedLead();
      await drive(seeded.reportId);

      expect(await findReportsAwaitingEmail(10)).toEqual([]);
    },
  );

  it("honours the batch limit", async () => {
    await seedDoneReport();
    await seedDoneReport();

    expect(await findReportsAwaitingEmail(1)).toHaveLength(1);
  });

  it("hands out the longest-waiting report first", async () => {
    // Some candidates come back on every run without being delivered (a follower
    // whose canonical is still running). Without a defined order, SQLite decides
    // who gets the limited batch, and the visitor waiting longest can be passed
    // over indefinitely.
    //
    // The oldest row is inserted *last* on purpose: seeded in age order, SQLite's
    // natural rowid order already matches the answer, and the test would pass
    // whether or not the query orders anything.
    await seedDoneReport();
    const oldest = await seedDoneReport();
    await raw.execute({
      sql: "UPDATE seo_reports SET created_at = ? WHERE id = ?",
      args: ["2020-01-01 00:00:00", oldest.reportId],
    });

    const rows = await findReportsAwaitingEmail(1);

    expect(rows[0]?.report.id).toBe(oldest.reportId);
  });
});

describe("findReportEmailTarget", () => {
  it("returns the report and address for a confirmed, unclaimed report", async () => {
    const { reportId, email } = await seedDoneReport();

    const target = await findReportEmailTarget(reportId);

    expect(target?.report.id).toBe(reportId);
    expect(target?.email).toBe(email);
  });

  it("returns null once the email is claimed", async () => {
    const { reportId } = await seedDoneReport();
    await tryClaimReportEmail(reportId);

    expect(await findReportEmailTarget(reportId)).toBeNull();
  });

  it("returns null for an unconfirmed lead", async () => {
    const seeded = await seedLead({ confirmed: false });

    expect(await findReportEmailTarget(seeded.reportId)).toBeNull();
  });

  it("returns null for an unknown id", async () => {
    expect(await findReportEmailTarget("nope")).toBeNull();
  });
});
