import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FormattedMessage, FormattedNumber, useIntl } from "react-intl";
import { LOCATIONS } from "@/client/features/keywords/locations";
import {
  AlertTriangle,
  Archive,
  Globe,
  Plus,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  getRankTrackingConfigSummaries,
  updateRankTrackingConfig,
} from "@/serverFunctions/rank-tracking";
import { Modal } from "@/client/components/Modal";
import type { MessageId } from "@/client/i18n/messages";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";
import {
  applyDomainListFilters,
  countActiveDomainListFilters,
  DomainListFilterBar,
  EMPTY_DOMAIN_LIST_FILTERS,
  getDomainListFilterOptions,
  type DomainListFilters,
} from "./RankTrackingFilters";

type ConfigSummary = Awaited<
  ReturnType<typeof getRankTrackingConfigSummaries>
>[number];

// Below this many domains the list is short enough to scan by eye, so the
// filter controls are more chrome than help. Still shown if filters are active
// (e.g. archiving dropped the count) so they never get orphaned.
const FILTER_BAR_MIN_DOMAINS = 6;

// The compact "location · devices · schedule" summary line (here and in
// RankTrackingDetailHeader) needs the same device/schedule wording the config
// form uses, just shorter — "Desktop" rather than "Desktop only". Duplicated
// in both files rather than shared: the lookup itself is trivial, and the
// actual translations live once in the catalog, so there is nothing to drift.
const DEVICE_SUMMARY_IDS: Record<RankTrackingConfig["devices"], MessageId> = {
  both: "rank.config.device.both",
  desktop: "rank.config.device.desktop",
  mobile: "rank.config.device.mobile",
};

const SCHEDULE_SUMMARY_IDS: Record<
  RankTrackingConfig["scheduleInterval"],
  MessageId
> = {
  daily: "rank.config.schedule.daily",
  weekly: "rank.config.schedule.weekly",
  monthly: "rank.config.schedule.monthly",
  manual: "rank.config.schedule.manual",
};

/**
 * `completed_at` is written by app code as `new Date().toISOString()` (see
 * RankCheckWorkflow / rankCheckRunGuards) — properly zoned, in principle.
 * But this column has no D1 `current_timestamp` default of its own, so
 * nothing stops a different write path (a seed script, a backfill, a future
 * migration) from writing the same zone-less `"YYYY-MM-DD HH:MM:SS"` shape
 * D1 itself defaults `started_at`/`checked_at` to — confirmed against this
 * project's own local seed data, where `completed_at` carries exactly that
 * shape. Parsing defensively here, the same way `parseAuditTimestamp`
 * (src/client/features/audit/shared.tsx) does for audit timestamps, costs
 * nothing for an already-zoned string and fixes the case where it isn't —
 * cheaper than trusting one write path forever.
 */
function parseRankCheckTimestamp(dateStr: string): Date {
  const hasZoneDesignator = /(?:Z|[+-]\d{2}:\d{2})$/.test(dateStr);
  if (hasZoneDesignator) {
    return new Date(dateStr);
  }
  return new Date(dateStr.replace(" ", "T") + "Z");
}

export function RankTrackingDomainList({
  projectId,
  onAddDomain,
}: {
  projectId: string;
  onAddDomain: () => void;
}) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [archiveTarget, setArchiveTarget] = useState<ConfigSummary | null>(
    null,
  );
  const [filters, setFilters] = useState<DomainListFilters>(
    EMPTY_DOMAIN_LIST_FILTERS,
  );
  const { data: summaries } = useQuery({
    queryKey: ["rankTrackingConfigSummaries", projectId],
    queryFn: () => getRankTrackingConfigSummaries({ data: { projectId } }),
  });
  const allSummaries = useMemo(() => summaries ?? [], [summaries]);
  const filteredSummaries = useMemo(
    () => applyDomainListFilters(allSummaries, filters),
    [allSummaries, filters],
  );
  const filterOptions = useMemo(
    () => getDomainListFilterOptions(allSummaries),
    [allSummaries],
  );
  const activeFilterCount = countActiveDomainListFilters(filters);

  const archiveMutation = useMutation({
    mutationFn: (configId: string) =>
      updateRankTrackingConfig({
        data: { projectId, configId, isActive: false },
      }),
    onSuccess: () => {
      setArchiveTarget(null);
      void queryClient.invalidateQueries({
        queryKey: ["rankTrackingConfigSummaries", projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["rankTrackingConfigs", projectId],
      });
      toast.success(
        intl.formatMessage({ id: "rank.config.domainList.archiveToast" }),
      );
    },
  });

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-0 p-0">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-sm font-semibold">
            <FormattedMessage id="rank.config.domainList.heading" />
          </h2>
          <button
            className="btn btn-primary btn-sm gap-1"
            onClick={onAddDomain}
          >
            <Plus className="size-3.5" />
            <FormattedMessage id="rank.config.action.addDomain" />
          </button>
        </div>
        {(allSummaries.length >= FILTER_BAR_MIN_DOMAINS ||
          activeFilterCount > 0) && (
          <DomainListFilterBar
            filters={filters}
            options={filterOptions}
            activeFilterCount={activeFilterCount}
            onChange={setFilters}
            onReset={() => setFilters(EMPTY_DOMAIN_LIST_FILTERS)}
          />
        )}
        <div className="divide-y divide-base-300 border-t border-base-300">
          {allSummaries.length === 0 ? (
            <div className="px-5 py-10 text-center space-y-2">
              <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-base-200">
                <Globe className="size-5 text-base-content/40" />
              </div>
              <p className="text-sm font-medium text-base-content/70">
                <FormattedMessage id="rank.config.domainList.empty.title" />
              </p>
              <p className="text-xs text-base-content/40">
                <FormattedMessage id="rank.config.domainList.empty.body" />
              </p>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="px-5 py-10 text-center space-y-3">
              <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-base-200">
                <Search className="size-5 text-base-content/40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-base-content/70">
                  <FormattedMessage id="rank.config.domainList.filterEmpty.title" />
                </p>
                <p className="text-xs text-base-content/40">
                  <FormattedMessage id="rank.config.domainList.filterEmpty.body" />
                </p>
              </div>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setFilters(EMPTY_DOMAIN_LIST_FILTERS)}
                disabled={activeFilterCount === 0}
              >
                <FormattedMessage id="rank.config.domainList.filterEmpty.clear" />
              </button>
            </div>
          ) : (
            filteredSummaries.map((summary) => (
              <DomainRow
                key={summary.id}
                projectId={projectId}
                summary={summary}
                onArchive={() => setArchiveTarget(summary)}
              />
            ))
          )}
        </div>
      </div>

      {archiveTarget && (
        <Modal
          onClose={() => setArchiveTarget(null)}
          labelledBy="archive-domain-title"
        >
          <h3 id="archive-domain-title" className="text-lg font-semibold">
            <FormattedMessage
              id="rank.config.domainList.archiveModal.title"
              values={{ domain: archiveTarget.domain }}
            />
          </h3>
          <p className="text-sm text-base-content/70">
            <FormattedMessage id="rank.config.domainList.archiveModal.body" />
          </p>
          <div className="flex justify-end gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setArchiveTarget(null)}
            >
              <FormattedMessage id="rank.config.action.cancel" />
            </button>
            <button
              className="btn btn-error btn-sm gap-1"
              onClick={() => archiveMutation.mutate(archiveTarget.id)}
              disabled={archiveMutation.isPending}
            >
              <Archive className="size-3.5" />
              <FormattedMessage id="rank.config.domainList.archiveModal.confirm" />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DomainRow({
  projectId,
  summary,
  onArchive,
}: {
  projectId: string;
  summary: ConfigSummary;
  onArchive: () => void;
}) {
  const intl = useIntl();
  return (
    <div className="relative flex w-full items-center gap-4 px-5 py-3.5 transition-colors hover:bg-base-200/50">
      <Link
        to="/p/$projectId/rank-tracking/$configId"
        params={{ projectId, configId: summary.id }}
        className="absolute inset-0 z-0"
        aria-label={intl.formatMessage(
          { id: "rank.config.domainList.row.openAria" },
          { domain: summary.domain },
        )}
      />
      <div className="min-w-0 flex-1 pointer-events-none">
        <p className="font-medium truncate">{summary.domain}</p>
        <p className="text-xs text-base-content/60">
          {LOCATIONS[summary.locationCode] ?? "US"} &middot;{" "}
          {intl.formatMessage({ id: DEVICE_SUMMARY_IDS[summary.devices] })}{" "}
          &middot;{" "}
          {intl.formatMessage({
            id: SCHEDULE_SUMMARY_IDS[summary.scheduleInterval],
          })}
          {/* An interval alone doesn't run anything — the cron reads the
              separate opt-in. Say when the schedule is only a setting. */}
          {summary.scheduleInterval !== "manual" &&
            !summary.scheduledEnabled && (
              <FormattedMessage id="rank.config.summary.paused" />
            )}
          {summary.lastRunCompletedAt && (
            <FormattedMessage
              id="rank.config.summary.lastRunSuffix"
              values={{
                date: intl.formatDate(
                  parseRankCheckTimestamp(summary.lastRunCompletedAt),
                  { dateStyle: "medium" },
                ),
              }}
            />
          )}
        </p>
        {summary.lastSkipReason === "insufficient_credits" && (
          <p className="flex items-center gap-1 text-xs text-warning">
            <AlertTriangle className="size-3" />
            <FormattedMessage id="rank.config.domainList.row.creditsSkipped" />
          </p>
        )}
      </div>
      <div className="hidden sm:flex items-center gap-6 text-sm pointer-events-none">
        {summary.keywordCount > 0 && (
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-base-content/60">
              <FormattedMessage id="rank.config.domainList.row.keywordsLabel" />
            </p>
            <p className="font-mono font-medium">
              <FormattedNumber value={summary.keywordCount} />
            </p>
          </div>
        )}
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-xs text-base-content/40 hover:text-error relative z-10"
        title={intl.formatMessage({
          id: "rank.config.domainList.row.archiveTitle",
        })}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onArchive();
        }}
      >
        <Archive className="size-4" />
      </button>
      <ChevronRight className="size-4 shrink-0 text-base-content/40 pointer-events-none" />
    </div>
  );
}
