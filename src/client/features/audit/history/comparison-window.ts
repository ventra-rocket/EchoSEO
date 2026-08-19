/**
 * Labels for the two crawls a comparison spans.
 *
 * A day alone is enough for the usual case — a weekly re-crawl against last
 * week's — but two crawls of the same site on the same day print the same date
 * twice and the reader cannot tell which snapshot is which. A same-day window
 * therefore carries the clock time, which is the only thing that separates them.
 *
 * `sealedAt` reaches us as SQLite's `current_timestamp` ("YYYY-MM-DD HH:MM:SS",
 * always UTC) and, on ISO-valued columns, as an ISO string. Both are normalized
 * to an explicit UTC instant before formatting, so the time shown is the
 * reader's own — never the server's clock relabelled as local.
 */
type ComparisonWindowLabels = {
  /** The crawl being viewed. */
  current: string;
  /** The baseline it is measured against. */
  baseline: string;
};

export function describeComparisonWindow({
  from,
  to,
}: {
  from: string;
  to: string;
}): ComparisonWindowLabels {
  const baselineAt = toInstant(from);
  const currentAt = toInstant(to);

  if (!baselineAt || !currentAt) {
    // Unparseable timestamps still name their day: the label degrades to what
    // it printed before rather than to an empty or "Invalid Date" string.
    return { current: day(to), baseline: day(from) };
  }

  const currentDay = localDay(currentAt);
  const baselineDay = localDay(baselineAt);

  if (currentDay !== baselineDay) {
    return { current: currentDay, baseline: baselineDay };
  }

  return {
    current: `${currentDay} ${clock(currentAt)}`,
    baseline: clock(baselineAt),
  };
}

/**
 * The day a single crawl belongs to, in the reader's zone. Used where only one
 * timestamp is named and there is nothing to disambiguate it from.
 */
export function crawlDay(raw: string): string {
  const at = toInstant(raw);
  return at ? localDay(at) : day(raw);
}

function toInstant(raw: string): Date | null {
  // "YYYY-MM-DD HH:MM:SS" is UTC but has no marker, and engines are free to
  // read it as local time. Naming the zone makes the parse deterministic.
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function localDay(at: Date): string {
  const year = at.getFullYear();
  const month = `${at.getMonth() + 1}`.padStart(2, "0");
  const date = `${at.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function clock(at: Date): string {
  return at.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The leading date of either timestamp shape, used only when parsing fails. */
function day(raw: string): string {
  return raw.slice(0, 10);
}
