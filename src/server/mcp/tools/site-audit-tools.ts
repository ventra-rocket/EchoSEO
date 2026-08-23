/* eslint-disable max-lines */
/**
 * Agent surface for the Site Audit crawler.
 *
 * `run_site_audit` is the one privileged action in the EchoSEO MCP server: it
 * spends operator compute and reaches out to a third-party site, so it is gated
 * with exactly the checks `serverFunctions/audit.ts` applies to the same launch
 * — managed access in hosted mode, then the workspace role, target ceiling,
 * verified-domain, capacity and throttle gates inside `AuditService.startAudit`.
 *
 * The other three tools are reads, and the verified-domain gate reaches them
 * transitively rather than being re-checked: a crawl only exists because the
 * gate admitted it, so there is no audit to read that the gate did not already
 * allow — and none of them can launch or resize one. What they DO enforce
 * independently is tenancy: every one resolves the caller's organization,
 * proves it owns `projectId`, and then hands the audit id to a service that
 * re-checks the audit belongs to that same project.
 *
 * Every policy refusal comes back as tool text with `ok: false`, not a thrown
 * error. Only the code survives a thrown `AppError`, and "AUDIT_VERIFICATION_
 * REQUIRED" tells an agent nothing it can act on; the refusal text names the
 * page threshold and both ways past it.
 */
import { z } from "zod";
import type { AuthMode } from "@/lib/auth-mode";
import {
  AuditService,
  type AuditStatus,
  type StartedAudit,
} from "@/server/features/audit/services/AuditService";
import {
  AuditIssueService,
  type AuditIssueFinding,
  type AuditIssueOccurrence,
} from "@/server/features/audit/services/AuditIssueService";
import { listAuditPages } from "@/server/features/audit/services/audit-page-listing";
import type { AuditPageFacts } from "@/server/features/audit/repositories/audit-page-queries";
import { AUDIT_ISSUE_GROUPS } from "@/server/features/audit/issues/audit-issue-groups";
import { getVerificationPageThreshold } from "@/server/features/audit/authz/target-verification";
import { orgMayUseManagedFeatures } from "@/server/billing/subscription";
import { asAppError, AppError } from "@/server/lib/errors";
import { getServerAuthMode } from "@/server/lib/runtime-env";
import { SEVERITIES, type Locale } from "@/server/lib/seo-rules";
import { AUDIT_MAX_PAGES, AUDIT_MIN_PAGES } from "@/shared/audit-limits";
import { buildProjectMeta } from "@/server/mcp/context";
import { mcpResponse } from "@/server/mcp/formatters";
import {
  looseObjectOutputSchema,
  optionalMetaOutputSchema,
} from "@/server/mcp/output-schemas";
import {
  withMcpProjectAuth,
  type McpProjectAuthContext,
} from "@/server/mcp/project-auth";
import { projectIdSchema } from "@/server/mcp/schemas";
import { formatMcpTable, type McpTableColumn } from "@/server/mcp/table";

const auditIdSchema = z
  .string()
  .min(1)
  .optional()
  .describe(
    "Audit ID. Omit to use this project's most recent audit. An audit that belongs to another project is rejected, not silently substituted.",
  );

const localeSchema = z
  .enum(["en", "vi"])
  .optional()
  .describe(
    "Language for the remediation text attached to each finding. Defaults to English.",
  );

/**
 * Worst first, keyed off the rule catalogue's own severity vocabulary so this
 * is not a fourth copy of the literal order. An unrecognised severity sorts
 * last and still appears.
 */
const SEVERITY_RANK: Record<string, number> = Object.fromEntries(
  SEVERITIES.map((severity, index): [string, number] => [severity, index]),
);

function auditMeta(
  context: McpProjectAuthContext,
  projectId: string,
  auditId?: string,
  tab?: "pages" | "issues",
) {
  return buildProjectMeta(context, projectId, `/p/${projectId}/audit`, {
    auditId,
    tab,
  });
}

/**
 * The audit an argument-free call means.
 *
 * Deliberately the *latest* audit, not the latest completed one: answering a
 * question about an older crawl because the newest is still running would be a
 * silent substitution, and every tool here can say "still running" honestly.
 */
async function resolveAuditId(
  projectId: string,
  auditId: string | undefined,
): Promise<string> {
  if (auditId) return auditId;
  const { latest } = await AuditService.getCommandCenterAudits(projectId);
  if (!latest) {
    throw new AppError(
      "NOT_FOUND",
      "No audits exist for this project yet. Start one with run_site_audit.",
    );
  }
  return latest.id;
}

// ─── run_site_audit ─────────────────────────────────────────────────────────

const runInputSchema = {
  projectId: projectIdSchema,
  url: z
    .string()
    .min(1)
    .max(2048)
    .describe(
      "Start URL to crawl. The crawl stays on this URL's origin and honours robots.txt.",
    ),
  maxPages: z
    .number()
    .int()
    .min(AUDIT_MIN_PAGES)
    .max(AUDIT_MAX_PAGES)
    .optional()
    .describe(
      `Page budget for the crawl. Defaults to the measured ceiling of ${AUDIT_MAX_PAGES} pages, which for almost every real site means "crawl all of it" — sites smaller than the budget finish when the crawl frontier empties. On the hosted deployment a crawl above ${getVerificationPageThreshold("hosted")} pages requires a Search Console property that proves you own the domain; without one, pass a smaller budget or connect the property first.`,
    ),
  runLighthouse: z
    .boolean()
    .optional()
    .describe(
      "Run Lighthouse/Core Web Vitals on a sample of pages (default false — it adds minutes of wall-clock time to a crawl that otherwise finishes in one, and it is a metered DataForSEO call on your own key). Pass true only when the user asked for performance or Core Web Vitals detail.",
    ),
} as const;

type RunArgs = z.infer<z.ZodObject<typeof runInputSchema>>;

const runOutputSchema = z
  .object({
    ok: z.boolean(),
    auditId: z.string().optional(),
    /** Machine-readable refusal reason; absent on success. */
    reason: z.string().optional(),
    /** The crawl that is actually running, after clamping. */
    maxPages: z.number().optional(),
    ranLighthouse: z.boolean().optional(),
    ...optionalMetaOutputSchema,
  })
  .passthrough();

/**
 * Turn a launch refusal into text an agent can act on.
 *
 * Returns null for anything that is not a policy state, so genuine faults keep
 * throwing and reach error reporting.
 */
function describeLaunchRefusal(
  error: unknown,
  authMode: AuthMode,
  maxPages: number | undefined,
): { reason: string; text: string } | null {
  const code = asAppError(error)?.code;
  const threshold = getVerificationPageThreshold(authMode);
  switch (code) {
    case "AUDIT_VERIFICATION_REQUIRED":
      return {
        reason: "verification_required",
        text: `Refused: a crawl of ${maxPages ?? AUDIT_MAX_PAGES} pages needs a verified domain on this deployment, and this project's Search Console connection does not prove ownership of that origin. Two ways forward, and the crawl was NOT silently shrunk to fit: either re-run with maxPages ${threshold ?? AUDIT_MAX_PAGES} or lower, or connect a Search Console property covering the domain in the project's settings and then run the full crawl.`,
      };
    case "AUDIT_CAPACITY_REACHED":
      return {
        reason: "capacity_reached",
        text: "Refused: this account's stored audit capacity is full. Delete older audits from the Site Audit page to free capacity, then start this crawl again.",
      };
    case "RATE_LIMITED":
      return {
        reason: "rate_limited",
        text: "Refused: too many audits were started for this organization in the last hour. Wait and start it again; nothing was queued.",
      };
    case "FORBIDDEN":
      return {
        reason: "forbidden",
        text: "Refused: your role in this workspace cannot start audits. Ask a workspace owner or admin to run it, or to raise your role.",
      };
    case "CRAWL_TARGET_BLOCKED":
      return {
        reason: "target_blocked",
        text: "Refused: that URL is not a crawlable public target (private, loopback, or a blocked host). Pass the site's public https:// URL.",
      };
    case "VALIDATION_ERROR":
      return {
        reason: "invalid_url",
        text: "Refused: that start URL could not be parsed as an http(s) address. Pass something like https://example.com.",
      };
    default:
      return null;
  }
}

export const runSiteAuditTool = {
  name: "run_site_audit",
  config: {
    title: "Run site audit",
    description: `Start a site audit. This is the only EchoSEO tool that spends real resources and reaches a third-party site, so treat it as an action, not a lookup: it crawls the origin (robots.txt-aware, same-origin, rate-controlled and backing off when the site pushes back) up to a measured ${AUDIT_MAX_PAGES}-page ceiling, stores per-page SEO facts, then runs the rule catalogue plus cross-page rules (orphan pages, broken internal links, sitemap gaps, unreachable URLs) over the sealed crawl. Runs in the background: call get_audit_status once (it waits server-side, so do not loop), then get_audit_issues for the prioritized findings with remediation steps. Lighthouse is off by default. Never call this twice for the same site in one session.`,
    inputSchema: runInputSchema,
    outputSchema: runOutputSchema,
    annotations: {
      readOnlyHint: false,
      openWorldHint: true,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(async (args: RunArgs, context) => {
    const authMode = await getServerAuthMode();
    const meta = auditMeta(context, args.projectId);

    // The same managed-access gate the server-function surface applies to this
    // launch. Without it the MCP route would be a way around the paywall the
    // dashboard enforces on the identical crawl.
    if (
      authMode === "hosted" &&
      !(await orgMayUseManagedFeatures(context.auth.organizationId))
    ) {
      return mcpResponse({
        text: "Refused: site audits need an active subscription on this hosted deployment. Ask the user to subscribe, then start the crawl again.",
        meta,
        structuredContent: { ok: false, reason: "payment_required" },
      });
    }

    // Off unless asked for. Lighthouse turns a one-minute crawl into a
    // many-minute one and is a metered provider call on the customer's own key;
    // the launch form passes its own explicit strategy, so this default only
    // ever governs agents.
    const lighthouseStrategy = args.runLighthouse === true ? "auto" : "none";

    let launched: StartedAudit;
    try {
      launched = await AuditService.startAudit({
        actorUserId: context.auth.userId,
        authMode,
        billingCustomer: context.billing,
        projectId: args.projectId,
        startUrl: args.url,
        maxPages: args.maxPages,
        lighthouseStrategy,
      });
    } catch (error) {
      const refusal = describeLaunchRefusal(error, authMode, args.maxPages);
      if (!refusal) throw error;
      return mcpResponse({
        text: refusal.text,
        meta,
        structuredContent: { ok: false, reason: refusal.reason },
      });
    }

    const ranLighthouse = launched.lighthouseStrategy !== "none";
    // Report the crawl that is running, not the one that was asked for: the
    // budget is clamped by the crawler ceiling and any lower per-target limit,
    // and Lighthouse is forced off when no DataForSEO key is available.
    const clamped =
      args.maxPages !== undefined && launched.maxPages !== args.maxPages
        ? ` (requested ${args.maxPages}, clamped by this target's limit)`
        : "";
    const lighthouseNote =
      args.runLighthouse === true && !ranLighthouse
        ? " Lighthouse was requested but is unavailable: no DataForSEO key is configured for this organization, so the crawl runs without Core Web Vitals data."
        : "";

    return mcpResponse({
      text: `Audit ${launched.auditId} started for ${args.url}: up to ${launched.maxPages} pages${clamped}, Lighthouse ${ranLighthouse ? "on" : "off"}.${lighthouseNote} Call get_audit_status next — it waits server-side while the crawl runs, so call it once rather than in a loop. A crawl of a few hundred pages takes minutes; a full ${AUDIT_MAX_PAGES}-page crawl can take over an hour.`,
      meta: auditMeta(context, args.projectId, launched.auditId),
      structuredContent: {
        ok: true,
        auditId: launched.auditId,
        maxPages: launched.maxPages,
        ranLighthouse,
      },
    });
  }),
};

// ─── get_audit_status ───────────────────────────────────────────────────────

const DEFAULT_WAIT_SECONDS = 25;
const MAX_WAIT_SECONDS = 60;
const STATUS_POLL_INTERVAL_MS = 3_000;

const statusInputSchema = {
  projectId: projectIdSchema,
  auditId: auditIdSchema,
  waitSeconds: z
    .number()
    .int()
    .min(0)
    .max(MAX_WAIT_SECONDS)
    .optional()
    .describe(
      `How long to wait server-side for a running crawl to finish before answering, in seconds (default ${DEFAULT_WAIT_SECONDS}, max ${MAX_WAIT_SECONDS}). Pass 0 for an immediate snapshot.`,
    ),
} as const;

type StatusArgs = z.infer<z.ZodObject<typeof statusInputSchema>>;

/**
 * Real wall-clock spacing between status reads. The project's `lib` target is
 * ES2023, so `Promise.withResolvers` is unavailable — this is the same executor
 * form every other delay in the codebase uses.
 */
function realWaitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** What one server-side wait observed. */
interface SettledAuditWait {
  status: AuditStatus;
  waitedSeconds: number;
  waitedMs: number;
  /** Pages that landed while this call was waiting; 0 when nothing moved. */
  pagesDuringWait: number;
}

/**
 * Wait for the crawl to settle, in one call.
 *
 * A chat model cannot sleep, so an instant status tool gets spin-polled and
 * every call plus its result lands in the session transcript. Waiting here
 * turns that into one call. Unlike upstream, this returns on a TERMINAL state
 * rather than on any change to the progress line: our crawls reach 5,000 pages,
 * where `pagesCrawled` ticks every second or two and "return as soon as
 * progress changed" would answer instantly every time and buy nothing.
 *
 * Each iteration issues its own read, so nothing is held open across the sleep.
 */
async function waitForAuditToSettle(
  auditId: string,
  projectId: string,
  waitSeconds: number,
  signal: AbortSignal,
): Promise<SettledAuditWait> {
  let status = await AuditService.getStatus(auditId, projectId);
  const startedWaiting = Date.now();
  const pagesAtStart = status.pagesCrawled;
  const deadline = startedWaiting + waitSeconds * 1_000;

  while (status.status === "running" && !signal.aborted) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await realWaitMs(Math.min(STATUS_POLL_INTERVAL_MS, remaining));
    if (signal.aborted) break;
    status = await AuditService.getStatus(auditId, projectId);
  }

  const waitedMs = Date.now() - startedWaiting;
  return {
    status,
    waitedSeconds: Math.round(waitedMs / 1_000),
    pagesDuringWait: status.pagesCrawled - pagesAtStart,
    waitedMs,
  };
}

/**
 * An ETA measured inside this call, or null.
 *
 * Derived from pages that landed while we waited rather than from the audit's
 * start timestamp: a crawl slows down as the frontier drains and speeds up
 * after a backoff, so the recent rate is the honest one — and a crawl that
 * moved zero pages gets no estimate at all instead of a fabricated one.
 */
function estimateRemainingMinutes(input: {
  pagesDuringWait: number;
  waitedMs: number;
  pagesCrawled: number;
  pagesTotal: number;
}): number | null {
  if (input.pagesDuringWait <= 0 || input.waitedMs <= 0) return null;
  const pagesLeft = input.pagesTotal - input.pagesCrawled;
  if (pagesLeft <= 0) return null;
  const pagesPerMs = input.pagesDuringWait / input.waitedMs;
  return Math.max(1, Math.round(pagesLeft / pagesPerMs / 60_000));
}

export const getAuditStatusTool = {
  name: "get_audit_status",
  config: {
    title: "Get site audit status",
    description:
      "Check a site audit's progress (phase, pages crawled, Lighthouse progress, crawl queue depth). Reads stored EchoSEO state and charges nothing. While the crawl is running this call WAITS server-side — up to a minute — and answers as soon as the crawl finishes, so call it once and never in a tight loop. If it comes back still running, tell the user how far along it is and either call it once more or let them come back for the results. Omit auditId for the most recent audit.",
    inputSchema: statusInputSchema,
    outputSchema: z
      .object({
        status: looseObjectOutputSchema,
        /** Live crawl detail; null once the run has finished and KV is cleared. */
        crawl: looseObjectOutputSchema.nullable(),
        waitedSeconds: z.number(),
        ...optionalMetaOutputSchema,
      })
      .passthrough(),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(async (args: StatusArgs, context) => {
    const auditId = await resolveAuditId(args.projectId, args.auditId);
    const settled = await waitForAuditToSettle(
      auditId,
      args.projectId,
      args.waitSeconds ?? DEFAULT_WAIT_SECONDS,
      context.signal,
    );
    const { status } = settled;

    // One KV read after the wait, not per iteration. The frontier depth is what
    // separates "slow" from "stalled" for a caller deciding whether to wait
    // again; the crawled-URL feed it sits beside is the results view's job.
    const { phase } =
      status.status === "running"
        ? await AuditService.getCrawlProgress(auditId, args.projectId)
        : { phase: null };

    const lighthouseNote =
      status.lighthouseTotal > 0
        ? `, Lighthouse ${status.lighthouseCompleted + status.lighthouseFailed}/${status.lighthouseTotal}`
        : "";
    const queueNote =
      phase?.queued === undefined
        ? ""
        : ` Crawl queue: ${phase.queued} URLs waiting, ${phase.visited ?? status.pagesCrawled} fetched.`;
    const eta = estimateRemainingMinutes({
      pagesDuringWait: settled.pagesDuringWait,
      waitedMs: settled.waitedMs,
      pagesCrawled: status.pagesCrawled,
      pagesTotal: status.pagesTotal,
    });

    const nextStep =
      status.status === "completed"
        ? " Call get_audit_issues for the prioritized findings."
        : status.status === "failed"
          ? ` The crawl stopped early${status.errorMessage ? ` (${status.errorMessage})` : ""}. It kept the ${status.pagesCrawled} pages it did fetch, but issues are only materialized for a sealed crawl — read get_audit_pages for that evidence, and re-run the audit for a findings report.`
          : ` Still running after waiting ${settled.waitedSeconds}s.${eta === null ? " No pages landed during the wait, so there is no honest estimate yet." : ` At the rate measured during this wait, roughly ${eta} minute(s) of crawling remain.`} Report progress to the user before calling this again.`;

    return mcpResponse({
      text: `Audit ${status.id} (${status.startUrl}): ${status.status} — phase ${status.currentPhase ?? "unknown"}, ${status.pagesCrawled}/${status.pagesTotal} pages${lighthouseNote}.${queueNote}${nextStep}`,
      meta: auditMeta(context, args.projectId, status.id),
      structuredContent: {
        status,
        crawl: phase,
        waitedSeconds: settled.waitedSeconds,
      },
    });
  }),
};

// ─── get_audit_issues ───────────────────────────────────────────────────────

const issuesInputSchema = {
  projectId: projectIdSchema,
  auditId: auditIdSchema,
  severity: z
    .enum(SEVERITIES)
    .optional()
    .describe("Only return affected URLs for findings of this severity."),
  issueGroup: z
    .enum(AUDIT_ISSUE_GROUPS)
    .optional()
    .describe("Only return affected URLs from this group of findings."),
  ruleId: z
    .string()
    .min(1)
    .max(128)
    .optional()
    .describe(
      "Only return affected URLs for this rule, e.g. 'meta-title' or 'audit-broken-internal-link'. Take the value from a summary row.",
    ),
  urlContains: z
    .string()
    .min(1)
    .max(2048)
    .optional()
    .describe("Only return affected URLs containing this substring."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Max affected URLs to return (default 50, max 100)."),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Affected-URL offset, for paging past the first page."),
  locale: localeSchema,
} as const;

type IssuesArgs = z.infer<z.ZodObject<typeof issuesInputSchema>>;

const ISSUE_SUMMARY_COLUMNS: McpTableColumn<AuditIssueFinding>[] = [
  { header: "severity", value: (row) => row.severity },
  { header: "rule", value: (row) => row.ruleId },
  { header: "group", value: (row) => row.issueGroup },
  { header: "URLs", value: (row) => row.urlCount },
  { header: "finding", value: (row) => row.fix?.label ?? row.ruleId },
];

const OCCURRENCE_COLUMNS: McpTableColumn<AuditIssueOccurrence>[] = [
  { header: "severity", value: (row) => row.severity },
  { header: "rule", value: (row) => row.ruleId },
  { header: "url", value: (row) => row.url },
  {
    header: "evidence",
    value: (row) =>
      row.evidence.map((field) => `${field.key}=${field.value}`).join("; "),
  },
];

export const getAuditIssuesTool = {
  name: "get_audit_issues",
  config: {
    title: "Get site audit issues",
    description:
      "Read a completed audit's prioritized findings. Returns one row per rule — severity, group, how many URLs it affects, and the remediation steps with the Google documentation the rule cites — plus a page of the affected URLs with the exact evidence measured on each. Filter by ruleId, issueGroup, severity or urlContains to pull the evidence for one finding. Reads stored EchoSEO state and charges nothing. Omit auditId for the most recent audit.",
    inputSchema: issuesInputSchema,
    outputSchema: z
      .object({
        /**
         * When the findings were computed. Null means the question was never
         * answered, which is NOT the same as a clean site.
         */
        materializedAt: z.string().nullable(),
        findings: z.array(looseObjectOutputSchema),
        affectedUrls: z.array(looseObjectOutputSchema),
        totalAffectedUrls: z.number(),
        ...optionalMetaOutputSchema,
      })
      .passthrough(),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(async (args: IssuesArgs, context) => {
    const auditId = await resolveAuditId(args.projectId, args.auditId);
    const locale: Locale = args.locale ?? "en";
    const [summary, occurrences] = await Promise.all([
      AuditIssueService.getIssueSummary(auditId, args.projectId, locale),
      AuditIssueService.listIssueOccurrences({
        auditId,
        projectId: args.projectId,
        severity: args.severity,
        issueGroup: args.issueGroup,
        ruleId: args.ruleId,
        urlContains: args.urlContains,
        limit: args.limit,
        offset: args.offset,
      }),
    ]);

    const meta = auditMeta(context, args.projectId, auditId, "issues");

    // The distinction the stored timestamp exists for. An empty finding list is
    // ambiguous on its own, and reading it as "clean site" would give a healthy
    // verdict to an audit whose analysis never ran.
    if (summary.materializedAt === null) {
      return mcpResponse({
        text: `Audit ${auditId} has no findings computed yet. Findings are materialized once the crawl completes and its snapshot is sealed, so this is either a crawl still in progress (check get_audit_status) or one that failed before analysis. This is NOT a clean bill of health — do not report the site as having no issues.`,
        meta,
        structuredContent: {
          materializedAt: null,
          findings: [],
          affectedUrls: [],
          totalAffectedUrls: 0,
        },
      });
    }

    const findings = summary.rollups.toSorted(
      (a, b) =>
        (SEVERITY_RANK[a.severity] ?? SEVERITIES.length) -
          (SEVERITY_RANK[b.severity] ?? SEVERITIES.length) ||
        b.urlCount - a.urlCount,
    );

    const filtered = Boolean(
      args.severity || args.issueGroup || args.ruleId || args.urlContains,
    );
    const text =
      findings.length === 0
        ? `Audit ${auditId}: analysis ran at ${summary.materializedAt} and found no issues. The crawled pages passed every rule in the catalogue.`
        : [
            `Audit ${auditId}: ${findings.length} distinct findings, analysed at ${summary.materializedAt}.`,
            "",
            "Findings (worst first):",
            formatMcpTable(findings, ISSUE_SUMMARY_COLUMNS),
            "",
            `Affected URLs${filtered ? " matching your filters" : ""}: ${occurrences.total} total, showing ${occurrences.occurrences.length} from offset ${occurrences.offset}.`,
            occurrences.occurrences.length === 0
              ? "(none matched)"
              : formatMcpTable(occurrences.occurrences, OCCURRENCE_COLUMNS),
            "",
            "Remediation steps and the Google documentation each rule cites are on every finding in structuredContent.findings[].fix.",
          ].join("\n");

    return mcpResponse({
      text,
      meta,
      structuredContent: {
        materializedAt: summary.materializedAt,
        findings,
        affectedUrls: occurrences.occurrences,
        totalAffectedUrls: occurrences.total,
      },
    });
  }),
};

// ─── get_audit_pages ────────────────────────────────────────────────────────

const pagesInputSchema = {
  projectId: projectIdSchema,
  auditId: auditIdSchema,
  statusCode: z
    .number()
    .int()
    .optional()
    .describe("Only return pages whose response had this exact HTTP status."),
  indexable: z
    .boolean()
    .optional()
    .describe(
      "Filter on indexability: false lists the pages Google is told not to index (noindex, non-canonical, or a non-200 response).",
    ),
  inSitemap: z
    .boolean()
    .optional()
    .describe(
      "Filter on XML sitemap membership: false lists crawled pages no sitemap advertises.",
    ),
  isHtml: z
    .boolean()
    .optional()
    .describe(
      "Filter on whether the response really was an HTML document. false lists PDFs, images and failed fetches, whose empty title/word-count fields are placeholders rather than findings.",
    ),
  urlContains: z
    .string()
    .min(1)
    .max(2048)
    .optional()
    .describe("Only return pages whose URL contains this substring."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Max pages to return (default 50, max 100)."),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Page offset, for reading past the first batch."),
} as const;

type PagesArgs = z.infer<z.ZodObject<typeof pagesInputSchema>>;

const PAGE_COLUMNS: McpTableColumn<AuditPageFacts>[] = [
  { header: "status", value: (row) => row.statusCode },
  { header: "url", value: (row) => row.url },
  { header: "title", value: (row) => row.title },
  { header: "words", value: (row) => row.wordCount },
  { header: "h1", value: (row) => row.h1Count },
  { header: "indexable", value: (row) => row.isIndexable },
  { header: "in sitemap", value: (row) => row.inSitemap },
  { header: "internal links", value: (row) => row.internalLinkCount },
  { header: "ms", value: (row) => row.responseTimeMs },
];

export const getAuditPagesTool = {
  name: "get_audit_pages",
  config: {
    title: "Get site audit pages",
    description:
      "List the pages a site audit crawled, with the per-page facts the rules were judged from: HTTP status, redirect target, title, meta description, canonical, robots directives, word and heading counts, image alt coverage, internal and external link counts, structured-data presence, mixed content, sitemap membership and response time. Filter by statusCode, indexable, inSitemap, isHtml or urlContains to answer a specific question instead of reading the whole crawl. Reads stored EchoSEO state and charges nothing. Omit auditId for the most recent audit.",
    inputSchema: pagesInputSchema,
    outputSchema: z
      .object({
        pages: z.array(looseObjectOutputSchema),
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
        ...optionalMetaOutputSchema,
      })
      .passthrough(),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(async (args: PagesArgs, context) => {
    const auditId = await resolveAuditId(args.projectId, args.auditId);
    const result = await listAuditPages({
      auditId,
      projectId: args.projectId,
      statusCode: args.statusCode,
      indexable: args.indexable,
      inSitemap: args.inSitemap,
      isHtml: args.isHtml,
      urlContains: args.urlContains,
      limit: args.limit,
      offset: args.offset,
    });

    const text = [
      `Audit ${result.audit.id} (${result.audit.startUrl}, ${result.audit.status}): ${result.total} pages match, showing ${result.pages.length} from offset ${result.offset}.`,
      result.pages.length === 0
        ? "(none matched)"
        : formatMcpTable(result.pages, PAGE_COLUMNS),
    ].join("\n");

    return mcpResponse({
      text,
      meta: auditMeta(context, args.projectId, auditId, "pages"),
      structuredContent: {
        pages: result.pages,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  }),
};
