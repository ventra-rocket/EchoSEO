import { Info } from "lucide-react";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";
import { BrandLookupMentionTrendCard } from "@/client/features/ai-search/components/BrandLookupMentionTrendCard";
import { BrandLookupShareOfVoice } from "@/client/features/ai-search/components/BrandLookupShareOfVoice";
import { CitationTabsCard } from "@/client/features/ai-search/components/BrandLookupCitationsCard";
import {
  formatPlatformLabel,
  PLATFORM_DOT_CLASS,
} from "@/client/features/ai-search/platformLabels";
import type { BrandLookupResult } from "@/types/schemas/ai-search";

type Props = {
  result: BrandLookupResult;
  projectId: string;
};

type PlatformRow = BrandLookupResult["perPlatform"][number];
type MetricKey = "mentions" | "aiSearchVolume";

const TARGET_TYPE_LABEL_ID: Record<
  BrandLookupResult["detectedTargetType"],
  MessageId
> = {
  domain: "aiBrandLookup.results.targetType.domain",
  keyword: "aiBrandLookup.results.targetType.keyword",
};

export function BrandLookupResults({ result, projectId }: Props) {
  const intl = useIntl();

  if (!result.hasData) {
    const erroredPlatforms = result.perPlatform.filter(
      (p) => p.status === "error",
    );
    const allPlatformsErrored =
      erroredPlatforms.length === result.perPlatform.length &&
      result.perPlatform.length > 0;

    if (allPlatformsErrored) {
      return (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
          <FormattedMessage
            id="aiBrandLookup.results.allPlatformsUnavailable"
            values={{ target: <strong>{result.resolvedTarget}</strong> }}
          />
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-info/30 bg-info/10 p-4 text-sm">
          <FormattedMessage
            id="aiBrandLookup.results.noMentionsFound"
            values={{ target: <strong>{result.resolvedTarget}</strong> }}
          />
        </div>
        {erroredPlatforms.length > 0 ? (
          <p className="text-xs text-base-content/60">
            <FormattedMessage
              id="aiBrandLookup.results.platformsUnavailableNote"
              values={{
                platforms: intl.formatList(
                  erroredPlatforms.map((p) => formatPlatformLabel(p.platform)),
                ),
                count: erroredPlatforms.length,
              }}
            />
          </p>
        ) : null}
      </div>
    );
  }

  const hasTrendData = result.monthlyVolume.length > 0;
  const sov = result.shareOfVoice;

  return (
    <div className="space-y-4">
      <BrandHeader result={result} />

      {/* One shared grid so the cards align by construction: stats left, trend
          right, Share of Voice flowing into the next free half-width cell —
          whichever of trend/SoV is absent, the rest stay column-aligned. A
          lone stats card keeps full width instead of half a grid. */}
      <div
        className={
          hasTrendData || sov ? "grid gap-4 lg:grid-cols-2" : undefined
        }
      >
        <StatsCard result={result} />
        {hasTrendData ? <MentionTrendCard result={result} /> : null}
        {sov ? <BrandLookupShareOfVoice shareOfVoice={sov} /> : null}
      </div>

      <CitationTabsCard result={result} projectId={projectId} />
    </div>
  );
}

function BrandHeader({ result }: { result: BrandLookupResult }) {
  const intl = useIntl();
  return (
    <section className="flex flex-wrap items-baseline justify-between gap-2">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-3xl font-semibold tracking-tight">
          {result.resolvedTarget}
        </h2>
        <span className="badge badge-ghost badge-sm">
          <FormattedMessage
            id={TARGET_TYPE_LABEL_ID[result.detectedTargetType]}
          />
        </span>
      </div>
      <p className="text-xs text-base-content/50">
        <FormattedMessage
          id="aiBrandLookup.results.updated"
          values={{ relative: formatRelativeUpdated(intl, result.fetchedAt) }}
        />
      </p>
    </section>
  );
}

function StatsCard({ result }: { result: BrandLookupResult }) {
  return (
    <section className="rounded-xl border border-base-300 bg-base-100">
      <div className="flex h-full flex-col divide-y divide-base-200">
        <StatBlock
          labelId="aiBrandLookup.results.stat.mentions.label"
          tooltipId="aiBrandLookup.results.stat.mentions.tooltip"
          value={result.totalMentions}
          perPlatform={result.perPlatform}
          metric="mentions"
        />
        <StatBlock
          labelId="aiBrandLookup.results.stat.aiSearchVolume.label"
          tooltipId="aiBrandLookup.results.stat.aiSearchVolume.tooltip"
          value={result.totalAiSearchVolume}
          perPlatform={result.perPlatform}
          metric="aiSearchVolume"
        />
      </div>
    </section>
  );
}

function StatBlock({
  labelId,
  tooltipId,
  value,
  perPlatform,
  metric,
}: {
  labelId: MessageId;
  tooltipId: MessageId;
  value: number | null;
  perPlatform: PlatformRow[];
  metric: MetricKey;
}) {
  const intl = useIntl();
  return (
    <div className="flex flex-1 flex-col justify-center p-4">
      <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-base-content/50">
        <FormattedMessage id={labelId} />
        <span
          className="tooltip inline-flex normal-case"
          data-tip={intl.formatMessage({ id: tooltipId })}
        >
          <Info className="size-3 text-base-content/40" />
        </span>
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">
        {value == null ? "—" : intl.formatNumber(value)}
      </p>
      <div className="mt-3 space-y-1 border-t border-base-200 pt-2.5">
        {perPlatform.map((row) => (
          <PlatformStatRow key={row.platform} row={row} metric={metric} />
        ))}
      </div>
    </div>
  );
}

function PlatformStatRow({
  row,
  metric,
}: {
  row: PlatformRow;
  metric: MetricKey;
}) {
  const intl = useIntl();
  const value = row.status === "error" ? null : row[metric];

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="inline-flex items-center gap-1.5 text-base-content/70">
        <span
          className={`size-1.5 rounded-full ${PLATFORM_DOT_CLASS[row.platform]}`}
        />
        {formatPlatformLabel(row.platform)}
        {row.platform === "chat_gpt" ? (
          <span
            className="tooltip z-20 inline-flex"
            data-tip={intl.formatMessage({
              id: "aiBrandLookup.results.chatGptCountryTooltip",
            })}
          >
            <Info className="size-3 text-base-content/40" />
          </span>
        ) : null}
        {row.status === "error" ? (
          <span className="text-error">
            <FormattedMessage id="aiBrandLookup.results.platformUnavailable" />
          </span>
        ) : null}
      </span>
      <span className="font-medium tabular-nums text-base-content/90">
        {value == null ? "—" : intl.formatNumber(value)}
      </span>
    </div>
  );
}

function MentionTrendCard({ result }: { result: BrandLookupResult }) {
  return (
    <section className="overflow-hidden rounded-xl border border-base-300 bg-base-100">
      <div className="border-b border-base-300 px-4 py-3">
        <h3 className="text-sm font-semibold">
          <FormattedMessage id="aiBrandLookup.results.mentionTrend.title" />
        </h3>
      </div>
      <div className="p-4">
        <BrandLookupMentionTrendCard result={result} />
      </div>
    </section>
  );
}

/**
 * "Updated {relative}"'s value, through IntlShape end to end: native
 * `Intl.RelativeTimeFormat` (via `formatRelativeTime`) for the common case,
 * a message id for the one input it can't format — an unparseable date.
 * Exported so BrandLookupResults.test.ts can assert every threshold branch
 * directly instead of racing `Date.now()` through a full render.
 */
export function formatRelativeUpdated(intl: IntlShape, iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return intl.formatMessage({ id: "aiBrandLookup.results.updatedFallback" });
  }

  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  const relativeOpts = { numeric: "auto" } as const;
  if (diffMin < 1) return intl.formatRelativeTime(0, "second", relativeOpts);
  if (diffMin < 60) {
    return intl.formatRelativeTime(-diffMin, "minute", relativeOpts);
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)
    return intl.formatRelativeTime(-diffHr, "hour", relativeOpts);
  const diffDay = Math.floor(diffHr / 24);
  return intl.formatRelativeTime(-diffDay, "day", relativeOpts);
}
