/**
 * Labels for the two crawls a comparison spans.
 *
 * A date alone is enough for the usual weekly comparison. Two crawls on the
 * same UTC day need their times too; otherwise the UI prints the same date
 * twice and names neither snapshot.
 *
 * `sealedAt` is SQLite `current_timestamp` ("YYYY-MM-DD HH:MM:SS", UTC). ISO
 * values use the same leading positions, so reading the stored fields directly
 * keeps this label consistent with the baseline selector and page-change panel.
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
  const currentDay = crawlDay(to);
  const baselineDay = crawlDay(from);

  if (currentDay !== baselineDay) {
    return { current: currentDay, baseline: baselineDay };
  }

  const currentTime = crawlTime(to);
  const baselineTime = crawlTime(from);
  if (!currentTime || !baselineTime) {
    return { current: currentDay, baseline: baselineDay };
  }

  return {
    current: `${currentDay} ${currentTime} UTC`,
    baseline: `${baselineTime} UTC`,
  };
}

/** The UTC day stored at the front of both supported timestamp shapes. */
export function crawlDay(raw: string): string {
  return raw.slice(0, 10);
}

function crawlTime(raw: string): string | null {
  const match = /^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T]([0-9]{2}:[0-9]{2})/.exec(raw);
  return match?.[1] ?? null;
}
