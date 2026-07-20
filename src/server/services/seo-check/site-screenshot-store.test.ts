import { beforeEach, describe, expect, it, vi } from "vitest";

const { r2GetMock, r2PutMock, r2ListMock, r2DeleteMock } = vi.hoisted(() => ({
  r2GetMock: vi.fn(),
  r2PutMock: vi.fn(),
  r2ListMock: vi.fn(),
  r2DeleteMock: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    R2: {
      get: r2GetMock,
      put: r2PutMock,
      list: r2ListMock,
      delete: r2DeleteMock,
    },
  },
}));

const { getSiteScreenshot, putSiteScreenshot, sweepStaleSiteScreenshots } =
  await import("./site-screenshot-store");

beforeEach(() => {
  vi.clearAllMocks();
  r2DeleteMock.mockResolvedValue(undefined);
});

describe("site screenshot store", () => {
  it("keys reads and writes by lowercased domain", async () => {
    r2GetMock.mockResolvedValue({ body: null });
    await getSiteScreenshot("Kello.Test");
    expect(r2GetMock).toHaveBeenCalledWith("site-screenshots/kello.test");

    await putSiteScreenshot("Kello.Test", {
      bytes: new Uint8Array([1]),
      contentType: "image/webp",
      width: 1,
      height: 1,
    });
    expect(r2PutMock).toHaveBeenCalledWith(
      "site-screenshots/kello.test",
      expect.any(Uint8Array),
      { httpMetadata: { contentType: "image/webp" } },
    );
  });
});

describe("sweepStaleSiteScreenshots", () => {
  const CUTOFF = new Date("2026-07-13T00:00:00.000Z");

  it("deletes only captures uploaded before the cutoff", async () => {
    r2ListMock.mockResolvedValue({
      objects: [
        { key: "site-screenshots/old.test", uploaded: new Date("2026-07-01") },
        { key: "site-screenshots/new.test", uploaded: new Date("2026-07-19") },
      ],
      truncated: false,
    });

    const purged = await sweepStaleSiteScreenshots(CUTOFF);

    expect(purged).toBe(1);
    expect(r2DeleteMock).toHaveBeenCalledWith(["site-screenshots/old.test"]);
  });

  it("follows the list cursor to the end", async () => {
    r2ListMock
      .mockResolvedValueOnce({
        objects: [
          { key: "site-screenshots/a", uploaded: new Date("2026-07-01") },
        ],
        truncated: true,
        cursor: "next",
      })
      .mockResolvedValueOnce({
        objects: [
          { key: "site-screenshots/b", uploaded: new Date("2026-07-02") },
        ],
        truncated: false,
      });

    const purged = await sweepStaleSiteScreenshots(CUTOFF);

    expect(purged).toBe(2);
    expect(r2ListMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "next" }),
    );
  });

  it("makes no delete call when nothing is stale", async () => {
    r2ListMock.mockResolvedValue({
      objects: [
        { key: "site-screenshots/new.test", uploaded: new Date("2026-07-19") },
      ],
      truncated: false,
    });

    expect(await sweepStaleSiteScreenshots(CUTOFF)).toBe(0);
    expect(r2DeleteMock).not.toHaveBeenCalled();
  });
});
