/**
 * Read path for the shareable Free Deep report page (`/r/{id}`).
 *
 * Resolves a report id to something renderable for an anonymous bearer of the
 * link. Deliberately returns the report payload and nothing else: the lead's
 * email (and every other PII field on `leads`) never crosses this seam.
 */
import { findReportById, type ReportRow } from "./seo-reports-repository";
import { getDeepReport } from "./report-store";
import { localizeRuleText, type Locale } from "@/server/lib/seo-rules";
import type { DeepReport } from "./deep-types";

/**
 * How many `canonical_report_id` hops to follow before giving up.
 *
 * The `(domain, day)` dedupe attaches lazily, so chains are real: a 2-hop
 * R2 -> R1 -> R3 chain is reachable when R1's enqueue fails, R1 reverts and
 * releases its reservation, then loses a re-won reservation to R3. Depth is
 * bounded by same-day same-domain reservation churn, so 5 is generous; the cap
 * plus the visited set mean a malformed chain degrades instead of looping.
 */
const MAX_CANONICAL_DEPTH = 5;

export type ReportView =
  | { status: "pending"; locale: Locale }
  | { status: "failed"; message: string; locale: Locale }
  | {
      status: "done";
      report: DeepReport;
      /**
       * True when the link's own report deduped onto a different report — the
       * payload then covers whatever page of the same domain was audited that
       * day, which may not be the exact URL this visitor asked for. Surfaced so
       * the page can say so rather than quietly showing another page's result.
       */
      deduped: boolean;
      /**
       * The requester's language, from their own report row. The page chrome
       * and (via `localizeRuleText` below) the signal text render in it, even
       * when the payload deduped onto an English-canonical report.
       */
      locale: Locale;
    };

const GENERIC_FAILURE_MESSAGE = "The deep check could not be completed.";

/** Translate the persisted (English) signal text to the requester's language. */
function localizeDeepReport(report: DeepReport, locale: Locale): DeepReport {
  if (locale === "en") return report;
  return {
    ...report,
    signals: report.signals.map((signal) => localizeRuleText(signal, locale)),
    pages: report.pages.map((page) => ({
      ...page,
      signals: page.signals.map((signal) => localizeRuleText(signal, locale)),
    })),
  };
}

/**
 * Follows `canonical_report_id` to the report that actually ran. A deduped row
 * keeps its own `queued` status forever and holds no payload, so resolving to
 * the terminal root is the only way to serve it. Returns null if the chain
 * breaks (dangling id) or exceeds the depth cap.
 *
 * Exported for the report-ready email, which must answer the same question
 * ("has this visitor's report actually finished?") from a cron with no request.
 * Both callers share one resolver so the depth cap and cycle guard cannot drift
 * apart between the page and the mail.
 */
export async function resolveCanonicalRoot(
  row: ReportRow,
): Promise<ReportRow | null> {
  let current = row;
  const visited = new Set<string>([current.id]);

  for (let hop = 0; hop < MAX_CANONICAL_DEPTH; hop++) {
    const nextId = current.canonicalReportId;
    if (!nextId) return current;

    if (visited.has(nextId)) {
      console.error(
        `free-seo-check: canonical cycle at report ${current.id} -> ${nextId}`,
      );
      return null;
    }
    visited.add(nextId);

    const next = await findReportById(nextId);
    if (!next) {
      console.error(
        `free-seo-check: report ${current.id} points at missing canonical ${nextId}`,
      );
      return null;
    }
    current = next;
  }

  console.error(
    `free-seo-check: canonical chain from ${row.id} exceeded depth ${MAX_CANONICAL_DEPTH}`,
  );
  return null;
}

/**
 * Loads the renderable view for a report id, or null when no such report
 * exists (the caller maps that to a 404 — an unguessable id that misses is
 * indistinguishable from one that never existed, which is the point).
 */
export async function loadReportView(id: string): Promise<ReportView | null> {
  const requested = await findReportById(id);
  if (!requested) return null;

  // The requester's own language governs the view. The `locale` column is plain
  // text; anything that isn't a known locale falls back to English.
  const locale: Locale = requested.locale === "vi" ? "vi" : "en";

  const root = await resolveCanonicalRoot(requested);
  // A broken chain leaves the visitor's report unservable: it will never run on
  // its own and its canonical is gone. Report it as failed rather than pending
  // forever, so the page stops polling and offers a re-run.
  if (!root)
    return { status: "failed", message: GENERIC_FAILURE_MESSAGE, locale };

  if (root.status === "failed") {
    return {
      status: "failed",
      message: root.error ?? GENERIC_FAILURE_MESSAGE,
      locale,
    };
  }
  if (root.status !== "done") return { status: "pending", locale };

  const report = await getDeepReport(root.id);
  // `done` guarantees a payload (R2 is written before the D1 commit), so a miss
  // means the stores drifted — degrade instead of 500-ing an anonymous reader.
  if (!report) {
    console.error(
      `free-seo-check: report ${root.id} is done but has no payload`,
    );
    return { status: "failed", message: GENERIC_FAILURE_MESSAGE, locale };
  }

  return {
    status: "done",
    report: localizeDeepReport(report, locale),
    deduped: root.id !== requested.id,
    locale,
  };
}
