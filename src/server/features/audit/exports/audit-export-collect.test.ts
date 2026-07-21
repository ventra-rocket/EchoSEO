import { describe, expect, it, vi } from "vitest";
import { collectExportRows } from "./audit-export-collect";

/** A fake paged source over a fixed array. */
function pagedSource(total: number) {
  const all = Array.from({ length: total }, (_, i) => i);
  return vi.fn((limit: number, offset: number) =>
    Promise.resolve(all.slice(offset, offset + limit)),
  );
}

describe("collectExportRows", () => {
  it("collects every row across multiple pages when under the ceiling", async () => {
    const fetchPage = pagedSource(5);
    const { rows, truncated } = await collectExportRows({
      fetchPage,
      pageSize: 2,
      maxRows: 100,
    });
    expect(rows).toEqual([0, 1, 2, 3, 4]);
    expect(truncated).toBe(false);
  });

  it("does not report truncation at an exact multiple of the page size", async () => {
    // Exactly maxRows rows, last page full — the probe finds nothing beyond.
    const fetchPage = pagedSource(4);
    const { rows, truncated } = await collectExportRows({
      fetchPage,
      pageSize: 2,
      maxRows: 4,
    });
    expect(rows).toHaveLength(4);
    expect(truncated).toBe(false);
  });

  it("reports truncation only when a row genuinely exists beyond the ceiling", async () => {
    const fetchPage = pagedSource(5);
    const { rows, truncated } = await collectExportRows({
      fetchPage,
      pageSize: 2,
      maxRows: 4,
    });
    expect(rows).toHaveLength(4);
    expect(truncated).toBe(true);
  });
});
