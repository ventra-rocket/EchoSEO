import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Info,
  Link2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  getAuditReferringDomains,
  getAuditReferringDomainsAccess,
  refreshAuditReferringDomains,
} from "@/serverFunctions/audit-referring-domains";
import type { AuditReferringDomainSignals } from "@/server/features/audit/services/AuditReferringDomainsService";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { FormattedMessage, useIntl } from "react-intl";

/**
 * Off-page referring-domain signals for this audit's target, sourced only from
 * the paid DataForSEO backlinks provider — data a crawl can never produce, so it
 * is labelled with its provider and query date and kept visually distinct from
 * the free Search Console block above it.
 *
 * The reading is stored: opening this panel never spends a credit. Only the
 * explicit "fetch" action does, and it is gated (role + plan + provider). States
 * are distinct on purpose — no snapshot yet, provider not enabled, or a real
 * reading — so an empty panel never shows a fabricated zero.
 */
export function AuditReferringDomainsPanel({
  auditId,
  projectId,
}: {
  auditId: string;
  projectId: string;
}) {
  const intl = useIntl();

  const queryClient = useQueryClient();
  const signalsKey = ["audit-referring-domains", projectId, auditId];

  const signals = useQuery({
    queryKey: signalsKey,
    queryFn: () => getAuditReferringDomains({ data: { projectId, auditId } }),
  });
  const access = useQuery({
    queryKey: ["audit-referring-domains-access", projectId, auditId],
    queryFn: () =>
      getAuditReferringDomainsAccess({ data: { projectId, auditId } }),
  });

  const refresh = useMutation({
    mutationFn: () =>
      refreshAuditReferringDomains({ data: { projectId, auditId } }),
    onSuccess: async (data) => {
      // Cancel an in-flight signals read first: one that started before this
      // refresh could otherwise resolve afterwards and overwrite the fresh
      // reading with the stale one.
      await queryClient.cancelQueries({ queryKey: signalsKey });
      queryClient.setQueryData(signalsKey, data);
    },
  });

  if (signals.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (signals.isError || !signals.data) {
    return (
      <div className="alert alert-error">
        <AlertCircle className="size-5" />
        <span>
          <FormattedMessage id="audit.search.referring.loadError" />
        </span>
      </div>
    );
  }

  const data = signals.data;

  // The trigger area has four honest outcomes, kept distinct so an owner is
  // never told to "ask an owner": the access check failed (e.g. no provider key
  // configured), it is still loading, the role genuinely cannot trigger, or the
  // caller may trigger (RefreshControl then handles provider-disabled itself).
  const triggerArea = access.isError ? (
    <Notice>
      <FormattedMessage id="audit.search.referring.accessCheckFailed" />{" "}
      {getStandardErrorMessage(
        access.error,
        intl.formatMessage({ id: "audit.search.referring.tryAgainShortly" }),
      )}
    </Notice>
  ) : !access.data ? null : !access.data.canTrigger ? (
    <Notice>
      <FormattedMessage id="audit.search.referring.cannotTrigger" />
    </Notice>
  ) : (
    <RefreshControl
      hasReading={data.state === "ready"}
      providerEnabled={access.data.providerEnabled}
      providerMessage={access.data.message}
      isPending={refresh.isPending}
      errorMessage={
        refresh.isError
          ? getStandardErrorMessage(
              refresh.error,
              intl.formatMessage({
                id: "audit.search.referring.refreshError",
              }),
            )
          : null
      }
      onConfirm={() => refresh.mutate()}
    />
  );

  if (data.state === "no_snapshot") {
    return (
      <div className="space-y-3">
        <Notice>
          <FormattedMessage id="audit.search.referring.noSnapshot" />
        </Notice>
        {triggerArea}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReadingBlock data={data} />
      <SourceLine
        provider={data.provider}
        target={data.target}
        coverage={data.coverage}
        queriedAt={data.queriedAt}
      />
      {triggerArea}
    </div>
  );
}

type ReadySignals = Extract<AuditReferringDomainSignals, { state: "ready" }>;

function ReadingBlock({ data }: { data: ReadySignals }) {
  const intl = useIntl();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric
          icon={<Link2 className="size-4" />}
          label={intl.formatMessage({
            id: "audit.search.referring.metricDomains",
          })}
          value={data.referringDomains}
        />
        <Metric
          icon={<TrendingUp className="size-4 text-success" />}
          label={intl.formatMessage({
            id: "audit.search.referring.metricNew",
          })}
          value={data.newReferringDomains}
        />
        <Metric
          icon={<TrendingDown className="size-4 text-error" />}
          label={intl.formatMessage({
            id: "audit.search.referring.metricLost",
          })}
          value={data.lostReferringDomains}
        />
      </div>
      {data.trend && <TrendLine trend={data.trend} />}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-lg border border-base-300 bg-base-200/40 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-base-content/60">
        {icon}
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums">
        {value === null ? "—" : value.toLocaleString()}
      </p>
    </div>
  );
}

function TrendLine({ trend }: { trend: ReadySignals["trend"] }) {
  if (!trend) return null;
  const deltaClass =
    trend.delta < 0
      ? "text-error"
      : trend.delta > 0
        ? "text-success"
        : "text-base-content/50";
  const sign = trend.delta > 0 ? "+" : "";
  return (
    <p className="text-sm">
      <span className={`font-medium tabular-nums ${deltaClass}`}>
        {sign}
        {trend.delta.toLocaleString()}
      </span>{" "}
      <span className="text-base-content/60">
        <FormattedMessage
          id="audit.search.referring.trendLabel"
          values={{
            from: formatDate(trend.from),
            to: formatDate(trend.to),
          }}
        />
      </span>
    </p>
  );
}

function SourceLine({
  provider,
  target,
  coverage,
  queriedAt,
}: {
  provider: string;
  target: string;
  coverage: string;
  queriedAt: string;
}) {
  return (
    <p className="text-xs text-base-content/50">
      <FormattedMessage
        id="audit.search.referring.sourceLine"
        values={{
          provider: providerLabel(provider),
          target,
          coverage,
          date: formatDate(queriedAt),
        }}
      />
    </p>
  );
}

/**
 * A deliberate two-step fetch. The first click arms the action and states that
 * it spends a credit; only a second, explicit confirm fires it. The button is
 * disabled while pending so one interaction can never double-charge.
 */
function RefreshControl({
  hasReading,
  providerEnabled,
  providerMessage,
  isPending,
  errorMessage,
  onConfirm,
}: {
  hasReading: boolean;
  providerEnabled: boolean;
  providerMessage: string | null;
  isPending: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
}) {
  const intl = useIntl();
  const [armed, setArmed] = useState(false);

  if (!providerEnabled) {
    return (
      <Notice>
        {providerMessage ??
          intl.formatMessage({
            id: "audit.search.referring.providerDisabled",
          })}
      </Notice>
    );
  }

  const label = intl.formatMessage({
    id: hasReading
      ? "audit.search.referring.refreshLabel"
      : "audit.search.referring.fetchLabel",
  });

  return (
    <div className="space-y-2">
      {armed ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-base-content/70">
            <FormattedMessage id="audit.search.referring.confirmSpend" />
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isPending}
            onClick={() => {
              setArmed(false);
              onConfirm();
            }}
          >
            {isPending && (
              <span className="loading loading-spinner loading-xs" />
            )}
            <FormattedMessage id="audit.search.referring.confirm" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={isPending}
            onClick={() => setArmed(false)}
          >
            <FormattedMessage id="audit.search.referring.cancel" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={isPending}
          onClick={() => setArmed(true)}
        >
          <RefreshCw className="size-4" />
          {intl.formatMessage(
            { id: "audit.search.referring.actionUsesCredits" },
            { label },
          )}
        </button>
      )}
      {errorMessage && (
        <div className="alert alert-error alert-sm">
          <AlertCircle className="size-4" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-base-300 bg-base-200/40 px-3 py-2 text-sm text-base-content/70">
      <Info className="size-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function providerLabel(provider: string): string {
  return provider === "dataforseo" ? "DataForSEO" : provider;
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}
