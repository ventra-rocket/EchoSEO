import { orgMayUsePaidFeatures } from "@/server/billing/subscription";
import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import { beginRankCheckRun } from "@/server/features/rank-tracking/services/rankCheckRunGuards";
import { resolveDataforseoCredentialAccess } from "@/server/lib/dataforseo/credential-access-policy";
import { resolveDataforseoCredentials } from "@/server/lib/dataforseo/resolve-credentials";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import {
  computeNextCheckAt,
  devicesCount,
  isScheduledRankTrackingInterval,
} from "@/shared/rank-tracking";

/**
 * Work admitted per tick, in task units (keywords × devices).
 *
 * Admission control, not a rate limit: the first start of a tick is always
 * admitted, so a config larger than the whole budget (legal max: 1,000 keywords
 * × 2 devices = 2,000 units) can never starve behind it.
 *
 * Sized against DataForSEO's 2,000 requests/min account cap, where task_get
 * polling — not task_post — is the binding constraint: a scheduled check posts
 * one task per 100 units but then polls one task_get per unit per round, and
 * rounds wake synchronized per tick. A ~15-minute poll window on a 15-minute
 * cron means roughly one tick's polls in flight at a time, so 1,000 units/tick
 * peaks well inside the cap and leaves headroom for the other DataForSEO
 * products sharing the account. Overshooting would age throttled polls into the
 * ~3x-cost live fallback, billed to the customer.
 *
 * Before this budget existed the loop started every due config it fetched, so a
 * single tick could admit tens of thousands of units — unbounded against the
 * account cap.
 */
const SCHEDULED_TASK_UNIT_BUDGET = 1000;

/**
 * Wall-clock ceiling for the per-config loop. A skip-heavy tick pays serial
 * per-organization round trips (access check, credential resolution) and must
 * not run into the Worker's 15-minute cron kill, which would drop the summary
 * log and leave the remaining candidates unexamined.
 *
 * This bounds time only. The other two ceilings live elsewhere on purpose:
 * SCHEDULED_TASK_UNIT_BUDGET bounds DataForSEO throughput, and
 * DUE_CONFIGS_PER_TICK (RankTrackingRepository) bounds the invocation's
 * subrequest count by capping how many rows this loop can ever see.
 */
const TICK_DEADLINE_MS = 3 * 60 * 1000;

/**
 * Cap on the per-tick list of configs blocked by an already-active run. Those
 * leave no durable trace on their row, so the summary names them.
 */
const ALREADY_RUNNING_IDS_CAP = 20;

/**
 * Verdict for one per-config admission gate. `unknown` carries the failure so
 * the caller can log it and leave the row untouched: a gate that could not be
 * evaluated is not a denial.
 */
type GateOutcome =
  | { state: "pass" | "deny" }
  | { state: "unknown"; err: unknown };

// Shared: only a gate that actually failed allocates.
const GATE_PASS: GateOutcome = { state: "pass" };
const GATE_DENY: GateOutcome = { state: "deny" };

/**
 * Evaluate one gate. Both gates — paid-plan access and DataForSEO credentials —
 * are the same shape: a per-organization predicate, memoized for the tick, that
 * may throw. Resolving them through one helper keeps the drain loop's own
 * nesting flat and makes "threw" and "returned false" impossible to conflate.
 */
async function resolveGate(
  check: () => Promise<boolean>,
): Promise<GateOutcome> {
  try {
    return (await check()) ? GATE_PASS : GATE_DENY;
  } catch (err) {
    return { state: "unknown", err };
  }
}

/**
 * Cron body for the `scheduled` Worker handler: start a rank-check run for
 * every config that is due, oldest first, until the tick's unit budget or
 * deadline is reached.
 *
 * Every advance of `nextCheckAt` goes through `claimDueConfig`, a
 * compare-and-set on the observed timestamp. That is what makes the drain
 * deterministic: a config is either claimed by exactly one tick or left
 * untouched for the next one, and a config whose run could not start has its
 * original due time restored instead of silently waiting a full interval.
 */
export async function runScheduledRankChecks(
  env: Pick<Env, "RANK_CHECK_WORKFLOW">,
) {
  const nowIso = new Date().toISOString();
  const dueConfigs =
    await RankTrackingRepository.getDueConfigsWithOrganization(nowIso);
  const isHosted = await isHostedServerAuthMode();
  const keywordCounts = await RankTrackingRepository.getKeywordCountsForConfigs(
    dueConfigs.map((config) => config.id),
  );

  // Function-local so these live exactly one tick. At module scope they would be
  // cross-invocation global state in Workers and a denial would be cached
  // forever. Within a tick, memoizing a denial is intentional: one round trip
  // per organization, and that organization's configs simply stay due.
  const accessChecks = new Map<string, Promise<boolean>>();
  const checkAccess = (organizationId: string) => {
    let check = accessChecks.get(organizationId);
    if (!check) {
      check = orgMayUsePaidFeatures(organizationId);
      accessChecks.set(organizationId, check);
    }
    return check;
  };

  const keyChecks = new Map<string, Promise<boolean>>();
  const checkKey = (organizationId: string) => {
    let check = keyChecks.get(organizationId);
    if (!check) {
      check = resolveDataforseoCredentials(organizationId)
        .then(resolveDataforseoCredentialAccess)
        .then((access) => access !== "unavailable");
      keyChecks.set(organizationId, check);
    }
    return check;
  };

  const deadline = Date.now() + TICK_DEADLINE_MS;
  let stoppedByDeadline = false;
  let unitsStarted = 0;
  let started = 0;
  let stoppedByBudget = false;
  let skippedNoAccess = 0;
  let skippedNoKey = 0;
  let skippedNoKeywords = 0;
  let concurrentChangeSkips = 0;
  let alreadyRunning = 0;
  const alreadyRunningConfigIds: string[] = [];
  let accessCheckErrors = 0;
  let keyCheckErrors = 0;
  let workflowStartErrors = 0;
  let configErrors = 0;

  for (const config of dueConfigs) {
    if (Date.now() >= deadline) {
      stoppedByDeadline = true;
      break;
    }

    // Per-config containment: one bad row (e.g. a malformed next_check_at, which
    // sorts first and would head every scan) or a transient DB error must not
    // starve the rest of the tick or suppress the summary log.
    try {
      const interval = isScheduledRankTrackingInterval(config.scheduleInterval)
        ? config.scheduleInterval
        : null;
      // Unreachable: the due query excludes manual configs and NULL next check
      // times. Narrowed rather than asserted so a later query change cannot
      // produce a run with no schedule anchor.
      if (!interval || !config.nextCheckAt) continue;

      const kwCount = keywordCounts.get(config.id) ?? 0;
      const taskUnits = kwCount * devicesCount(config.devices);
      // Projected stop: admit only what fits the budget. The first start of a
      // tick is exempt so an oversized config can never starve, and zero-unit
      // rows (no keywords) always advance.
      if (
        started > 0 &&
        unitsStarted + taskUnits > SCHEDULED_TASK_UNIT_BUDGET
      ) {
        stoppedByBudget = true;
        break;
      }

      const observedNextCheckAt = config.nextCheckAt;
      const nextCheckAt = computeNextCheckAt(interval, observedNextCheckAt);

      if (kwCount === 0) {
        const claimed = await RankTrackingRepository.claimDueConfig({
          configId: config.id,
          projectId: config.projectId,
          observedNextCheckAt,
          nextCheckAt,
          lastSkipReason: "no_keywords",
        });
        if (claimed) skippedNoKeywords++;
        else concurrentChangeSkips++;
        continue;
      }

      // Access gate: allowlisted (founder + invited) or a paid plan. Self-hosted
      // deployments treat every config as entitled and make no billing calls.
      const access = isHosted
        ? await resolveGate(() => checkAccess(config.organizationId))
        : GATE_PASS;
      if (access.state === "unknown") {
        // Never write nextCheckAt on an error: it is the schedule anchor, so an
        // error write would permanently shift this config's slot and herd-sync
        // configs after an outage. Leaving the row due is the retry.
        console.error(
          `[cron] Access check failed for config ${config.id} (${config.domain}):`,
          access.err,
        );
        accessCheckErrors++;
        continue;
      }
      if (access.state === "deny") {
        const claimed = await RankTrackingRepository.claimDueConfig({
          configId: config.id,
          projectId: config.projectId,
          observedNextCheckAt,
          nextCheckAt,
          lastSkipReason: "plan_required",
        });
        if (claimed) skippedNoAccess++;
        else concurrentChangeSkips++;
        continue;
      }

      // Key gate: a scheduled run with no DataForSEO key would start the
      // workflow and then fail at the credential seam (DATAFORSEO_KEY_MISSING).
      // Skipping first means a scheduled run never shows `failed` merely because
      // the organization has not connected a key.
      const key = await resolveGate(() => checkKey(config.organizationId));
      if (key.state === "unknown") {
        console.error(
          `[cron] Credential check failed for config ${config.id} (${config.domain}):`,
          key.err,
        );
        keyCheckErrors++;
        continue;
      }
      if (key.state === "deny") {
        const claimed = await RankTrackingRepository.claimDueConfig({
          configId: config.id,
          projectId: config.projectId,
          observedNextCheckAt,
          nextCheckAt,
          lastSkipReason: "key_missing",
        });
        if (claimed) skippedNoKey++;
        else concurrentChangeSkips++;
        continue;
      }

      // Claim the slot before starting, which is also the retry-storm guard: a
      // run that fails does not leave the config due. Clearing lastSkipReason
      // here is what lets a newly entitled org drop its skip badge — the
      // workflow only writes null on a fully successful run.
      const claimed = await RankTrackingRepository.claimDueConfig({
        configId: config.id,
        projectId: config.projectId,
        observedNextCheckAt,
        nextCheckAt,
        lastSkipReason: null,
      });
      if (!claimed) {
        concurrentChangeSkips++;
        continue;
      }

      let result;
      try {
        result = await beginRankCheckRun({
          workflow: env.RANK_CHECK_WORKFLOW,
          config,
          projectId: config.projectId,
          billingCustomer: {
            userId: "system",
            userEmail: "system@echoseo.ventrarocket.vn",
            organizationId: config.organizationId,
            projectId: config.projectId,
          },
          keywordsTotal: kwCount,
          trigger: "scheduled",
          workflowStartErrorMessage: "Failed to start scheduled workflow",
        });
      } catch (err) {
        // Leave the schedule advanced: a systemic Workflows outage must not make
        // hundreds of configs due again on the very next tick.
        workflowStartErrors++;
        console.error(
          `[cron] Failed to start scheduled rank check for config ${config.id} (${config.domain}):`,
          err,
        );
        continue;
      }

      if (result.ok) {
        unitsStarted += taskUnits;
        started++;
        continue;
      }

      alreadyRunning++;
      if (alreadyRunningConfigIds.length < ALREADY_RUNNING_IDS_CAP) {
        alreadyRunningConfigIds.push(config.id);
      }
      // Nothing was started, so give the slot back and retry next tick once the
      // blocking run clears. A manual edit landing in between wins the CAS.
      const restored = await RankTrackingRepository.claimDueConfig({
        configId: config.id,
        projectId: config.projectId,
        observedNextCheckAt: nextCheckAt,
        nextCheckAt: observedNextCheckAt,
      });
      if (!restored) {
        console.log(
          `[cron] Could not restore schedule for config ${config.id} (${config.domain}) — changed concurrently`,
        );
      }
    } catch (err) {
      configErrors++;
      console.error(
        `[cron] Error processing config ${config.id} (${config.domain}):`,
        err,
      );
    }
  }

  // Oldest by the due query's next_check_at ASC ordering.
  const oldestDue = dueConfigs[0]?.nextCheckAt;
  // Logged as an object rather than an interpolated string so Workers Logs
  // indexes the fields. Error level when anything failed, so ticks that need
  // attention surface in error-filtered views.
  const logSummary =
    accessCheckErrors + keyCheckErrors + workflowStartErrors + configErrors > 0
      ? console.error
      : console.log;
  logSummary({
    event: "rank_tracking_scheduler_summary",
    candidates: dueConfigs.length,
    started,
    unitsStarted,
    budget: SCHEDULED_TASK_UNIT_BUDGET,
    stoppedByBudget,
    stoppedByDeadline,
    skippedNoAccess,
    skippedNoKey,
    skippedNoKeywords,
    concurrentChangeSkips,
    alreadyRunning,
    alreadyRunningConfigIds,
    accessCheckErrors,
    keyCheckErrors,
    workflowStartErrors,
    configErrors,
    oldestDueAgeMs: oldestDue
      ? Date.now() - new Date(oldestDue).getTime()
      : null,
  });
}
