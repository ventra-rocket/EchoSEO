/**
 * Whether a further page exists for a provider-paginated list.
 *
 * `fetchedCount` MUST be the raw provider row count for this page
 * (`response.items.length`), never the count after mapping/filtering. Callers
 * drop rows the mapper cannot use, so a full provider page that maps to fewer
 * usable rows would otherwise read as "short page" and end pagination early —
 * silently hiding every later page. Same reason `searchPerformance.ts` derives
 * `hasNextPage` from the fetched rows before slicing.
 *
 * When the provider reports `totalCount`, that is authoritative and the offset
 * advances by fetched rows. Without it, a page that came back exactly full is
 * the only signal that more may exist.
 */
export function computeHasMore(
  offset: number,
  fetchedCount: number,
  totalCount: number | null | undefined,
  pageSize: number,
): boolean {
  return totalCount != null
    ? offset + fetchedCount < totalCount
    : fetchedCount === pageSize;
}
