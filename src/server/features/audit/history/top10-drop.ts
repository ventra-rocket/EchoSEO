/**
 * Finds pages that fell out of Google's top 10 between two GSC windows.
 *
 * Pure: no database, no clock, no network — the same two inputs always produce
 * the same result. Every figure here originates from Search Console's own
 * position metric; a crawler cannot observe rank, so nothing in this file may be
 * fed crawl data.
 *
 * GSC `position` is the impression-weighted AVERAGE position over the window,
 * not a live rank, and GSC returns a row only for a page that had impressions.
 * So a page absent from the current window had zero impressions — it fell out of
 * visibility entirely — BUT ONLY when the current row set is complete. GSC
 * orders page rows by clicks and the caller caps them, so on a large property an
 * "absent" page may simply have fallen below the click cutoff while still
 * ranking. `currentComplete` gates that inference: when the row set was
 * truncated, absence proves nothing and is not reported as a drop.
 */

/** One page's GSC standing in a window; `url` is the GSC page key. */
export interface PagePosition {
  url: string;
  position: number;
  impressions: number;
}

/** The top-of-search cutoff. A page is "in the top 10" at an average position ≤ 10. */
const TOP_10_POSITION = 10;

export interface DroppedPage {
  url: string;
  /** Average position in the previous window (was ≤ 10). */
  prevPosition: number;
  /** Average position now, or null when the page has no impressions this window. */
  position: number | null;
}

export interface Top10Drop {
  /** Every page that dropped, before the display list is capped. */
  total: number;
  pages: DroppedPage[];
}

function wasInTop10(page: PagePosition): boolean {
  return page.impressions > 0 && page.position <= TOP_10_POSITION;
}

export function findPagesDroppedFromTop10(
  current: PagePosition[],
  previous: PagePosition[],
  options: { limit?: number; currentComplete?: boolean } = {},
): Top10Drop {
  const { limit = 50, currentComplete = true } = options;
  const currentByUrl = new Map(current.map((page) => [page.url, page]));

  const dropped: Array<DroppedPage & { prevImpressions: number }> = [];

  for (const before of previous) {
    if (!wasInTop10(before)) continue;

    const now = currentByUrl.get(before.url);
    const absent = !now || now.impressions === 0;
    // Present but past position 10 = slipped out, always trustworthy. Absent =
    // fell out of visibility, but only provable when the current row set is
    // complete; on a truncated set an absent page may just be below the click
    // cutoff, so it is not claimed as a drop.
    const droppedOut = absent
      ? currentComplete
      : now.position > TOP_10_POSITION;
    if (!droppedOut) continue;

    dropped.push({
      url: before.url,
      prevPosition: before.position,
      position: now && now.impressions > 0 ? now.position : null,
      prevImpressions: before.impressions,
    });
  }

  const pages = dropped
    .toSorted((a, b) => b.prevImpressions - a.prevImpressions)
    .slice(0, limit)
    .map(({ url, prevPosition, position }) => ({
      url,
      prevPosition,
      position,
    }));

  return { total: dropped.length, pages };
}
