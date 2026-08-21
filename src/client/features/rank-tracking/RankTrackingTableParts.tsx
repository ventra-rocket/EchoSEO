import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";
import { buildCsv, downloadCsv } from "@/client/lib/csv";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { captureClientEvent } from "@/client/lib/posthog";
import type {
  RankTrackingDeviceResult,
  RankTrackingRow,
} from "@/types/schemas/rank-tracking";

const FEATURE_SHORT_LABEL_IDS: Record<string, string> = {
  featured_snippet: "rank.table.serp.featuredSnippet.short",
  people_also_ask: "rank.table.serp.peopleAlsoAsk.short",
  ai_overview: "rank.table.serp.aiOverview.short",
  local_pack: "rank.table.serp.localPack.short",
  knowledge_panel: "rank.table.serp.knowledgePanel.short",
  video: "rank.table.serp.video.short",
  images: "rank.table.serp.images.short",
  shopping: "rank.table.serp.shopping.short",
  top_stories: "rank.table.serp.topStories.short",
};

const FEATURE_TOOLTIP_IDS: Record<string, string> = {
  featured_snippet: "rank.table.serp.featuredSnippet.tooltip",
  people_also_ask: "rank.table.serp.peopleAlsoAsk.tooltip",
  ai_overview: "rank.table.serp.aiOverview.tooltip",
  local_pack: "rank.table.serp.localPack.tooltip",
  knowledge_panel: "rank.table.serp.knowledgePanel.tooltip",
  video: "rank.table.serp.video.tooltip",
  images: "rank.table.serp.images.tooltip",
  shopping: "rank.table.serp.shopping.tooltip",
  top_stories: "rank.table.serp.topStories.tooltip",
};

export function SerpFeatureTags({ features }: { features: string[] }) {
  const intl = useIntl();
  const notable = features.filter((f) => f in FEATURE_SHORT_LABEL_IDS);
  if (notable.length === 0) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {notable.map((f) => (
        <span
          key={f}
          className="badge badge-xs gap-0.5 cursor-help bg-base-300 border-0 text-base-content/70"
          title={intl.formatMessage({ id: FEATURE_TOOLTIP_IDS[f] })}
        >
          {f === "ai_overview" && <Sparkles className="size-2.5" />}
          {intl.formatMessage({ id: FEATURE_SHORT_LABEL_IDS[f] })}
        </span>
      ))}
    </div>
  );
}

export function DeviceRankCell({
  result,
}: {
  result: RankTrackingDeviceResult;
}) {
  const { position, previousPosition } = result;

  // Nothing at all
  if (position === null && previousPosition === null) {
    return <span className="text-base-content/40">-</span>;
  }

  // Was ranking, now lost
  if (position === null && previousPosition !== null) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono text-xs text-base-content/40 w-6 text-right">
          {previousPosition}
        </span>
        <span className="text-base-content/30">→</span>
        <span className="font-mono rounded px-1.5 py-0.5 text-xs font-semibold bg-error/20 text-error">
          <FormattedMessage id="rank.table.rank.lost" />
        </span>
      </span>
    );
  }

  // First check — no previous data
  if (previousPosition === null) {
    return <span className="font-mono">{position}</span>;
  }

  // Both exist — show old → new with colored badge
  const change = previousPosition - position!;
  let badgeClass = "bg-base-200 text-base-content";
  if (change > 0) badgeClass = "bg-success/20 text-success";
  if (change < 0) badgeClass = "bg-warning/20 text-warning";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-xs text-base-content/40 w-6 text-right">
        {previousPosition}
      </span>
      <span className="text-base-content/30">→</span>
      <span
        className={`font-mono rounded px-1.5 py-0.5 text-xs font-semibold ${badgeClass}`}
      >
        {position}
      </span>
    </span>
  );
}

export function DeviceUrlCell({
  result,
  domain,
}: {
  result: RankTrackingDeviceResult;
  domain: string;
}) {
  if (!result.rankingUrl) {
    return <span className="text-base-content/40 text-xs">-</span>;
  }
  return (
    <a
      href={toFullUrl(result.rankingUrl, domain)}
      target="_blank"
      rel="noopener noreferrer"
      className="link link-hover block truncate text-xs"
      title={result.rankingUrl}
    >
      {toPath(result.rankingUrl)}
    </a>
  );
}

export function VolumeCell({ value }: { value: number | null }) {
  const intl = useIntl();
  if (value == null) return <span className="text-base-content/40">-</span>;
  return (
    <span className="font-mono text-sm">
      {intl.formatNumber(value, {
        notation: "compact",
        maximumFractionDigits: 1,
      })}
    </span>
  );
}

export function DifficultyCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-base-content/40">-</span>;
  let badgeClass = "bg-success/20 text-success";
  if (value > 60) badgeClass = "bg-error/20 text-error";
  else if (value > 30) badgeClass = "bg-warning/20 text-warning";
  return (
    <span
      className={`font-mono rounded px-1.5 py-0.5 text-xs font-semibold ${badgeClass}`}
    >
      {value}
    </span>
  );
}

export function CpcCell({ value }: { value: number | null }) {
  const intl = useIntl();
  if (value == null) return <span className="text-base-content/40">-</span>;
  return (
    <span className="font-mono text-sm">
      {intl.formatNumber(value, { style: "currency", currency: "USD" })}
    </span>
  );
}

/**
 * The GscCountCell tooltip id for an absent keyword. Exported (not inlined) so
 * which variant applies is a pinned, testable contract: a `complete` read only
 * means Google was allowed to page through the whole query set — it is never
 * proof of zero, because Search Console omits anonymized (privacy-thresholded)
 * queries from the report at any read depth. Returns a message id rather than
 * English prose — GscCountCell resolves it through react-intl, so the "must not
 * claim a proof the read cannot make" wording lives once, in the catalog, in
 * both languages, instead of being baked into this helper.
 */
export function gscCountTooltip(
  complete: boolean,
):
  | "rank.table.gsc.tooltip.countComplete"
  | "rank.table.gsc.tooltip.countTruncated" {
  return complete
    ? "rank.table.gsc.tooltip.countComplete"
    : "rank.table.gsc.tooltip.countTruncated";
}

/** The GscPositionCell tooltip id for an absent keyword — see gscCountTooltip. */
export function gscPositionTooltip(
  complete: boolean,
):
  | "rank.table.gsc.tooltip.positionComplete"
  | "rank.table.gsc.tooltip.positionTruncated" {
  return complete
    ? "rank.table.gsc.tooltip.positionComplete"
    : "rank.table.gsc.tooltip.positionTruncated";
}

/**
 * A tracked keyword with no Search Console row means one of three things, and
 * `complete` rules out only one of them: if the read was truncated, we simply
 * never looked at that query — *unknown*. If the read was complete, either
 * Google recorded no impressions for it, or the query fell below Google's
 * anonymization threshold and was left out of the report entirely — GSC never
 * says which. The cell still shows 0 for a complete read, since that is by far
 * the common case and the one this feature exists to surface, but the tooltip
 * says so rather than claiming a proof the read cannot make.
 */
export function GscCountCell({
  value,
  complete,
}: {
  value: number | null | undefined;
  complete: boolean;
}) {
  const intl = useIntl();
  if (value == null) {
    return (
      <span
        className="text-base-content/40"
        title={intl.formatMessage({ id: gscCountTooltip(complete) })}
      >
        {complete ? "0" : "?"}
      </span>
    );
  }
  return (
    <span className="font-mono text-sm">
      {intl.formatNumber(value, {
        notation: "compact",
        maximumFractionDigits: 1,
      })}
    </span>
  );
}

/** An average over the window. Never a live SERP rank, so no zero substitute. */
export function GscPositionCell({
  value,
  complete,
}: {
  value: number | null | undefined;
  complete: boolean;
}) {
  const intl = useIntl();
  if (value == null) {
    return (
      <span
        className="text-base-content/40"
        title={intl.formatMessage({ id: gscPositionTooltip(complete) })}
      >
        -
      </span>
    );
  }
  return (
    <span className="font-mono text-sm">
      {intl.formatNumber(value, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}
    </span>
  );
}

/** Numeric change for CSV export — numbers bypass the CSV formula-injection sanitizer */
export function csvChange(
  current: number | null,
  previous: number | null,
): number | string {
  if (previous === null) return current !== null ? "new" : "";
  if (current === null) return "lost";
  return previous - current;
}

/**
 * What the exported file has to say about the Search Console columns to stand
 * on its own: the window the numbers cover, and whether a keyword's absence
 * from the read is Google reporting nothing for it (written as 0) or the read
 * never reaching that query at all (left blank). A CSV travels to people who
 * never saw the table it came from.
 */
export interface RankTrackingGscExport {
  window: { from: string; to: string };
  complete: boolean;
}

// Headers and cell values below stay English/raw regardless of UI locale — a
// spreadsheet is an interchange artifact, not a translated UI surface. Matches
// src/client/features/audit/results/export.ts's PAGES_HEADERS/PERFORMANCE_HEADERS,
// which keep the same convention while their on-screen tables render Vietnamese.
export function buildRankTrackingExport(
  sorted: RankTrackingRow[],
  showDesktop: boolean,
  showMobile: boolean,
  gsc: RankTrackingGscExport | null = null,
): { headers: string[]; rows: (string | number)[][] } {
  const gscWindow = gsc ? `${gsc.window.from}..${gsc.window.to}` : "";
  const headers = [
    "Keyword",
    "Volume",
    "KD",
    "CPC",
    ...(showDesktop
      ? [
          "Desktop Position",
          "Desktop Change",
          "Desktop URL",
          "Desktop SERP Features",
        ]
      : []),
    ...(showMobile
      ? [
          "Mobile Position",
          "Mobile Change",
          "Mobile URL",
          "Mobile SERP Features",
        ]
      : []),
    ...(gsc
      ? [
          `GSC Clicks (${gscWindow})`,
          `GSC Impressions (${gscWindow})`,
          `GSC Avg Position (${gscWindow})`,
        ]
      : []),
  ];
  // Emit empty cells (not "Not ranking" strings) so Sheets infers a numeric
  // column type and the user can sort by position.
  const rows = sorted.map((row) => [
    row.keyword,
    row.searchVolume ?? "",
    row.keywordDifficulty ?? "",
    row.cpc ?? "",
    ...(showDesktop
      ? [
          row.desktop.position ?? "",
          csvChange(row.desktop.position, row.desktop.previousPosition),
          row.desktop.rankingUrl ?? "",
          row.desktop.serpFeatures.join(", "),
        ]
      : []),
    ...(showMobile
      ? [
          row.mobile.position ?? "",
          csvChange(row.mobile.position, row.mobile.previousPosition),
          row.mobile.rankingUrl ?? "",
          row.mobile.serpFeatures.join(", "),
        ]
      : []),
    // A truncated read leaves the cell empty rather than zero: the difference
    // between "Google recorded nothing" and "we never asked about this query".
    ...(gsc
      ? [
          row.gsc?.clicks ?? (gsc.complete ? 0 : ""),
          row.gsc?.impressions ?? (gsc.complete ? 0 : ""),
          row.gsc ? Number(row.gsc.position.toFixed(1)) : "",
        ]
      : []),
  ]);
  return { headers, rows };
}

export function exportRankTrackingToSheets(
  sorted: RankTrackingRow[],
  showDesktop: boolean,
  showMobile: boolean,
  gsc: RankTrackingGscExport | null = null,
) {
  const { headers, rows } = buildRankTrackingExport(
    sorted,
    showDesktop,
    showMobile,
    gsc,
  );
  void exportTableToSheets({ headers, rows, feature: "rank_tracking" });
}

export function exportRankTrackingCsv({
  sorted,
  showDesktop,
  showMobile,
  domain,
  gsc = null,
  intl,
}: {
  sorted: RankTrackingRow[];
  showDesktop: boolean;
  showMobile: boolean;
  domain: string;
  gsc?: RankTrackingGscExport | null;
  /** Only used for the "nothing to export" toast below — a plain function has
   *  no hook context of its own, so the caller's `useIntl()` result is threaded
   *  in as data rather than this file calling `useIntl()` outside a component
   *  (precedent: `getLaunchValidationErrors` in
   *  src/client/features/audit/launch/useLaunchController.ts). Headers and cell
   *  values themselves stay English/raw regardless of locale, so nothing else
   *  in this export path needs it. */
  intl: IntlShape;
}) {
  if (sorted.length === 0) {
    toast.error(intl.formatMessage({ id: "rank.table.export.noData" }));
    return;
  }
  const { headers, rows } = buildRankTrackingExport(
    sorted,
    showDesktop,
    showMobile,
    gsc,
  );
  // CSV file download keeps cents-formatted CPC for human readability;
  // clipboard/Sheets export uses raw numbers (see buildRankTrackingExport).
  const csvRows = rows.map((row) =>
    row.map((cell, idx) =>
      idx === 3 && typeof cell === "number" ? cell.toFixed(2) : cell,
    ),
  );
  downloadCsv(`rank-tracking-${domain}.csv`, buildCsv(headers, csvRows));
  captureClientEvent("rank_tracking:export_csv");
}

function toPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function toFullUrl(url: string, domain: string): string {
  if (url.startsWith("http")) return url;
  return `https://${domain}${url}`;
}
