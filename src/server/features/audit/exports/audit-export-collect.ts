/**
 * Page a bounded set of rows out of a paged source for an export.
 *
 * Extracted from the Workflow so the paging + truncation logic is unit-testable
 * without seeding tens of thousands of database rows. `truncated` is decided by a
 * single probe past the ceiling, so it is never a false positive at an exact
 * multiple of the page size — it is true only when a row genuinely exists beyond
 * the cap.
 */
export async function collectExportRows<T>(input: {
  fetchPage: (limit: number, offset: number) => Promise<T[]>;
  pageSize: number;
  maxRows: number;
}): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];

  for (let offset = 0; offset < input.maxRows; offset += input.pageSize) {
    const page = await input.fetchPage(input.pageSize, offset);
    rows.push(...page);
    // A short page means the source is exhausted — nothing was left behind.
    if (page.length < input.pageSize) {
      return { rows, truncated: false };
    }
  }

  // Full pages all the way to the ceiling; ask for one more row to learn whether
  // the export was actually cut short before claiming it was.
  const beyond = await input.fetchPage(1, input.maxRows);
  return { rows, truncated: beyond.length > 0 };
}
