/**
 * The R2 delete helper the retention sweep depends on: it must chunk under R2's
 * per-call key cap and never throw, returning the keys it could not delete so the
 * sweep can log them and still remove the D1 rows.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { r2DeleteMock } = vi.hoisted(() => ({
  r2DeleteMock: vi.fn<(keys: string[]) => Promise<void>>(),
}));
vi.mock("cloudflare:workers", () => ({
  env: { R2: { delete: r2DeleteMock } },
}));

const { deleteAuditExports } = await import("./audit-export-store");

describe("deleteAuditExports", () => {
  beforeEach(() => {
    r2DeleteMock.mockReset();
    r2DeleteMock.mockResolvedValue(undefined);
  });

  it("deletes every key and reports nothing orphaned", async () => {
    const failed = await deleteAuditExports(["a.zip", "b.zip"]);
    expect(failed).toEqual([]);
    expect(r2DeleteMock).toHaveBeenCalledWith(["a.zip", "b.zip"]);
  });

  it("chunks under R2's cap and still attempts later batches when one fails", async () => {
    const keys = Array.from({ length: 1001 }, (_, i) => `k${i}.zip`);
    // The first 1000-key batch fails; the second (1 key) must still run.
    r2DeleteMock.mockRejectedValueOnce(new Error("r2 down"));

    const failed = await deleteAuditExports(keys);

    expect(r2DeleteMock).toHaveBeenCalledTimes(2);
    expect(failed).toHaveLength(1000);
    expect(failed).toContain("k0.zip");
    expect(failed).not.toContain("k1000.zip");
  });
});
