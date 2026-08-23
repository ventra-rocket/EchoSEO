import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lte,
  max,
  ne,
} from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { db } from "@/db";
import {
  rankTrackingConfigs,
  rankCheckRuns,
  rankSnapshots,
  rankTrackingKeywords,
  projects,
} from "@/db/schema";
import type { RankTrackingSkipReason } from "@/shared/rank-tracking";
import {
  getLatestSnapshotsForKeywords,
  getSnapshotsBeforeDate,
  getEarliestSnapshotsForKeywords,
  getKeywordHistory,
  getConfigTrend,
  getPositionMatrix,
} from "./snapshotQueries";

const DB_BATCH_SIZE = 100;
type BatchStatement = Parameters<typeof db.batch>[0][number];

async function executeInBatches<T>(
  items: T[],
  buildStatement: (item: T) => BatchStatement,
) {
  for (let i = 0; i < items.length; i += DB_BATCH_SIZE) {
    const chunk = items.slice(i, i + DB_BATCH_SIZE).map(buildStatement);
    const [first, ...rest] = chunk;
    if (!first) continue;
    await db.batch([first, ...rest]);
  }
}

/**
 * Split ids into chunks that keep each `IN (...)` list under D1's ~100
 * bound-parameter cap. A project may hold up to MAX_CONFIGS_PER_PROJECT (500)
 * configs, so a single-statement IN over every config would be rejected.
 */
function chunkIds(ids: string[]): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += DB_BATCH_SIZE) {
    chunks.push(ids.slice(i, i + DB_BATCH_SIZE));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Config CRUD
// ---------------------------------------------------------------------------

async function getConfigsForProject(projectId: string) {
  return db
    .select()
    .from(rankTrackingConfigs)
    .where(
      and(
        eq(rankTrackingConfigs.projectId, projectId),
        eq(rankTrackingConfigs.isActive, true),
      ),
    )
    .orderBy(rankTrackingConfigs.createdAt);
}

async function getConfigById({
  configId,
  projectId,
}: {
  configId: string;
  projectId: string;
}) {
  const rows = await db
    .select()
    .from(rankTrackingConfigs)
    .where(
      and(
        eq(rankTrackingConfigs.id, configId),
        eq(rankTrackingConfigs.projectId, projectId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function getConfigByProjectDomainLocation(
  projectId: string,
  domain: string,
  locationCode: number,
) {
  const rows = await db
    .select()
    .from(rankTrackingConfigs)
    .where(
      and(
        eq(rankTrackingConfigs.projectId, projectId),
        eq(rankTrackingConfigs.domain, domain),
        eq(rankTrackingConfigs.locationCode, locationCode),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function createConfig(
  data: InferInsertModel<typeof rankTrackingConfigs>,
) {
  await db.insert(rankTrackingConfigs).values(data);
}

async function updateConfig(
  configId: string,
  projectId: string,
  data: Partial<InferInsertModel<typeof rankTrackingConfigs>>,
) {
  await db
    .update(rankTrackingConfigs)
    .set(data)
    .where(
      and(
        eq(rankTrackingConfigs.id, configId),
        eq(rankTrackingConfigs.projectId, projectId),
      ),
    );
}

/**
 * Candidates examined per tick.
 *
 * Derived from the Worker invocation's 1,000-subrequest cap, which binds before
 * wall clock does: a started config costs three subrequests (CAS claim, run
 * insert, workflow create) and a blocked one up to four (the run guard inspects
 * the blocker), so 200 candidates peak near 800 and leave room for the fixed
 * overhead — the due query itself, the batched keyword counts, and one
 * access/credential round trip per distinct organization. Being killed mid-tick
 * is worse than deferring work: a kill between the claim and the start advances
 * a config's schedule with no run behind it, costing that config a whole
 * interval, and it drops the tick summary that would have said so.
 *
 * The tick's unit budget and deadline in scheduledRankChecks.ts stop the loop
 * earlier whenever the candidates are actually startable; this cap is the
 * ceiling for a skip-heavy tick, where nothing starts and the loop pays only
 * one claim per row.
 */
const DUE_CONFIGS_PER_TICK = 200;

async function getDueConfigsWithOrganization(nowIso: string) {
  return (
    db
      .select({
        id: rankTrackingConfigs.id,
        projectId: rankTrackingConfigs.projectId,
        domain: rankTrackingConfigs.domain,
        locationCode: rankTrackingConfigs.locationCode,
        languageCode: rankTrackingConfigs.languageCode,
        devices: rankTrackingConfigs.devices,
        serpDepth: rankTrackingConfigs.serpDepth,
        scheduleInterval: rankTrackingConfigs.scheduleInterval,
        nextCheckAt: rankTrackingConfigs.nextCheckAt,
        organizationId: projects.organizationId,
      })
      .from(rankTrackingConfigs)
      .innerJoin(projects, eq(rankTrackingConfigs.projectId, projects.id))
      .where(
        and(
          eq(rankTrackingConfigs.isActive, true),
          // Only configs the owner explicitly opted into scheduled runs. Others
          // are never selected, so they neither auto-spend nor churn the loop.
          eq(rankTrackingConfigs.scheduledEnabled, true),
          // A config switched to "manual" can keep a stale non-null next_check_at
          // (only updateConfig nulls it). The loop cannot advance a manual
          // config's schedule, so without this it would be re-selected every tick
          // forever.
          ne(rankTrackingConfigs.scheduleInterval, "manual"),
          lte(rankTrackingConfigs.nextCheckAt, nowIso),
          isNull(projects.archivedAt),
        ),
      )
      // Oldest first so a backlog drains in order instead of the same arbitrary
      // rows filling every tick. `lte` already excludes NULL, so both ordering
      // columns are non-null; id breaks ties for a stable total order.
      .orderBy(
        asc(rankTrackingConfigs.nextCheckAt),
        asc(rankTrackingConfigs.id),
      )
      .limit(DUE_CONFIGS_PER_TICK)
  );
}

/**
 * Conditionally advance a due config's schedule, returning false when the
 * config changed underneath us (manual edit, deactivation, a concurrent tick).
 *
 * `next_check_at` equality is the compare-and-set token. `schedule_interval` is
 * deliberately absent from the predicate: every schedule edit rewrites
 * `next_check_at` (updateConfig recomputes it, or nulls it for "manual"), so the
 * timestamp check already detects interval changes.
 *
 * `lastSkipReason` is written only when the caller passes it — the restore path
 * omits it so it cannot clobber a reason the blocking run just wrote.
 */
async function claimDueConfig(input: {
  configId: string;
  projectId: string;
  observedNextCheckAt: string;
  nextCheckAt: string;
  lastSkipReason?: RankTrackingSkipReason | null;
}): Promise<boolean> {
  const claimed = await db
    .update(rankTrackingConfigs)
    .set({
      nextCheckAt: input.nextCheckAt,
      ...(input.lastSkipReason !== undefined && {
        lastSkipReason: input.lastSkipReason,
      }),
    })
    .where(
      and(
        eq(rankTrackingConfigs.id, input.configId),
        eq(rankTrackingConfigs.projectId, input.projectId),
        eq(rankTrackingConfigs.isActive, true),
        eq(rankTrackingConfigs.scheduledEnabled, true),
        eq(rankTrackingConfigs.nextCheckAt, input.observedNextCheckAt),
      ),
    )
    .returning({ id: rankTrackingConfigs.id });
  return claimed.length > 0;
}

// ---------------------------------------------------------------------------
// Run CRUD
// ---------------------------------------------------------------------------

/**
 * Try to insert a new pending run. Returns true if inserted, false if blocked
 * by the partial unique index on (config_id) WHERE status IN ('pending',
 * 'running') — i.e. another active run exists for this config.
 *
 * This is how duplicate-trigger protection is enforced: the DB rejects the
 * second insert rather than a separate lock table.
 */
async function tryCreateRun(data: {
  id: string;
  configId: string;
  projectId: string;
  keywordsTotal: number;
  isSubsetRun?: boolean;
}): Promise<boolean> {
  const inserted = await db
    .insert(rankCheckRuns)
    .values({ ...data, status: "pending" })
    .onConflictDoNothing()
    .returning({ id: rankCheckRuns.id });
  return inserted.length > 0;
}

async function updateRun(
  runId: string,
  data: Partial<InferInsertModel<typeof rankCheckRuns>>,
) {
  await db.update(rankCheckRuns).set(data).where(eq(rankCheckRuns.id, runId));
}

async function getRunById(runId: string) {
  const rows = await db
    .select()
    .from(rankCheckRuns)
    .where(eq(rankCheckRuns.id, runId))
    .limit(1);
  return rows[0] ?? null;
}

async function getLatestRunForConfig(configId: string) {
  const rows = await db
    .select()
    .from(rankCheckRuns)
    .where(eq(rankCheckRuns.configId, configId))
    .orderBy(desc(rankCheckRuns.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Returns the currently active (pending or running) run for a config, if any.
 * At most one such row exists, enforced by the partial unique index.
 */
async function getActiveRunForConfig(configId: string) {
  const rows = await db
    .select()
    .from(rankCheckRuns)
    .where(
      and(
        eq(rankCheckRuns.configId, configId),
        inArray(rankCheckRuns.status, ["pending", "running"]),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

async function insertSnapshots(
  snapshots: Array<
    Omit<InferInsertModel<typeof rankSnapshots>, "id" | "checkedAt">
  >,
) {
  await executeInBatches(snapshots, (snapshot) =>
    db.insert(rankSnapshots).values(snapshot).onConflictDoNothing(),
  );
}

async function getSnapshotsForRun(runId: string) {
  return db.select().from(rankSnapshots).where(eq(rankSnapshots.runId, runId));
}

// ---------------------------------------------------------------------------
// Tracking keywords per config
// ---------------------------------------------------------------------------

async function getKeywordsForConfig(configId: string) {
  return db
    .select()
    .from(rankTrackingKeywords)
    .where(eq(rankTrackingKeywords.configId, configId))
    .orderBy(rankTrackingKeywords.createdAt);
}

async function addKeywordsToConfig(
  keywords: Array<{ id: string; configId: string; keyword: string }>,
) {
  await executeInBatches(keywords, (kw) =>
    db.insert(rankTrackingKeywords).values(kw).onConflictDoNothing(),
  );
}

async function removeKeywordsFromConfig(
  keywordIds: string[],
  configId: string,
) {
  await db
    .delete(rankTrackingKeywords)
    .where(
      and(
        inArray(rankTrackingKeywords.id, keywordIds),
        eq(rankTrackingKeywords.configId, configId),
      ),
    );
}

/** Keyword counts keyed by config id. Configs with no keywords are absent. */
async function getKeywordCountsForConfigs(configIds: string[]) {
  const counts = new Map<string, number>();
  for (const chunk of chunkIds(configIds)) {
    const rows = await db
      .select({ configId: rankTrackingKeywords.configId, value: count() })
      .from(rankTrackingKeywords)
      .where(inArray(rankTrackingKeywords.configId, chunk))
      .groupBy(rankTrackingKeywords.configId);
    for (const row of rows) counts.set(row.configId, row.value);
  }
  return counts;
}

/** Each config's most recent run, keyed by config id. */
async function getLatestRunsForConfigs(configIds: string[]) {
  const latest = new Map<
    string,
    { status: string; completedAt: string | null }
  >();
  for (const chunk of chunkIds(configIds)) {
    // Subquery: latest startedAt per config
    const latestStarted = db
      .select({
        configId: rankCheckRuns.configId,
        maxStartedAt: max(rankCheckRuns.startedAt).as("maxStartedAt"),
      })
      .from(rankCheckRuns)
      .where(inArray(rankCheckRuns.configId, chunk))
      .groupBy(rankCheckRuns.configId)
      .as("latestStarted");

    // Join back to get status + completedAt for each config's latest run
    const rows = await db
      .select({
        configId: rankCheckRuns.configId,
        status: rankCheckRuns.status,
        completedAt: rankCheckRuns.completedAt,
      })
      .from(rankCheckRuns)
      .innerJoin(
        latestStarted,
        and(
          eq(rankCheckRuns.configId, latestStarted.configId),
          eq(rankCheckRuns.startedAt, latestStarted.maxStartedAt),
        ),
      );

    for (const run of rows) {
      latest.set(run.configId, {
        status: run.status,
        completedAt: run.completedAt,
      });
    }
  }
  return latest;
}

async function getConfigSummaries(projectId: string) {
  const configs = await getConfigsForProject(projectId);
  if (configs.length === 0) return [];

  // Both lookups chunk their IN lists: a project may hold up to 500 configs,
  // well past D1's ~100 bound-parameter cap for a single statement.
  const configIds = configs.map((c) => c.id);
  const kwCountMap = await getKeywordCountsForConfigs(configIds);
  const latestRunMap = await getLatestRunsForConfigs(configIds);

  return configs.map((config) => ({
    ...config,
    keywordCount: kwCountMap.get(config.id) ?? 0,
    lastRunStatus: latestRunMap.get(config.id)?.status ?? null,
    lastRunCompletedAt: latestRunMap.get(config.id)?.completedAt ?? null,
  }));
}

async function updateKeywordMetrics(
  updates: Array<{
    id: string;
    searchVolume: number | null;
    keywordDifficulty: number | null;
    cpc: number | null;
    metricsFetchedAt: string;
  }>,
) {
  await executeInBatches(updates, (u) =>
    db
      .update(rankTrackingKeywords)
      .set({
        searchVolume: u.searchVolume,
        keywordDifficulty: u.keywordDifficulty,
        cpc: u.cpc,
        metricsFetchedAt: u.metricsFetchedAt,
      })
      .where(eq(rankTrackingKeywords.id, u.id)),
  );
}

async function getKeywordCountForConfig(configId: string) {
  const rows = await db
    .select({ value: count() })
    .from(rankTrackingKeywords)
    .where(eq(rankTrackingKeywords.configId, configId));
  return rows[0]?.value ?? 0;
}

export const RankTrackingRepository = {
  getConfigsForProject,
  getConfigById,
  getConfigByProjectDomainLocation,
  createConfig,
  updateConfig,
  getDueConfigsWithOrganization,
  claimDueConfig,
  tryCreateRun,
  updateRun,
  getRunById,
  getLatestRunForConfig,
  getActiveRunForConfig,
  insertSnapshots,
  getSnapshotsForRun,
  getKeywordsForConfig,
  addKeywordsToConfig,
  removeKeywordsFromConfig,
  updateKeywordMetrics,
  getKeywordCountForConfig,
  getKeywordCountsForConfigs,
  getConfigSummaries,
  getLatestSnapshotsForKeywords,
  getSnapshotsBeforeDate,
  getEarliestSnapshotsForKeywords,
  getKeywordHistory,
  getConfigTrend,
  getPositionMatrix,
};
