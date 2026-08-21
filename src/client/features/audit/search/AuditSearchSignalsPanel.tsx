import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ExternalLink, Info, TrendingDown } from "lucide-react";
import { getAuditSearchSignals } from "@/serverFunctions/audit-search";
import type { AuditSearchSignals } from "@/server/features/audit/services/AuditSearchSignalsService";
import { FormattedMessage, type IntlShape, useIntl } from "react-intl";

/**
 * Search Console signals for this audit's target: organic traffic change and
 * pages that fell out of the top 10, period over period. Every figure is
 * first-party GSC data, labelled `GSC` with its window — a crawl cannot produce
 * any of it, so it is never presented as a crawl fact.
 *
 * The four states are distinct on purpose: not connected, a connected property
 * that does not cover this domain, connected-but-no-data, and real signals.
 */
export function AuditSearchSignalsPanel({
  auditId,
  projectId,
}: {
  auditId: string;
  projectId: string;
}) {
  const intl = useIntl();

  const query = useQuery({
    queryKey: ["audit-search-signals", projectId, auditId],
    queryFn: () => getAuditSearchSignals({ data: { projectId, auditId } }),
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="alert alert-error">
        <AlertCircle className="size-5" />
        <span>
          <FormattedMessage id="audit.search.signals.loadError" />
        </span>
      </div>
    );
  }

  const signals = query.data;

  if (signals.state === "not_connected") {
    return (
      <Notice>
        <FormattedMessage id="audit.search.signals.notConnected" />
      </Notice>
    );
  }

  if (signals.state === "property_mismatch") {
    return (
      <Notice>
        <FormattedMessage
          id="audit.search.signals.propertyMismatch"
          values={{
            property: signals.property,
            mono: (chunks) => <code>{chunks}</code>,
          }}
        />
      </Notice>
    );
  }

  if (signals.state === "no_data") {
    return (
      <div className="space-y-2">
        <Notice>
          <FormattedMessage
            id="audit.search.signals.noData"
            values={{ window: formatWindow(intl, signals.window.current) }}
          />
        </Notice>
        <SourceLine property={signals.property} window={signals.window} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TrafficBlock traffic={signals.traffic} />
      <Top10DropBlock drop={signals.droppedFromTop10} />
      <SourceLine property={signals.property} window={signals.window} />
    </div>
  );
}

type ReadySignals = Extract<AuditSearchSignals, { state: "ready" }>;

function TrafficBlock({ traffic }: { traffic: ReadySignals["traffic"] }) {
  const intl = useIntl();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Metric
        label={intl.formatMessage({ id: "audit.search.signals.metricClicks" })}
        value={traffic.clicks}
        delta={traffic.clicksDelta}
        previous={traffic.prevClicks}
      />
      <Metric
        label={intl.formatMessage({
          id: "audit.search.signals.metricImpressions",
        })}
        value={traffic.impressions}
        delta={traffic.impressionsDelta}
        previous={traffic.prevImpressions}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  delta,
  previous,
}: {
  label: string;
  value: number;
  delta: number;
  previous: number;
}) {
  const intl = useIntl();
  const deltaClass =
    delta < 0
      ? "text-error"
      : delta > 0
        ? "text-success"
        : "text-base-content/50";
  const sign = delta > 0 ? "+" : "";
  return (
    <div className="rounded-lg border border-base-300 bg-base-200/40 px-3 py-2.5">
      <p className="text-xs text-base-content/60">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">
        {intl.formatNumber(value)}
      </p>
      <p className={`text-xs tabular-nums ${deltaClass}`}>
        {sign}
        {intl.formatNumber(delta)}{" "}
        {intl.formatMessage(
          { id: "audit.search.signals.vsPrevious" },
          { previous: intl.formatNumber(previous) },
        )}
      </p>
    </div>
  );
}

function Top10DropBlock({ drop }: { drop: ReadySignals["droppedFromTop10"] }) {
  const intl = useIntl();

  if (drop.total === 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-base-300 bg-base-200/40 px-3 py-2 text-sm text-base-content/70">
        <Info className="size-4 shrink-0 mt-0.5" />
        <span>
          <FormattedMessage id="audit.search.signals.top10Empty" />
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-base-300 overflow-hidden">
      <header className="flex items-center gap-2 bg-base-200/50 px-3 py-2 text-sm font-medium">
        <TrendingDown className="size-4 text-warning" />
        <FormattedMessage
          id="audit.search.signals.top10Header"
          values={{ count: drop.total }}
        />
      </header>
      <ul className="divide-y divide-base-300">
        {drop.pages.map((page) => (
          <li
            key={page.url}
            className="flex items-center gap-3 px-3 py-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate">{page.url}</span>
              {page.safeUrl && (
                <a
                  href={page.safeUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="shrink-0 text-base-content/40 hover:text-base-content"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </span>
            <span className="ml-auto shrink-0 tabular-nums text-base-content/70">
              <FormattedMessage
                id="audit.search.signals.positionChange"
                values={{
                  from: page.prevPosition.toFixed(1),
                  to:
                    page.position === null
                      ? intl.formatMessage({
                          id: "audit.search.signals.notInResults",
                        })
                      : page.position.toFixed(1),
                }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceLine({
  property,
  window,
}: {
  property: string;
  window: ReadySignals["window"];
}) {
  const intl = useIntl();
  return (
    <p className="text-xs text-base-content/50">
      <FormattedMessage
        id="audit.search.signals.sourceLine"
        values={{
          property,
          current: formatWindow(intl, window.current),
          previous: formatWindow(intl, window.previous),
        }}
      />
    </p>
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

function formatWindow(
  intl: IntlShape,
  window: { from: string; to: string },
): string {
  return intl.formatMessage({ id: "audit.search.signals.windowRange" }, window);
}
