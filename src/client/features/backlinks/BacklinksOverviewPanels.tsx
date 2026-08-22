import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";
import { HeaderHelpLabel } from "@/client/features/keywords/components";
import {
  BacklinksNewLostChart,
  BacklinksTrendChart,
} from "./BacklinksPageCharts";
import type { BacklinksOverviewData } from "./backlinksPageTypes";

type SummaryStat = {
  id: string;
  label: string;
  value: string;
  description: string;
};

type SummaryStatPrecision = "integer" | "decimal";

type SummaryStatDef = {
  id: string;
  labelId: MessageId;
  descriptionId: MessageId;
  precision: SummaryStatPrecision;
  value: (summary: BacklinksOverviewData["summary"]) => number | null;
};

// Labels/descriptions/precision for each summary card. Values come straight
// off `data.summary`; formatting and the message catalog live here rather
// than in backlinksPageUtils.ts's buildSummaryStats so every displayed word
// goes through the active IntlShape instead of a hardcoded English string.
const SUMMARY_STAT_DEFS: SummaryStatDef[] = [
  {
    id: "backlinks",
    labelId: "backlinksOverview.summary.backlinks.label",
    descriptionId: "backlinksOverview.summary.backlinks.description",
    precision: "integer",
    value: (summary) => summary.backlinks,
  },
  {
    id: "referringDomains",
    labelId: "backlinksOverview.summary.referringDomains.label",
    descriptionId: "backlinksOverview.summary.referringDomains.description",
    precision: "integer",
    value: (summary) => summary.referringDomains,
  },
  {
    id: "referringPages",
    labelId: "backlinksOverview.summary.referringPages.label",
    descriptionId: "backlinksOverview.summary.referringPages.description",
    precision: "integer",
    value: (summary) => summary.referringPages,
  },
  {
    id: "rank",
    labelId: "backlinksOverview.summary.rank.label",
    descriptionId: "backlinksOverview.summary.rank.description",
    precision: "integer",
    value: (summary) => summary.rank,
  },
  {
    id: "backlinksSpamScore",
    labelId: "backlinksOverview.summary.backlinksSpamScore.label",
    descriptionId: "backlinksOverview.summary.backlinksSpamScore.description",
    precision: "decimal",
    value: (summary) => summary.backlinksSpamScore,
  },
  {
    id: "brokenBacklinks",
    labelId: "backlinksOverview.summary.brokenBacklinks.label",
    descriptionId: "backlinksOverview.summary.brokenBacklinks.description",
    precision: "integer",
    value: (summary) => summary.brokenBacklinks,
  },
  {
    id: "brokenPages",
    labelId: "backlinksOverview.summary.brokenPages.label",
    descriptionId: "backlinksOverview.summary.brokenPages.description",
    precision: "integer",
    value: (summary) => summary.brokenPages,
  },
  {
    id: "targetSpamScore",
    labelId: "backlinksOverview.summary.targetSpamScore.label",
    descriptionId: "backlinksOverview.summary.targetSpamScore.description",
    precision: "decimal",
    value: (summary) => summary.targetSpamScore,
  },
];

/** Mirrors the old formatNumber (rounded, grouped) / formatDecimal (0 or 1
 * fraction digit past 100) precision rules, through IntlShape instead of a
 * bare Intl.NumberFormat/toFixed call so the grouping and decimal separator
 * follow the active locale. */
function formatSummaryValue(
  intl: IntlShape,
  value: number | null,
  precision: SummaryStatPrecision,
): string {
  if (value == null) return "-";
  if (precision === "integer") return intl.formatNumber(Math.round(value));
  const fractionDigits = value >= 100 ? 0 : 1;
  return intl.formatNumber(value, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function buildOverviewSummaryStats(
  intl: IntlShape,
  data: BacklinksOverviewData,
): SummaryStat[] {
  return SUMMARY_STAT_DEFS.map((def) => ({
    id: def.id,
    label: intl.formatMessage({ id: def.labelId }),
    description: intl.formatMessage({ id: def.descriptionId }),
    value: formatSummaryValue(intl, def.value(data.summary), def.precision),
  }));
}

/** formatRelativeTimestamp's un-parseable-date fallback, through IntlShape. */
function formatUpdatedAt(intl: IntlShape, value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return intl.formatMessage({
      id: "backlinksOverview.overview.updatedFallback",
    });
  }
  return intl.formatDate(parsed, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BacklinksOverviewPanels({
  projectId,
  data,
}: {
  projectId: string;
  data: BacklinksOverviewData;
}) {
  const intl = useIntl();
  const summaryStats = useMemo(
    () => buildOverviewSummaryStats(intl, data),
    [intl, data],
  );

  return (
    <>
      <div>
        <Link
          to="/p/$projectId/backlinks"
          params={{ projectId }}
          search={{
            target: undefined,
            scope: undefined,
            tab: undefined,
            page: undefined,
            size: undefined,
            sort: undefined,
            order: undefined,
          }}
          replace
          className="btn btn-ghost btn-sm gap-2 px-0 text-base-content/70 hover:bg-transparent"
        >
          <ArrowLeft className="size-4" />
          <FormattedMessage id="backlinksOverview.nav.recentSearches" />
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-base-content/65">
        <span className="badge badge-outline">
          <FormattedMessage
            id={
              data.scope === "domain"
                ? "backlinksOverview.scope.domain"
                : "backlinksOverview.scope.page"
            }
          />
        </span>
        <span>
          <FormattedMessage
            id="backlinksOverview.overview.target"
            values={{ target: data.displayTarget }}
          />
        </span>
        <span>-</span>
        <span>
          <FormattedMessage
            id="backlinksOverview.overview.updated"
            values={{ date: formatUpdatedAt(intl, data.fetchedAt) }}
          />
        </span>
      </div>
      <OverviewGrid data={data} summaryStats={summaryStats} />
      {data.scope === "page" ? (
        <div className="alert alert-info">
          <span>
            <FormattedMessage id="backlinksOverview.overview.pageScopeNotice" />
          </span>
        </div>
      ) : null}
    </>
  );
}

function OverviewGrid({
  data,
  summaryStats,
}: {
  data: BacklinksOverviewData;
  summaryStats: SummaryStat[];
}) {
  const domainScope = data.scope === "domain";

  return (
    <div
      className={`grid grid-cols-1 gap-3 ${domainScope ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}
    >
      <SummaryStatsGrid data={data} summaryStats={summaryStats} />
      {domainScope ? <TrendPanels data={data} /> : null}
    </div>
  );
}

function SummaryStatsGrid({
  data,
  summaryStats,
}: {
  data: BacklinksOverviewData;
  summaryStats: SummaryStat[];
}) {
  const cardClassName = `card bg-base-100 border border-base-300 ${data.scope === "domain" ? "md:col-span-2 xl:col-span-1" : ""}`;

  return (
    <div className={cardClassName}>
      <div className="card-body p-4 xl:h-full">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 xl:gap-y-6">
          {summaryStats.map((item) => (
            <div key={item.id}>
              <div className="text-xs uppercase tracking-wide text-base-content/55">
                <HeaderHelpLabel
                  label={item.label}
                  helpText={item.description}
                />
              </div>
              <p className="text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrendPanels({ data }: { data: BacklinksOverviewData }) {
  const intl = useIntl();

  return (
    <>
      <TrendCard
        title={intl.formatMessage({
          id: "backlinksOverview.chart.growth.title",
        })}
        description={intl.formatMessage({
          id: "backlinksOverview.chart.growth.description",
        })}
      >
        <BacklinksTrendChart data={data.trends} />
      </TrendCard>
      <TrendCard
        title={intl.formatMessage({
          id: "backlinksOverview.chart.newVsLost.title",
        })}
        description={intl.formatMessage({
          id: "backlinksOverview.chart.newVsLost.description",
        })}
      >
        <BacklinksNewLostChart data={data.newLostTrends} />
      </TrendCard>
    </>
  );
}

function TrendCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-2 p-4">
        <div>
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="text-xs text-base-content/55">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
