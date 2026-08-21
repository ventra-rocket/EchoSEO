import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useIntl } from "react-intl";
import { classifyPageStatus } from "@/shared/http-status";

export function extractPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * D1 hands back `current_timestamp` as `"YYYY-MM-DD HH:MM:SS"` in **UTC** with
 * no zone marker, which `new Date(…)` reads as local time — so an audit started
 * at 06:03 UTC printed as 06:03 in Hanoi, seven hours early. Normalising here
 * keeps every audit timestamp on one parse, and callers format it through
 * `intl.formatDate`, so the rendering follows the active locale instead of a
 * hardcoded `en-US`.
 *
 * `started_at` is a plain `text` column, though, and callers outside the D1
 * default (tests, backfills) write it as a full ISO string with its own zone
 * designator (`Z` or `±HH:MM`). Appending `Z` to one of those produces
 * `"…ZZ"` or `"…+07:00Z"`, both `Invalid Date`. Only the zone-less D1 shape
 * needs the marker added; anything already zoned passes through untouched.
 */
export function parseAuditTimestamp(dateStr: string): Date {
  const hasZoneDesignator = /(?:Z|[+-]\d{2}:\d{2})$/.test(dateStr);
  if (hasZoneDesignator) {
    return new Date(dateStr);
  }
  return new Date(dateStr.replace(" ", "T") + "Z");
}

// A rough time-remaining estimate for the crawl progress card. Uses the
// observed crawl rate (pages per elapsed ms), which already amortises the
// step.sleep pauses that have already happened, so it self-corrects as the
// crawl runs. Only meaningful once pages are landing against a known total;
// before that (or during discovery) it returns a soft "estimating" state so
// the card isn't blank while the user waits. Returns a discriminated result
// instead of a formatted sentence: the caller renders it through react-intl,
// and an English sentence baked in here could not be translated.
type CrawlEta =
  | { kind: "eta"; minutes: number }
  | { kind: "eta_seconds"; seconds: number }
  | { kind: "estimating" };

export function buildCrawlEta(status: {
  pagesCrawled: number;
  pagesTotal: number;
  currentPhase: string | null;
  startedAt: string;
}): CrawlEta | null {
  if (
    status.currentPhase === "crawling" &&
    status.pagesCrawled > 0 &&
    status.pagesTotal > status.pagesCrawled
  ) {
    const startedMs = parseAuditTimestamp(status.startedAt).getTime();
    const elapsedMs = Date.now() - startedMs;
    if (Number.isFinite(startedMs) && elapsedMs > 0) {
      const remaining = status.pagesTotal - status.pagesCrawled;
      const etaMs = (elapsedMs / status.pagesCrawled) * remaining;
      const mins = Math.round(etaMs / 60_000);
      return mins >= 1
        ? { kind: "eta", minutes: mins }
        : {
            kind: "eta_seconds",
            seconds: Math.max(5, Math.round(etaMs / 1_000)),
          };
    }
  }
  if (
    status.currentPhase === "discovery" ||
    (status.currentPhase === "crawling" && status.pagesCrawled === 0)
  ) {
    return { kind: "estimating" };
  }
  return null;
}

export function StatusBadge({ status }: { status: string }) {
  const intl = useIntl();

  if (status === "running") {
    return (
      <span className="badge badge-info badge-sm gap-1">
        <Loader2 className="size-3 animate-spin" />{" "}
        {intl.formatMessage({ id: "audit.chrome.status.running" })}
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span className="badge badge-outline badge-sm gap-1 text-success/80 border-success/30 bg-success/5">
        <CheckCircle className="size-3" />{" "}
        {intl.formatMessage({ id: "audit.chrome.status.done" })}
      </span>
    );
  }

  return (
    <span className="badge badge-error badge-sm gap-1">
      <AlertCircle className="size-3" />{" "}
      {intl.formatMessage({ id: "audit.chrome.status.failed" })}
    </span>
  );
}

/**
 * Colour follows who owns the problem, not the numeric range: a 429 is our crawl
 * being rate-limited, so it reads as a warning about the reading rather than an
 * error found on the site. Same split the crawl summary and the status filter use.
 */
export function HttpStatusBadge({ code }: { code: number | null }) {
  if (!code) return <span className="badge badge-ghost badge-sm">-</span>;
  const statusClass = classifyPageStatus(code);
  if (statusClass === "ok") {
    return <span className="badge badge-success badge-sm">{code}</span>;
  }
  if (statusClass === "redirect" || statusClass === "throttled") {
    return <span className="badge badge-warning badge-sm">{code}</span>;
  }
  return <span className="badge badge-error badge-sm">{code}</span>;
}

export function LighthouseScoreBadge({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-xs text-base-content/40">-</span>;
  }
  const color =
    score >= 90 ? "text-success" : score >= 50 ? "text-warning" : "text-error";
  return <span className={`font-medium text-sm ${color}`}>{score}</span>;
}

export function StatCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body p-4">
        <p className="text-xs uppercase tracking-wide text-base-content/60">
          {label}
        </p>
        <p className={`text-2xl font-semibold ${className}`}>{value}</p>
      </div>
    </div>
  );
}
