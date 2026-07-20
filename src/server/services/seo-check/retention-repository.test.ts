/**
 * Retention queries against a real SQLite database.
 *
 * The sweep's own tests mock this module, which hides the only thing that can
 * actually delete a user's data early: the SQL. So this suite runs the real
 * queries over the real migration DDL, and seeds rows through the **production
 * write paths** (`createLeadWithReport`, `markReportDone`, …) rather than
 * hand-written inserts — the timestamp formats those writers produce are
 * precisely what the predicates have to match.
 *
 * The schema comes from `createFreeCheckTestDb`, which replays the whole
 * migration journal.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "./__tests__/free-check-test-db";

// The repositories import `db` at module load; this holds the per-test in-memory
// instance behind a getter so each test gets a fresh database.
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
  markReportDone,
  markReportFailed,
  attachReportToCanonical,
  tryQueueConfirmingReport,
} = await import("./seo-reports-repository");
const {
  findExpiredLeadIds,
  findAbandonedLeadIds,
  findReportKeysForLeads,
  deleteLeadsByIds,
} = await import("./retention-repository");

/** Far enough in the past that a freshly-written row is never "expired". */
const PAST_CUTOFF = "2020-01-01 00:00:00";
/** Far enough in the future that any settled row counts as expired. */
const FUTURE_CUTOFF = "2099-01-01 00:00:00";

let db: FreeCheckTestDb["db"];
let raw: FreeCheckTestDb["raw"];

beforeEach(async () => {
  ({ db, raw } = await createFreeCheckTestDb());
  testDb.current = db;
});

let seq = 0;
function ids() {
  seq += 1;
  return { leadId: `lead-${seq}`, reportId: `report-${seq}` };
}

/** Seeds a confirmed lead + its report exactly the way the handlers do. */
async function seedConfirmedLead(overrides: { domain?: string } = {}) {
  const { leadId, reportId } = ids();
  const domain = overrides.domain ?? `d${seq}.test`;
  await createLeadWithReport(
    {
      id: leadId,
      email: `u${seq}@example.test`,
      emailNormalized: `u${seq}@example.test`,
      url: `https://${domain}/`,
      domain,
      locale: "en",
      source: "free-seo-check",
      confirmToken: `token-${seq}`,
      // Written as ISO by deep-start.ts — the format the abandoned sweep reads.
      confirmTokenExpiresAt: new Date("2026-07-01T00:00:00.000Z").toISOString(),
    },
    {
      id: reportId,
      leadId,
      domain,
      url: `https://${domain}/`,
      locale: "en",
      status: "confirming",
    },
  );
  await markLeadConfirmed(leadId, new Date().toISOString());
  return { leadId, reportId };
}

/** Backdates a report's settle timestamps, standing in for the passage of time. */
async function backdate(reportId: string, timestamp: string) {
  await raw.execute({
    sql: "UPDATE seo_reports SET finished_at = ?, updated_at = ? WHERE id = ?",
    args: [timestamp, timestamp, reportId],
  });
}

describe("findExpiredLeadIds", () => {
  it("matches a finished report written by the real markReportDone", async () => {
    const { leadId, reportId } = await seedConfirmedLead();
    await markReportDone(reportId, `deep-reports/${reportId}.json`);

    // markReportDone stamps finished_at via current_timestamp. If the cutoff
    // format did not match that column, this comparison would silently invert.
    expect(await findExpiredLeadIds(PAST_CUTOFF, 10)).toEqual([]);
    expect(await findExpiredLeadIds(FUTURE_CUTOFF, 10)).toEqual([leadId]);
  });

  it("compares against the stored timestamp format, not an ISO cutoff", async () => {
    const { leadId, reportId } = await seedConfirmedLead();
    await markReportDone(reportId, `deep-reports/${reportId}.json`);
    await backdate(reportId, "2026-06-15 23:59:00");

    // Same UTC date as the cutoff, but 21 hours later in the day: still inside
    // the window, so it must be retained. Bytewise ' ' < 'T', so an ISO cutoff
    // ("2026-06-15T03:00:00.000Z") would read this row as older and delete it.
    expect(await findExpiredLeadIds("2026-06-15 03:00:00", 10)).toEqual([]);
    // One second past its settle time, it is genuinely expired.
    expect(await findExpiredLeadIds("2026-06-15 23:59:01", 10)).toEqual([
      leadId,
    ]);
  });

  it("expires a failed report too", async () => {
    const { leadId, reportId } = await seedConfirmedLead();
    await markReportFailed(reportId, "The deep check could not be completed.");

    expect(await findExpiredLeadIds(FUTURE_CUTOFF, 10)).toEqual([leadId]);
  });

  it.each(["confirming", "queued", "running"] as const)(
    "never sweeps a lead whose report is still %s, however old",
    async (status) => {
      const { reportId } = await seedConfirmedLead();
      await raw.execute({
        sql: "UPDATE seo_reports SET status = ?, updated_at = ? WHERE id = ?",
        args: [status, "2020-01-01 00:00:00", reportId],
      });

      expect(await findExpiredLeadIds(FUTURE_CUTOFF, 10)).toEqual([]);
    },
  );

  it("sweeps a report deduped onto a canonical, which never finishes on its own", async () => {
    // The attach path leaves the loser `queued` with a NULL finished_at for
    // good. Keyed off finished_at alone its lead would be blocked forever — a
    // confirmed user's email kept for life, on the ordinary same-domain path.
    const canonical = await seedConfirmedLead({ domain: "shared.test" });
    const loser = await seedConfirmedLead({ domain: "shared.test" });
    await markReportDone(
      canonical.reportId,
      `deep-reports/${canonical.reportId}.json`,
    );
    // attachReportToCanonical only acts on a `queued` row, which is the state
    // deep-confirm's CAS leaves behind before dispatch runs. Going through that
    // CAS is what makes this fixture the real dedupe state and not a fiction.
    expect(await tryQueueConfirmingReport(loser.reportId)).toBe(true);
    await attachReportToCanonical(loser.reportId, canonical.reportId);

    const row = await raw.execute({
      sql: "SELECT status, finished_at FROM seo_reports WHERE id = ?",
      args: [loser.reportId],
    });
    expect(row.rows[0]).toMatchObject({ status: "queued", finished_at: null });

    expect(await findExpiredLeadIds(FUTURE_CUTOFF, 10)).toEqual(
      expect.arrayContaining([canonical.leadId, loser.leadId]),
    );
    // Its attach time is the clock: still recent means still retained.
    expect(await findExpiredLeadIds(PAST_CUTOFF, 10)).toEqual([]);
  });

  it("retains a lead when any one of its reports is still live", async () => {
    const { leadId, reportId } = await seedConfirmedLead();
    await markReportDone(reportId, `deep-reports/${reportId}.json`);
    await backdate(reportId, "2020-01-01 00:00:00");
    // A second, still-running report on the same lead vetoes the whole lead.
    await db.insert(schema.seoReports).values({
      id: "report-live",
      leadId,
      domain: "d.test",
      url: "https://d.test/",
      locale: "en",
      status: "running",
    });

    expect(await findExpiredLeadIds(FUTURE_CUTOFF, 10)).toEqual([]);
  });

  it("retains a terminal report with no finished_at rather than guessing", async () => {
    const { reportId } = await seedConfirmedLead();
    await raw.execute({
      sql: "UPDATE seo_reports SET status = 'done', finished_at = NULL WHERE id = ?",
      args: [reportId],
    });

    expect(await findExpiredLeadIds(FUTURE_CUTOFF, 10)).toEqual([]);
  });

  it("ignores a lead that has no reports at all", async () => {
    await db.insert(schema.leads).values({
      id: "orphan",
      email: "o@example.test",
      emailNormalized: "o@example.test",
      url: "https://o.test/",
      domain: "o.test",
      locale: "en",
      source: "free-seo-check",
      confirmToken: "orphan-token",
      confirmTokenExpiresAt: "2026-07-01T00:00:00.000Z",
      consentConfirmedAt: "2026-07-01T00:00:00.000Z",
    });

    expect(await findExpiredLeadIds(FUTURE_CUTOFF, 10)).toEqual([]);
  });

  it("honours the limit", async () => {
    for (let i = 0; i < 3; i++) {
      const { reportId } = await seedConfirmedLead();
      await markReportDone(reportId, `deep-reports/${reportId}.json`);
    }

    expect(await findExpiredLeadIds(FUTURE_CUTOFF, 2)).toHaveLength(2);
  });
});

describe("findAbandonedLeadIds", () => {
  it("matches an unconfirmed lead whose ISO token expiry is past the cutoff", async () => {
    const { leadId } = ids();
    await createLeadWithReport(
      {
        id: leadId,
        email: "ghost@example.test",
        emailNormalized: "ghost@example.test",
        url: "https://g.test/",
        domain: "g.test",
        locale: "en",
        source: "free-seo-check",
        confirmToken: "ghost-token",
        confirmTokenExpiresAt: "2026-07-01T00:00:00.000Z",
      },
      {
        id: `r-${leadId}`,
        leadId,
        domain: "g.test",
        url: "https://g.test/",
        locale: "en",
        status: "confirming",
      },
    );

    expect(await findAbandonedLeadIds("2026-07-08T00:00:00.000Z", 10)).toEqual([
      leadId,
    ]);
    // A week earlier the grace has not elapsed yet.
    expect(await findAbandonedLeadIds("2026-06-30T00:00:00.000Z", 10)).toEqual(
      [],
    );
  });

  it("never touches a lead that confirmed", async () => {
    await seedConfirmedLead();
    expect(await findAbandonedLeadIds("2099-01-01T00:00:00.000Z", 10)).toEqual(
      [],
    );
  });
});

describe("findReportKeysForLeads / deleteLeadsByIds", () => {
  it("collects payload keys and skips reports that never stored one", async () => {
    const withKey = await seedConfirmedLead();
    await markReportDone(
      withKey.reportId,
      `deep-reports/${withKey.reportId}.json`,
    );
    const withoutKey = await seedConfirmedLead();

    const keys = await findReportKeysForLeads([
      withKey.leadId,
      withoutKey.leadId,
    ]);
    // Only the report that stored a payload contributes a key; the other's
    // `r2_key` is null.
    expect(keys).toEqual([`deep-reports/${withKey.reportId}.json`]);
  });

  it("returns nothing for an empty id list without hitting the database", async () => {
    expect(await findReportKeysForLeads([])).toEqual([]);
    expect(await deleteLeadsByIds([])).toBe(0);
  });

  it("cascades reports away with their lead", async () => {
    const { leadId, reportId } = await seedConfirmedLead();
    await markReportDone(reportId, `deep-reports/${reportId}.json`);

    expect(await deleteLeadsByIds([leadId])).toBe(1);

    const reports = await raw.execute("SELECT id FROM seo_reports");
    expect(reports.rows).toHaveLength(0);
  });

  it("chunks past D1's bound-parameter limit", async () => {
    // D1 rejects >100 bound parameters. Unchunked, a busy day would throw here
    // and the sweep would abort before deleting anything — forever.
    const leadIds: string[] = [];
    for (let i = 0; i < 120; i++) {
      const { leadId, reportId } = await seedConfirmedLead();
      await markReportDone(reportId, `deep-reports/${reportId}.json`);
      leadIds.push(leadId);
    }

    expect(await findReportKeysForLeads(leadIds)).toHaveLength(120);
    expect(await deleteLeadsByIds(leadIds)).toBe(120);

    const left = await raw.execute("SELECT COUNT(*) AS c FROM leads");
    expect(left.rows[0]?.c).toBe(0);
  });
});
