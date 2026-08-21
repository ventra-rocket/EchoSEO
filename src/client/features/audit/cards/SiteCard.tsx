import { Link } from "@tanstack/react-router";
import { ChevronRight, Play } from "lucide-react";
import { useIntl, type IntlShape } from "react-intl";
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
  const intl = useIntl();
  const crawl = card?.crawl ?? null;
  const host = card
    ? hostOf(card.origin)
    : (domain ?? intl.formatMessage({ id: "audit.cards.noDomainSet" }));

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
                {intl.formatMessage({ id: "audit.cards.currentBadge" })}
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
            {intl.formatMessage({ id: "audit.cards.reportLink" })}
            <ChevronRight className="size-3.5" />
          </Link>
        ) : null}
      </div>

      {crawl ? (
        <>
          <div className="mt-4 flex flex-wrap items-start gap-x-8 gap-y-4">
            <HealthBlock health={card?.health ?? null} />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <Counter
                label={intl.formatMessage({
                  id: "audit.cards.counter.crawled",
                })}
                value={crawl.crawled}
              />
              <Counter
                label={intl.formatMessage({
                  id: "audit.cards.counter.redirects",
                })}
                value={crawl.redirected}
              />
              <Counter
                label={intl.formatMessage({ id: "audit.cards.counter.broken" })}
                value={crawl.broken}
              />
              <Counter
                label={intl.formatMessage({
                  id: "audit.cards.counter.blocked",
                })}
                value={crawl.blocked}
              />
            </dl>
          </div>

          <p className="mt-4 border-t border-base-300 pt-2.5 text-xs text-base-content/60">
            {intl.formatMessage(
              { id: "audit.cards.footer" },
              { date: formatSealedAt(crawl.sealedAt, intl) },
            )}
            {crawl.noindex !== null && crawl.noindex > 0
              ? intl.formatMessage(
                  { id: "audit.cards.noindexSuffix" },
                  { count: crawl.noindex },
                )
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
  const intl = useIntl();
  return (
    <div>
      <dt className="text-xs text-base-content/60">{label}</dt>
      <dd
        className="font-mono text-lg font-bold tabular-nums"
        title={
          value === null
            ? intl.formatMessage({ id: "audit.cards.notMeasuredTitle" })
            : undefined
        }
      >
        {value === null ? "—" : intl.formatNumber(value)}
      </dd>
    </div>
  );
}

function HealthBlock({ health }: { health: SiteCardData["health"] }) {
  const intl = useIntl();
  if (!health) {
    // A sealed crawl whose issues were never materialized. Scoring it 100 would
    // congratulate the owner for a site nobody examined.
    return (
      <div className="min-w-40">
        <div className="font-mono text-3xl font-bold tabular-nums text-base-content/40">
          —
        </div>
        <div className="text-xs text-base-content/60">
          {intl.formatMessage({ id: "audit.cards.health.notAnalysed" })}
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
        {intl.formatMessage(
          { id: "audit.cards.health.scoreDescription" },
          {
            score: health.score,
            clean: intl.formatNumber(health.pagesClean),
            crawled: intl.formatNumber(health.pagesCrawled),
          },
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs text-base-content/70">
        <span>
          {intl.formatMessage(
            { id: "audit.cards.health.critical" },
            { count: health.severity.critical },
          )}
        </span>
        <span>
          {intl.formatMessage(
            { id: "audit.cards.health.high" },
            { count: health.severity.high },
          )}
        </span>
        <span>
          {intl.formatMessage(
            { id: "audit.cards.health.low" },
            { count: health.severity.low },
          )}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ projectId }: { projectId: string }) {
  const intl = useIntl();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-box bg-base-200/40 px-3 py-2.5">
      <p className="text-xs text-base-content/70">
        {intl.formatMessage({ id: "audit.cards.emptyState.body" })}
      </p>
      <Link
        to="/p/$projectId/audit"
        params={{ projectId }}
        className="btn btn-primary btn-xs gap-1"
      >
        <Play className="size-3" />
        {intl.formatMessage({ id: "audit.cards.emptyState.cta" })}
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
function formatSealedAt(sealedAt: string, intl: IntlShape): string {
  const parsed = new Date(`${sealedAt.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime())
    ? sealedAt
    : intl.formatDate(parsed, { dateStyle: "medium", timeStyle: "short" });
}

function hostOf(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}
