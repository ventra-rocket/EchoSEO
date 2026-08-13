import { Link } from "@tanstack/react-router";
import { ChevronRight, Play } from "lucide-react";
import type { SiteCard as SiteCardData } from "@/server/features/audit/services/SiteCardService";

/**
 * One site's crawl summary, in the shape of the dashboard card the founder asked
 * for — with Ahrefs' two estimated boxes left out rather than guessed at.
 *
 * The score is printed together with the fraction it came from. It is a defined
 * ratio (the share of crawled pages carrying no critical or high issue), not a
 * proprietary index: a reader who cannot check one number ends up not believing
 * any of them, which is what Phase 01 was about.
 *
 * A dash, never a zero, where nothing was measured. Snapshots sealed before the
 * counter columns existed carry null, and "0 broken" for a crawl that never
 * counted them is a false statement rather than an empty one.
 */
export function SiteCard({
  projectId,
  projectName,
  domain,
  card,
  isCurrent,
}: {
  projectId: string;
  projectName: string;
  domain: string | null;
  /** Null when no audit target exists yet — no audit was ever launched. */
  card: SiteCardData | null;
  isCurrent: boolean;
}) {
  const crawl = card?.crawl ?? null;
  const host = card ? hostOf(card.origin) : (domain ?? "No domain set");

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to="/p/$projectId/settings"
              params={{ projectId }}
              className="truncate font-medium hover:underline"
            >
              {projectName}
            </Link>
            {isCurrent ? (
              <span className="shrink-0 rounded-full bg-base-300 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-base-content/60">
                Current
              </span>
            ) : null}
          </div>
          <div className="truncate font-mono text-xs text-base-content/60">
            {host}
          </div>
        </div>
        {crawl ? (
          <Link
            to="/p/$projectId/audit"
            params={{ projectId }}
            className="btn btn-ghost btn-xs shrink-0 gap-1"
          >
            Report
            <ChevronRight className="size-3.5" />
          </Link>
        ) : null}
      </div>

      {crawl ? (
        <>
          <div className="mt-4 flex flex-wrap items-start gap-x-8 gap-y-4">
            <HealthBlock health={card?.health ?? null} />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <Counter label="Crawled" value={crawl.crawled} />
              <Counter label="Redirects" value={crawl.redirected} />
              <Counter label="Broken" value={crawl.broken} />
              <Counter label="Blocked" value={crawl.blocked} />
            </dl>
          </div>

          <p className="mt-4 border-t border-base-300 pt-2.5 text-xs text-base-content/60">
            Crawler EchoSEO · crawl of {formatSealedAt(crawl.sealedAt)}
            {crawl.noindex !== null && crawl.noindex > 0
              ? ` · ${crawl.noindex} page${crawl.noindex === 1 ? "" : "s"} noindex`
              : null}
          </p>
        </>
      ) : (
        <EmptyState projectId={projectId} />
      )}
    </div>
  );
}

/**
 * "Blocked" is robots.txt only. `noindex` is reported in the footer instead of
 * folded in here: Ahrefs merges them, but they have different owners and
 * different fixes, so merging would send the reader to the wrong file.
 */
function Counter({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <dt className="text-xs text-base-content/60">{label}</dt>
      <dd
        className="font-mono text-lg font-bold tabular-nums"
        title={value === null ? "Not measured on this crawl" : undefined}
      >
        {value === null ? "—" : value.toLocaleString()}
      </dd>
    </div>
  );
}

function HealthBlock({ health }: { health: SiteCardData["health"] }) {
  if (!health) {
    // A sealed crawl whose issues were never materialized. Scoring it 100 would
    // congratulate the owner for a site nobody examined.
    return (
      <div className="min-w-40">
        <div className="font-mono text-3xl font-bold tabular-nums text-base-content/40">
          —
        </div>
        <div className="text-xs text-base-content/60">
          Issues not analysed for this crawl
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-40">
      <div
        className={`font-mono text-3xl font-bold tabular-nums ${scoreTone(health.score)}`}
      >
        {health.score}
      </div>
      <div className="text-xs text-base-content/60">
        {health.score}% of pages with no critical or high issue (
        {health.pagesClean.toLocaleString()}/
        {health.pagesCrawled.toLocaleString()})
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs text-base-content/70">
        <span>{health.severity.critical} critical</span>
        <span>{health.severity.high} high</span>
        <span>{health.severity.low} low</span>
      </div>
    </div>
  );
}

function EmptyState({ projectId }: { projectId: string }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-box bg-base-200/40 px-3 py-2.5">
      <p className="text-xs text-base-content/70">
        No completed crawl yet, so there is nothing measured to show.
      </p>
      <Link
        to="/p/$projectId/audit"
        params={{ projectId }}
        className="btn btn-primary btn-xs gap-1"
      >
        <Play className="size-3" />
        Run the first audit
      </Link>
    </div>
  );
}

function scoreTone(score: number): string {
  if (score >= 90) return "text-success";
  if (score >= 70) return "text-warning";
  return "text-error";
}

/**
 * `sealed_at` is written by D1's `current_timestamp`, which is
 * `YYYY-MM-DD HH:MM:SS` in UTC with no zone marker — parsed as-is a browser would
 * read it as local time and show a crawl in the future.
 */
function formatSealedAt(sealedAt: string): string {
  const parsed = new Date(`${sealedAt.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime())
    ? sealedAt
    : parsed.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function hostOf(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}
