/**
 * Running and reading the page-against-page competitor comparison.
 *
 * Both sides are judged by `evaluateLiteSignals`. Not "the same rules" in the
 * sense of two code paths that agree today — literally the same function, over
 * signals built the same way: `issues/materialize.test.ts` proves
 * `evaluateLiteSignals(analysis)` and `evaluateLiteSignals(toOnPageSignals(row))`
 * return identical verdicts, which is what lets their freshly-crawled page be
 * compared with our stored one without tilting the table.
 *
 * Their crawl is sequential with a pause between requests, and capped at five
 * URLs. The site audit fetches 25 pages at a time because that is the site the
 * operator asked us to crawl; a competitor did not ask, so the ceiling here is
 * politeness rather than throughput.
 *
 * Every pair is independent. A competitor that blocks us, a URL that 404s, or a
 * host that refuses the request costs that pair and nothing else — and the reason
 * is stored and shown, because an empty column reads as "they have no issues".
 */
import type { AuthMode } from "@/lib/auth-mode";
import {
  canInvestigate,
  canManageTarget,
  resolveWorkspaceRole,
} from "@/server/features/audit/authz/workspace-role";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import {
  AuditTargetRepository,
  type AuditTarget,
} from "@/server/features/audit/repositories/AuditTargetRepository";
import {
  CompetitorRepository,
  type AuditCompetitor,
} from "@/server/features/audit/repositories/CompetitorRepository";
import {
  CompetitorPageRepository,
  type AuditCompetitorPage,
} from "@/server/features/audit/repositories/CompetitorPageRepository";
import { toOnPageSignals } from "@/server/features/audit/issues/snapshot-signals";
import { readCompetitorRobots } from "@/server/features/audit/competitors/competitor-robots";
import {
  compareIssues,
  countDeficit,
  planComparison,
  COMPETITOR_CRAWL_DELAY_MS,
  COMPETITOR_DISCOVERY_LIMIT,
  type RuleComparison,
} from "@/server/features/audit/competitors/comparison";
import { discoverUrls } from "@/server/lib/audit/discovery";
import { evaluateLiteSignals, type Issue } from "@/server/lib/seo-rules";
import { AppError } from "@/server/lib/errors";
import { getOrigin } from "@/server/lib/audit/url-utils";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import { crawlPage } from "@/server/workflows/site-audit-workflow-helpers";

type ActorContext = {
  projectId: string;
  organizationId: string;
  actorUserId: string;
  authMode: AuthMode;
  auditId: string;
};

/** One competitor's pairs, ready for the table. */
type CompetitorComparisonView = {
  competitorId: string;
  label: string;
  origin: string;
  /**
   * Our comparable pages with no pair against this competitor. A competitor may
   * genuinely have no counterpart to /pricing, and "no candidate" must not mean
   * "no way to pair it" — otherwise the operator is locked out of exactly the
   * comparisons that need a human to make them.
   */
  unpairedOurUrls: string[];
  pairs: Array<{
    pageId: string;
    ourUrl: string;
    theirUrl: string;
    matchSource: "auto" | "manual";
    matchConfidence: number | null;
    comparedAt: string | null;
    failureReason: string | null;
    /** Null until this pair has been compared. */
    rules: RuleComparison[] | null;
    deficit: number;
  }>;
};

async function resolveTarget(
  input: ActorContext,
  forManaging: boolean,
): Promise<{ target: AuditTarget; startUrl: string }> {
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  const permitted = forManaging ? canManageTarget(role) : canInvestigate(role);
  if (!permitted) throw new AppError("FORBIDDEN");

  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  const target = await AuditTargetRepository.getByProjectAndOrigin(
    input.projectId,
    getOrigin(audit.startUrl),
  );
  if (!target) throw new AppError("NOT_FOUND");
  return { target, startUrl: audit.startUrl };
}

/**
 * Our comparable pages: HTML documents that answered 200.
 *
 * A redirect or a 404 of ours has nothing to compare — the rules would judge
 * placeholder fields, and the resulting row would report a problem with a page
 * that does not exist.
 */
async function listOurComparableUrls(auditId: string): Promise<string[]> {
  const facts = await AuditRepository.getPageFactsForAudit(auditId);
  return facts
    .filter((page) => page.isHtml && page.statusCode === 200)
    .map((page) => page.url);
}

async function crawlAndScore(
  theirUrl: string,
  competitorOrigin: string,
): Promise<{
  issues: Issue[] | null;
  statusCode: number | null;
  title: string | null;
  failureReason: string | null;
}> {
  const result = await crawlPage(theirUrl, competitorOrigin, {
    includeAnalysis: true,
  });

  if (result === null) {
    return {
      issues: null,
      statusCode: null,
      title: null,
      failureReason:
        "Their URL redirected off their own domain, so there was nothing comparable to score.",
    };
  }
  if (result.statusCode !== 200 || !result.analysis) {
    return {
      issues: null,
      statusCode: result.statusCode === 0 ? null : result.statusCode,
      title: null,
      failureReason:
        result.statusCode === 0
          ? "We could not fetch their page."
          : `Their page answered ${result.statusCode}.`,
    };
  }

  return {
    issues: evaluateLiteSignals(result.analysis),
    statusCode: result.statusCode,
    title: result.analysis.title,
    failureReason: null,
  };
}

async function runForCompetitor(input: {
  competitor: AuditCompetitor;
  auditId: string;
  ourUrls: string[];
  existingPairs: AuditCompetitorPage[];
}): Promise<void> {
  const robots = await readCompetitorRobots(input.competitor.origin);

  const discovered =
    "allowed" in robots
      ? await discoverUrls(input.competitor.origin, COMPETITOR_DISCOVERY_LIMIT)
      : { urls: [] };

  const plans = planComparison({
    ourUrls: input.ourUrls,
    theirUrls: discovered.urls,
    isAllowed: "allowed" in robots ? robots.allowed.isAllowed : () => false,
    manualPairs: input.existingPairs
      .filter((pair) => pair.matchSource === "manual")
      .map((pair) => ({ ourUrl: pair.ourUrl, theirUrl: pair.theirUrl })),
  });

  for (const plan of plans) {
    await CompetitorPageRepository.upsertPairing({
      competitorId: input.competitor.id,
      targetId: input.competitor.targetId,
      ourUrl: plan.ourUrl,
      theirUrl: plan.theirUrl,
      matchConfidence: plan.confidence,
    });
  }

  // Re-read so every pair carries its stored id, including ones another run or a
  // manual override created.
  const pairs = await CompetitorPageRepository.listByCompetitors([
    input.competitor.id,
  ]);
  const pairByOurUrl: Record<string, AuditCompetitorPage> = {};
  for (const pair of pairs) pairByOurUrl[pair.ourUrl] = pair;

  const refusedWholeSite = "refused" in robots ? robots.refused : null;
  let fetched = 0;

  for (const plan of plans) {
    const pair = pairByOurUrl[plan.ourUrl];
    if (!pair) continue;

    const skipReason = refusedWholeSite ?? plan.skip;
    if (skipReason !== null) {
      await CompetitorPageRepository.recordComparison({
        pageId: pair.id,
        auditId: input.auditId,
        theirIssuesJson: null,
        theirStatusCode: null,
        theirTitle: null,
        failureReason: skipReason,
      });
      continue;
    }

    // Pace only between requests that actually happen, so a run made mostly of
    // skips does not idle for no reason.
    //
    // `Promise.withResolvers` would read better but is ES2024, and this
    // project's `lib` is ES2023 (tsconfig.json:16). Raising the whole project's
    // lib target for one pause is not a trade worth making here.
    if (fetched > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, COMPETITOR_CRAWL_DELAY_MS),
      );
    }
    fetched += 1;

    const scored = await crawlAndScore(pair.theirUrl, input.competitor.origin);
    await CompetitorPageRepository.recordComparison({
      pageId: pair.id,
      auditId: input.auditId,
      theirIssuesJson: scored.issues ? JSON.stringify(scored.issues) : null,
      theirStatusCode: scored.statusCode,
      theirTitle: scored.title,
      failureReason: scored.failureReason,
    });
  }
}

async function run(input: ActorContext): Promise<{ competitors: number }> {
  const { target } = await resolveTarget(input, true);
  const competitors = await CompetitorRepository.listByTarget(target.id);
  if (competitors.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Add a competitor first");
  }

  const ourUrls = await listOurComparableUrls(input.auditId);
  const existingPairs = await CompetitorPageRepository.listByCompetitors(
    competitors.map((competitor) => competitor.id),
  );

  for (const competitor of competitors) {
    // One competitor failing outright must not cost the others their comparison.
    try {
      await runForCompetitor({
        competitor,
        auditId: input.auditId,
        ourUrls,
        existingPairs: existingPairs.filter(
          (pair) => pair.competitorId === competitor.id,
        ),
      });
    } catch (error) {
      console.error(
        `[competitor-comparison] ${competitor.origin} failed:`,
        error,
      );
    }
  }

  return { competitors: competitors.length };
}

/**
 * Read back a stored verdict set.
 *
 * Narrowed rather than asserted. The column holds JSON this deployment wrote,
 * but a row can outlive the shape that wrote it — a rule catalog change, a
 * partial write, a hand-edited row — and casting would turn that into a render
 * crash on the report page. Anything that does not look like a verdict is
 * dropped, which surfaces as "not compared yet" rather than a broken page.
 */
function parseStoredIssues(json: string | null): Issue[] | null {
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isIssue);
  } catch {
    return null;
  }
}

function isIssue(value: unknown): value is Issue {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "label" in value &&
    typeof value.label === "string" &&
    "severity" in value &&
    typeof value.severity === "string" &&
    "status" in value &&
    typeof value.status === "string"
  );
}

async function get(input: ActorContext): Promise<CompetitorComparisonView[]> {
  const { target } = await resolveTarget(input, false);
  const competitors = await CompetitorRepository.listByTarget(target.id);
  if (competitors.length === 0) return [];

  const ourComparableUrls = await listOurComparableUrls(input.auditId);

  const pairs = await CompetitorPageRepository.listByCompetitors(
    competitors.map((competitor) => competitor.id),
  );

  // Our side is re-evaluated from the stored crawl rather than stored beside
  // theirs: one source of truth, and a rule that never ran stays visibly absent.
  const ourRows = await AuditRepository.getPagesByUrls(input.auditId, [
    ...new Set(pairs.map((pair) => pair.ourUrl)),
  ]);
  const ourIssuesByUrl: Record<string, Issue[]> = {};
  for (const row of ourRows) {
    ourIssuesByUrl[row.url] = evaluateLiteSignals(toOnPageSignals(row));
  }

  return competitors.map((competitor) => {
    const competitorPairs = pairs.filter(
      (pair) => pair.competitorId === competitor.id,
    );
    const pairedOurUrls = new Set(competitorPairs.map((pair) => pair.ourUrl));
    return {
      competitorId: competitor.id,
      label: competitor.label ?? new URL(competitor.origin).host,
      origin: competitor.origin,
      // Our pages the matcher found nothing for. A competitor genuinely may not
      // have a counterpart to /pricing — but "no candidate" must not mean "no way
      // to pair it", or the operator is locked out of exactly the comparisons
      // that need a human.
      unpairedOurUrls: ourComparableUrls.filter(
        (url) => !pairedOurUrls.has(url),
      ),
      pairs: competitorPairs
        .map((pair) => {
          const theirIssues = parseStoredIssues(pair.theirIssuesJson);
          const ourIssues = ourIssuesByUrl[pair.ourUrl] ?? null;
          const rules =
            theirIssues && ourIssues
              ? compareIssues(ourIssues, theirIssues)
              : null;
          return {
            pageId: pair.id,
            ourUrl: pair.ourUrl,
            theirUrl: pair.theirUrl,
            matchSource: pair.matchSource,
            matchConfidence: pair.matchConfidence,
            comparedAt: pair.comparedAt,
            failureReason: pair.failureReason,
            rules,
            deficit: rules ? countDeficit(rules) : 0,
          };
        })
        // Worst first: a reader opens this to find what to fix.
        .toSorted((a, b) =>
          b.deficit !== a.deficit
            ? b.deficit - a.deficit
            : a.ourUrl.localeCompare(b.ourUrl),
        ),
    };
  });
}

/**
 * Point a pairing at a URL a person chose — repointing an existing pair, or
 * creating one for a page the matcher found no candidate for.
 *
 * The URL is SSRF-checked like every other fetchable input, and then required to
 * be on the competitor's own origin. Without that second check the field would be
 * a way to make the deployment fetch any address of the caller's choosing under
 * the label "competitor page" — and a comparison against an unrelated domain
 * would be meaningless even if it were safe.
 *
 * `ourUrl` is checked against the audit's own comparable pages for the same
 * reason: the left-hand column has to be a page we actually crawled, or the row
 * would compare their real page against nothing.
 */
async function setPairUrl(
  input: ActorContext & {
    competitorId: string;
    pageId: string | null;
    ourUrl: string | null;
    theirUrl: string;
  },
): Promise<void> {
  const { target } = await resolveTarget(input, true);

  const competitors = await CompetitorRepository.listByTarget(target.id);
  const competitor = competitors.find(
    (candidate) => candidate.id === input.competitorId,
  );
  if (!competitor) throw new AppError("NOT_FOUND");

  const normalized = await normalizeAndValidateStartUrl(input.theirUrl);
  if (getOrigin(normalized) !== competitor.origin) {
    throw new AppError(
      "VALIDATION_ERROR",
      `That URL is not on ${new URL(competitor.origin).host}`,
    );
  }

  if (input.pageId !== null) {
    await CompetitorPageRepository.setManualUrl({
      competitorId: input.competitorId,
      pageId: input.pageId,
      theirUrl: normalized,
    });
    return;
  }

  if (input.ourUrl === null) throw new AppError("VALIDATION_ERROR");
  const ourComparableUrls = await listOurComparableUrls(input.auditId);
  if (!ourComparableUrls.includes(input.ourUrl)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "That page is not one of this crawl's comparable pages",
    );
  }

  await CompetitorPageRepository.upsertManualPairing({
    competitorId: input.competitorId,
    targetId: target.id,
    ourUrl: input.ourUrl,
    theirUrl: normalized,
  });
}

export const CompetitorComparisonService = {
  run,
  get,
  setPairUrl,
} as const;
