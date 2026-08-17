import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
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

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatStartedAt(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// A rough time-remaining estimate for the crawl progress card. Uses the
// observed crawl rate (pages per elapsed ms), which already amortises the
// step.sleep pauses that have already happened, so it self-corrects as the
// crawl runs. Only meaningful once pages are landing against a known total;
// before that (or during discovery) it returns a soft "Estimating…" so the
// card isn't blank while the user waits.
export function buildCrawlEta(status: {
  pagesCrawled: number;
  pagesTotal: number;
  currentPhase: string | null;
  startedAt: string;
}): string | null {
  if (
    status.currentPhase === "crawling" &&
    status.pagesCrawled > 0 &&
    status.pagesTotal > status.pagesCrawled
  ) {
    // started_at is D1's `current_timestamp`: "YYYY-MM-DD HH:MM:SS" in UTC.
    const startedMs = Date.parse(`${status.startedAt.replace(" ", "T")}Z`);
    const elapsedMs = Date.now() - startedMs;
    if (Number.isFinite(startedMs) && elapsedMs > 0) {
      const remaining = status.pagesTotal - status.pagesCrawled;
      const etaMs = (elapsedMs / status.pagesCrawled) * remaining;
      const mins = Math.round(etaMs / 60_000);
      return mins >= 1
        ? `~${mins} min remaining`
        : `~${Math.max(5, Math.round(etaMs / 1_000))} sec remaining`;
    }
  }
  if (
    status.currentPhase === "discovery" ||
    (status.currentPhase === "crawling" && status.pagesCrawled === 0)
  ) {
    return "Estimating…";
  }
  return null;
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "running") {
    return (
      <span className="badge badge-info badge-sm gap-1">
        <Loader2 className="size-3 animate-spin" /> Running
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span className="badge badge-outline badge-sm gap-1 text-success/80 border-success/30 bg-success/5">
        <CheckCircle className="size-3" /> Done
      </span>
    );
  }

  return (
    <span className="badge badge-error badge-sm gap-1">
      <AlertCircle className="size-3" /> Failed
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
