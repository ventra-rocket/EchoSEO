import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { buildCsv, downloadCsv } from "@/client/lib/csv";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { captureClientEvent } from "@/client/lib/posthog";
import type {
  RankTrackingDeviceResult,
  RankTrackingRow,
} from "@/types/schemas/rank-tracking";

const FEATURE_SHORT_LABELS: Record<string, string> = {
  featured_snippet: "FS",
  people_also_ask: "PAA",
  ai_overview: "AI",
  local_pack: "Local",
  knowledge_panel: "KP",
  video: "Video",
  images: "Img",
  shopping: "Shop",
  top_stories: "News",
};

const FEATURE_TOOLTIPS: Record<string, string> = {
  featured_snippet:
    "Featured Snippet — highlighted answer box at top of results",
  people_also_ask: "People Also Ask — expandable related questions",
  ai_overview: "AI Overview — AI-generated summary at top of search",
  local_pack: "Local Pack — map with local business listings",
  knowledge_panel: "Knowledge Panel — info box about an entity",
  video: "Video — video results shown in the SERP",
  images: "Images — image results shown in the SERP",
  shopping: "Shopping — product listings with prices",
  top_stories: "Top Stories — news articles carousel",
};

export function SerpFeatureTags({ features }: { features: string[] }) {
  const notable = features.filter((f) => f in FEATURE_SHORT_LABELS);
  if (notable.length === 0) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {notable.map((f) => (
        <span
          key={f}
          className="badge badge-xs gap-0.5 cursor-help bg-base-300 border-0 text-base-content/70"
          title={FEATURE_TOOLTIPS[f] ?? f}
        >
          {f === "ai_overview" && <Sparkles className="size-2.5" />}
          {FEATURE_SHORT_LABELS[f]}
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
          lost
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

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function VolumeCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-base-content/40">-</span>;
  return (
    <span className="font-mono text-sm">{compactFormatter.format(value)}</span>
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
  if (value == null) return <span className="text-base-content/40">-</span>;
  return <span className="font-mono text-sm">${value.toFixed(2)}</span>;
}

/**
 * The GscCountCell tooltip for an absent keyword. Exported (not inlined) so the
 * copy is a pinned, testable contract: a `complete` read only means Google
 * named every query it was willing to — it is never proof of zero, because
 * Search Console omits anonymized (privacy-thresholded) queries from the
 * report at any read depth. Getting this wording wrong is exactly how "0"
 * turns back into a claim the read cannot support.
 */
export function gscCountTooltip(complete: boolean): string {
  return complete
    ? "Google reported nothing for this query in the window — shown as 0, though very rare queries are omitted from Search Console entirely and would look the same"
    : "Outside the queries read from Search Console — unknown, not zero";
}

/** The GscPositionCell tooltip for an absent keyword — see gscCountTooltip. */
export function gscPositionTooltip(complete: boolean): string {
  return complete
    ? "Google reported nothing for this query in the window, so there is no average position to show — very rare queries are omitted from Search Console entirely and would look the same"
    : "Outside the queries read from Search Console — no measurement available";
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
  if (value == null) {
    return (
      <span className="text-base-content/40" title={gscCountTooltip(complete)}>
        {complete ? "0" : "?"}
      </span>
    );
  }
  return (
    <span className="font-mono text-sm">{compactFormatter.format(value)}</span>
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
  if (value == null) {
    return (
      <span
        className="text-base-content/40"
        title={gscPositionTooltip(complete)}
      >
        -
      </span>
    );
  }
  return <span className="font-mono text-sm">{value.toFixed(1)}</span>;
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

export function exportRankTrackingCsv(
  sorted: RankTrackingRow[],
  showDesktop: boolean,
  showMobile: boolean,
  domain: string,
  gsc: RankTrackingGscExport | null = null,
) {
  if (sorted.length === 0) {
    toast.error("No data to export");
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
