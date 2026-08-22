import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";
import type { BrandLookupResult } from "@/types/schemas/ai-search";

type Props = {
  result: BrandLookupResult;
};

/**
 * Month/year only, no day — pinned to UTC so the label never rolls to the
 * adjacent month for a reader west of Greenwich. A named, exported function
 * (not inlined in the `useMemo` below) so BrandLookupMentionTrendCard.test.ts
 * can assert the localized labels directly: recharts' `ResponsiveContainer`
 * measures 0×0 and renders nothing under `renderToStaticMarkup`, so the chart
 * itself can't be asserted on without a real browser.
 */
export function buildMentionTrendChartData(
  intl: IntlShape,
  monthlyVolume: BrandLookupResult["monthlyVolume"],
): Array<{ label: string; volume: number }> {
  return monthlyVolume.map((entry) => ({
    label: intl.formatDate(Date.UTC(entry.year, entry.month - 1, 1), {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }),
    volume: entry.volume ?? 0,
  }));
}

export function BrandLookupMentionTrendCard({ result }: Props) {
  const intl = useIntl();
  const chartData = useMemo(
    () => buildMentionTrendChartData(intl, result.monthlyVolume),
    [result.monthlyVolume, intl],
  );

  if (chartData.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-base-content/60">
        <FormattedMessage id="aiBrandLookup.mentionTrend.empty" />
      </div>
    );
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            opacity={0.12}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#888" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#888" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={<MentionTooltip />}
            cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }}
          />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="hsl(220 70% 50%)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Exported so BrandLookupMentionTrendCard.test.ts can assert the ICU plural
 * directly — recharts only mounts this on a live hover, which a static
 * server-rendered markup can't simulate. */
export function MentionTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-base-300 bg-base-100 px-3 py-2 shadow-sm">
      <p className="text-xs text-base-content/60">{label}</p>
      <p className="text-sm font-medium tabular-nums">
        <FormattedMessage
          id="aiBrandLookup.mentionTrend.tooltip"
          values={{ count: payload[0].value }}
        />
      </p>
    </div>
  );
}
