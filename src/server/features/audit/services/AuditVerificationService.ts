/**
 * Reads the verification outcome of a re-crawl: for the crawl launched to verify
 * fixes, what happened to each issue its baseline crawl had found.
 *
 * The audit is authorized against the caller's project (both the re-crawl and its
 * baseline must belong to it), so a baseline from another project or target can
 * never be read through here. The pure judgement lives in
 * `history/verification-outcome.ts`; this only loads the rows and gates on state.
 *
 * Known residual: a whole-crawl rule that self-suppresses on the re-crawl (orphan
 * detection when the crawl truncates, sitemap-gap when the sitemap can't be
 * fetched — see rules/cross-page.ts) drops its occurrences even though nothing
 * was fixed, and those URLs were observed, so they read as resolved. Narrowing
 * that to inconclusive needs the re-crawl's suppression flags, which are not
 * persisted per audit; deferred rather than guessed.
 */
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditIssueRepository } from "@/server/features/audit/repositories/AuditIssueRepository";
import {
  computeVerificationOutcome,
  type VerificationOutcome,
} from "@/server/features/audit/history/verification-outcome";
import { getOrigin } from "@/server/lib/audit/url-utils";
import { AppError } from "@/server/lib/errors";

type VerificationResult =
  | { state: "no_baseline" }
  | { state: "baseline_unavailable" }
  | { state: "pending" }
  | {
      state: "available";
      baseline: { auditId: string; completedAt: string | null };
      outcome: VerificationOutcome;
    };

function occurrenceKey(occurrence: { ruleId: string; url: string }): string {
  return `${occurrence.ruleId}\n${occurrence.url}`;
}

async function resolveVerificationOutcome(input: {
  auditId: string;
  projectId: string;
}): Promise<VerificationResult> {
  const current = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!current) throw new AppError("NOT_FOUND");

  const baselineAuditId = current.baselineAuditId;
  if (!baselineAuditId) return { state: "no_baseline" };

  // Same project (isolation) + completed + same target. startAudit validates
  // this at launch; re-checking here keeps the read honest if a baseline was
  // deleted or somehow points elsewhere.
  const baseline = await AuditRepository.getAuditForProject(
    baselineAuditId,
    input.projectId,
  );
  if (
    !baseline ||
    baseline.status !== "completed" ||
    getOrigin(baseline.startUrl) !== getOrigin(current.startUrl)
  ) {
    return { state: "baseline_unavailable" };
  }

  const [currentSnapshot, baselineSnapshot] = await Promise.all([
    AuditRepository.getSnapshotForAudit(input.auditId),
    AuditRepository.getSnapshotForAudit(baselineAuditId),
  ]);

  // The re-crawl's issues aren't materialized yet — nothing to judge.
  if (!currentSnapshot || currentSnapshot.issuesMaterializedAt === null) {
    return { state: "pending" };
  }
  // Comparing against an unmaterialized baseline would read every baseline issue
  // as resolved (it has zero stored occurrences), which is the exact lie the
  // P10 comparison gate refuses — so refuse it here too.
  if (!baselineSnapshot || baselineSnapshot.issuesMaterializedAt === null) {
    return { state: "baseline_unavailable" };
  }

  const [baselineOccurrences, currentKeyRows, currentResults] =
    await Promise.all([
      AuditIssueRepository.getOccurrenceKeysForAudit(baselineAuditId),
      AuditIssueRepository.getOccurrenceKeysForAudit(input.auditId),
      AuditRepository.getAuditResultsForProject(input.auditId, input.projectId),
    ]);

  const urlByPageId = new Map(
    currentResults.pages.map((page) => [page.id, page.url]),
  );

  const outcome = computeVerificationOutcome({
    baselineOccurrences,
    currentKeys: new Set(currentKeyRows.map(occurrenceKey)),
    // A status-0 row is a failed fetch that materializes no issue, so it is not a
    // real re-evaluation — excluding it keeps a timed-out re-crawl from reading
    // as "resolved".
    observedUrls: new Set(
      currentResults.pages
        .filter((page) => (page.statusCode ?? 0) !== 0)
        .map((page) => page.url),
    ),
    // A URL counts as CWV-re-measured only with a complete mobile Lighthouse run
    // (a null metric materializes no CWV issue — mirrors materialize.ts), so a
    // page fetched but not re-measured stays inconclusive, never a false resolve.
    measuredUrls: new Set(
      currentResults.lighthouse.flatMap((row) => {
        if (
          row.strategy !== "mobile" ||
          row.lcpMs === null ||
          row.inpMs === null ||
          row.cls === null ||
          row.ttfbMs === null
        ) {
          return [];
        }
        const url = urlByPageId.get(row.pageId);
        return url ? [url] : [];
      }),
    ),
  });

  return {
    state: "available",
    baseline: { auditId: baseline.id, completedAt: baseline.completedAt },
    outcome,
  };
}

export const AuditVerificationService = {
  resolveVerificationOutcome,
} as const;
