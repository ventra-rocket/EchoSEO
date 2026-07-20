/**
 * Full-flow integration test for the email-gated Deep check.
 *
 * Unlike the per-seam unit tests, this drives the real request handlers and
 * repositories against a real (in-memory) D1, so it proves the STATE MACHINE
 * connects end to end: start → confirming lead+report → confirm → queued →
 * dispatch → workflow → done → a renderable report. Only the true external
 * boundaries are mocked — Turnstile, PSI, the crawl fetch, Resend, the DO-backed
 * rate-limit and quota, and the Workflow binding. The `(domain,day)` dedupe is a
 * plain-D1 repository, so it runs for real against the test database here — the
 * only end-to-end exercise of its `onConflictDoNothing().returning()` insert.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeGoodPage } from "@/server/lib/seo-rules/__tests__/on-page-signals-fixture";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "./__tests__/free-check-test-db";

const { testDb, r2Store, workflowCreate } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
  r2Store: new Map<string, string>(),
  workflowCreate:
    vi.fn<
      (arg: {
        id: string;
        params: { reportId: string; url: string };
      }) => Promise<unknown>
    >(),
}));

/** Reads a TEXT cell from a libsql row without tripping stringify lints. */
function text(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(`expected a text cell, got ${typeof value}`);
  }
  return value;
}

vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

// In-memory R2 standing in for the report-payload bucket.
vi.mock("cloudflare:workers", () => ({
  env: {
    RATE_LIMIT_DO: {},
    DEEP_SEO_CHECK_WORKFLOW: { create: workflowCreate },
    R2: {
      put: (key: string, value: string) => {
        r2Store.set(key, value);
        return Promise.resolve();
      },
      get: (key: string) => {
        const value = r2Store.get(key);
        return Promise.resolve(
          value == null
            ? null
            : { json: () => Promise.resolve(JSON.parse(value)) },
        );
      },
    },
  },
  waitUntil: (promise: Promise<unknown>) => promise,
  WorkflowEntrypoint: class {
    readonly isStub = true;
  },
}));
vi.mock("cloudflare:workflows", () => ({
  NonRetryableError: class extends Error {},
}));

vi.mock("./turnstile", () => ({
  verifyTurnstileToken: () => Promise.resolve({ success: true }),
}));
vi.mock("./rate-limit-do", () => ({
  checkIpRateLimit: () => Promise.resolve({ allowed: true }),
}));
vi.mock("@/server/lib/audit/url-policy", () => ({
  normalizeAndValidateStartUrl: (u: string) => Promise.resolve(u),
}));
vi.mock("@/server/lib/runtime-env", () => ({
  getRequiredEnvValue: () => Promise.resolve("test-key"),
  getOptionalEnvValue: () => Promise.resolve(undefined),
}));
vi.mock("./deep-check-config", () => ({
  isDeepCheckDisabled: () => Promise.resolve(false),
}));
vi.mock("./deep-check-quota", () => ({
  checkDeepCheckQuotas: () => Promise.resolve({ allowed: true }),
}));
vi.mock("./email/sender", () => ({
  getEmailSender: () => Promise.resolve({}),
}));
vi.mock("./email/deep-check-confirmation", () => ({
  sendDeepCheckConfirmation: () => Promise.resolve(),
}));
vi.mock("./report-ready-email", () => ({
  sendReportReadyEmail: () => Promise.resolve(),
}));
vi.mock("@/server/lib/psi/pagespeed", () => ({
  fetchPageSpeed: () => Promise.resolve({}),
  shapePsiResult: () => ({
    coreWebVitals: null,
    cwvSource: null,
    scores: { performance: 90, seo: 100, accessibility: 80, bestPractices: 95 },
  }),
  PsiRequestError: class extends Error {},
}));
vi.mock("./crawl", () => ({
  crawlSite: (url: string) =>
    Promise.resolve({
      pages: [{ url, statusCode: 200, page: makeGoodPage({ url }) }],
    }),
}));
// GEO makes its own side fetches (robots.txt, llms.txt); stub it so the flow
// test stays hermetic. Its own extraction is covered in geo-signals.test.ts.
vi.mock("./geo-signals", () => ({
  extractGeoSignals: () =>
    Promise.resolve({
      botAccess: { googlebot: true, googleExtended: true, gptbot: true },
      schemaTypes: ["Article"],
      hasSingleH1: true,
      hasHeadingHierarchy: true,
      robotsMeta: null,
      llmsTxtFound: false,
    }),
}));

const { handleStartDeepCheckRequest } = await import("./deep-start");
const { handleConfirmDeepCheckRequest } = await import("./deep-confirm");
const { runDeepSeoCheck } =
  await import("@/server/workflows/deep-seo-check-workflow");
const { loadReportView } = await import("./report-view");

let raw: FreeCheckTestDb["raw"];
let logSpy: ReturnType<typeof vi.spyOn>;

/** How many `[metric] event=<event>` lines the spy captured. */
function metricCount(event: string): number {
  return logSpy.mock.calls.filter(
    (call) => typeof call[0] === "string" && call[0].includes(`event=${event}`),
  ).length;
}

function makeStep() {
  return {
    do: <T>(_name: string, callback: () => Promise<T> | T) =>
      Promise.resolve(callback()),
  };
}

function startRequest(body: unknown): Request {
  return new Request("https://echoseo.test/api/free-seo-check/deep", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "cf-connecting-ip": "1.2.3.4",
    },
    body: JSON.stringify(body),
  });
}

function confirmRequest(token: string): Request {
  return new Request("https://echoseo.test/api/free-seo-check/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "cf-connecting-ip": "1.2.3.4",
    },
    body: JSON.stringify({ token }),
  });
}

beforeEach(async () => {
  const db = await createFreeCheckTestDb();
  testDb.current = db.db;
  raw = db.raw;
  r2Store.clear();
  workflowCreate.mockReset();
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Deep check full flow", () => {
  it("carries a report from start through confirm, workflow, and a done view", async () => {
    // 1. Start: a confirmation is queued, the lead is unconfirmed, the report
    //    is `confirming`, and nothing is dispatched yet.
    const startRes = await handleStartDeepCheckRequest(
      startRequest({
        url: "https://kello.test/",
        email: "founder@company.com",
        consent: true,
        turnstileToken: "tok",
        locale: "en",
      }),
    );
    expect(startRes.status).toBe(202);
    expect(workflowCreate).not.toHaveBeenCalled();

    const lead = (
      await raw.execute(
        "SELECT id, confirm_token, consent_confirmed_at FROM leads",
      )
    ).rows[0];
    expect(lead.consent_confirmed_at).toBeNull();
    const reportBefore = (
      await raw.execute("SELECT id, status FROM seo_reports")
    ).rows[0];
    expect(reportBefore.status).toBe("confirming");

    // 2. Confirm with the emailed token: consent recorded, report queued, and
    //    the workflow enqueued with the report's id and url.
    const confirmRes = await handleConfirmDeepCheckRequest(
      confirmRequest(text(lead.confirm_token)),
    );
    expect(confirmRes.status).toBe(200);
    expect(workflowCreate).toHaveBeenCalledTimes(1);

    const enqueued = workflowCreate.mock.calls[0][0];
    expect(enqueued.params.reportId).toBe(reportBefore.id);

    const leadAfter = (
      await raw.execute("SELECT consent_confirmed_at FROM leads")
    ).rows[0];
    expect(leadAfter.consent_confirmed_at).not.toBeNull();

    // 3. Run the workflow the confirm enqueued: the report reaches `done` with a
    //    payload in R2.
    await runDeepSeoCheck(makeStep(), enqueued.params);

    const reportDone = (
      await raw.execute("SELECT status, r2_key FROM seo_reports")
    ).rows[0];
    expect(reportDone.status).toBe("done");
    expect(r2Store.has(text(reportDone.r2_key))).toBe(true);

    // 4. Read it back the way the /r/{id} page does: a renderable done report
    //    carrying the GEO section the workflow attached.
    const view = await loadReportView(text(reportBefore.id));
    expect(view?.status).toBe("done");
    if (view?.status === "done") expect(view.report.geo).not.toBeNull();
  });

  it("recovers a confirm replay without enqueuing a second workflow", async () => {
    await handleStartDeepCheckRequest(
      startRequest({
        url: "https://kello.test/",
        email: "founder@company.com",
        consent: true,
        turnstileToken: "tok",
        locale: "en",
      }),
    );
    const token = text(
      (await raw.execute("SELECT confirm_token FROM leads")).rows[0]
        .confirm_token,
    );

    const first = await handleConfirmDeepCheckRequest(confirmRequest(token));
    const second = await handleConfirmDeepCheckRequest(confirmRequest(token));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // The queue CAS is a no-op the second time — no duplicate audit.
    expect(workflowCreate).toHaveBeenCalledTimes(1);
    // ...and the conversion is counted exactly once, not per confirm click.
    expect(metricCount("deep_confirm")).toBe(1);
  });
});
