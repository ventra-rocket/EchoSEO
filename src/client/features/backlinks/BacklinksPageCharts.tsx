import { useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";
import type { BacklinksOverviewData } from "./backlinksPageTypes";

export function BacklinksTrendChart({
  data,
}: {
  data: BacklinksOverviewData["trends"];
}) {
  const intl = useIntl();
  const { containerRef, chartWidth } = useChartWidth();

  if (data.length === 0) {
    return <EmptyChartState />;
  }

  return (
    <div
      ref={containerRef}
      className="h-56 min-w-0"
      aria-label={intl.formatMessage({
        id: "backlinksOverview.chart.trendAriaLabel",
      })}
    >
      {chartWidth > 0 ? (
        <LineChart
          width={chartWidth}
          height={224}
          data={data}
          margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            opacity={0.12}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value: unknown) => formatChartTick(intl, value)}
            minTickGap={24}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(value: unknown) => formatAxisValue(intl, value)}
            width={60}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value: unknown) => formatAxisValue(intl, value)}
            width={60}
          />
          <Tooltip
            formatter={(value: unknown) => formatTooltipValue(intl, value)}
            labelFormatter={(value: unknown) => formatChartLabel(intl, value)}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="backlinks"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            name={intl.formatMessage({
              id: "backlinksOverview.chart.legend.backlinks",
            })}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="referringDomains"
            stroke="#14b8a6"
            strokeWidth={2}
            dot={false}
            name={intl.formatMessage({
              id: "backlinksOverview.chart.legend.referringDomains",
            })}
          />
        </LineChart>
      ) : null}
    </div>
  );
}

export function BacklinksNewLostChart({
  data,
}: {
  data: BacklinksOverviewData["newLostTrends"];
}) {
  const intl = useIntl();
  const { containerRef, chartWidth } = useChartWidth();

  if (data.length === 0) {
    return <EmptyChartState />;
  }

  return (
    <div
      ref={containerRef}
      className="h-56 min-w-0"
      aria-label={intl.formatMessage({
        id: "backlinksOverview.chart.newLostAriaLabel",
      })}
    >
      {chartWidth > 0 ? (
        <LineChart
          width={chartWidth}
          height={224}
          data={data}
          margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            opacity={0.12}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value: unknown) => formatChartTick(intl, value)}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: unknown) => formatAxisValue(intl, value)}
            width={60}
          />
          <Tooltip
            formatter={(value: unknown) => formatTooltipValue(intl, value)}
            labelFormatter={(value: unknown) => formatChartLabel(intl, value)}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="lostBacklinks"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name={intl.formatMessage({
              id: "backlinksOverview.chart.legend.lostBacklinks",
            })}
          />
          <Line
            type="monotone"
            dataKey="newBacklinks"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
            name={intl.formatMessage({
              id: "backlinksOverview.chart.legend.newBacklinks",
            })}
          />
        </LineChart>
      ) : null}
    </div>
  );
}

function useChartWidth() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateWidth = () => {
      setChartWidth(container.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { containerRef, chartWidth };
}

function EmptyChartState() {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-base-300 text-sm text-base-content/55">
      <FormattedMessage id="backlinksOverview.chart.empty" />
    </div>
  );
}

function formatAxisValue(intl: IntlShape, value: unknown) {
  if (typeof value !== "number") return "";
  return intl.formatNumber(value, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

function formatChartTick(intl: IntlShape, value: unknown) {
  return typeof value === "string" ? formatMonthTick(intl, value) : "";
}

function formatChartLabel(intl: IntlShape, value: unknown) {
  return typeof value === "string" ? formatDateLabel(intl, value) : "";
}

function formatTooltipValue(intl: IntlShape, value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return intl.formatNumber(value);
  if (typeof value === "string") return value;
  return "-";
}

function formatMonthTick(intl: IntlShape, value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return intl.formatDate(parsed, { month: "short", year: "2-digit" });
}

function formatDateLabel(intl: IntlShape, value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return intl.formatDate(parsed, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
