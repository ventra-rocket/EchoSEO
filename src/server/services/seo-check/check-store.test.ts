import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LiteReport } from "./types";

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

const { getLiteCheckSnapshot, putLiteCheckSnapshot, sweepStaleLiteChecks } =
  await import("./check-store");

const CHECK_ID = "0b6d3a1e-4f2c-4d5b-9a7e-1c2d3e4f5a6b";

const REPORT: LiteReport = {
  requestedUrl: "example.test",
  finalUrl: "https://example.test/",
  statusCode: 200,
  fetchedAt: "2026-08-01T00:00:00.000Z",
  overallScore: 90,
  categoryScores: [],
  signals: [],
  pageSummary: { title: "t", metaDescription: "", h1: null, wordCount: 10 },
  deepTeaser: { coreWebVitalsMetricCount: 4 },
};

/** Simulates what an R2 get returns for the given stored string. */
function storedObject(body: string) {
  return { text: async () => body };
}

beforeEach(() => {
  vi.clearAllMocks();
  r2PutMock.mockResolvedValue(undefined);
  r2DeleteMock.mockResolvedValue(undefined);
});

describe("lite check snapshot store", () => {
  it("round-trips a snapshot through the R2 codec", async () => {
    // Capture what would land in R2 with typed parameters, so the read half of
    // the test exercises the exact bytes the write half produced.
    let storedBody = "";
    r2PutMock.mockImplementation(async (_key: string, body: string) => {
      storedBody = body;
    });

    await putLiteCheckSnapshot(CHECK_ID, REPORT, "vi", "2026-08-03T10:00:00Z");

    expect(r2PutMock).toHaveBeenCalledWith(
      `lite-checks/${CHECK_ID}.json`,
      expect.any(String),
      { httpMetadata: { contentType: "application/json" } },
    );

    r2GetMock.mockResolvedValue(storedObject(storedBody));

    const snapshot = await getLiteCheckSnapshot(CHECK_ID);
    expect(snapshot).toEqual({
      report: REPORT,
      locale: "vi",
      createdAt: "2026-08-03T10:00:00Z",
    });
  });

  it("returns null for a missing object", async () => {
    r2GetMock.mockResolvedValue(null);
    expect(await getLiteCheckSnapshot(CHECK_ID)).toBeNull();
  });

  it("returns null for a corrupt envelope rather than throwing", async () => {
    r2GetMock.mockResolvedValue(storedObject("{not json"));
    expect(await getLiteCheckSnapshot(CHECK_ID)).toBeNull();
  });

  it("returns null when the embedded report fails the report contract", async () => {
    // A valid envelope around an invalid report — the inner codec is the same
    // validator the KV cache uses, so schema drift 404s instead of rendering.
    r2GetMock.mockResolvedValue(
      storedObject(
        JSON.stringify({
          version: 1,
          locale: "en",
          createdAt: "2026-08-03T10:00:00Z",
          report: JSON.stringify({ overallScore: "ninety" }),
        }),
      ),
    );
    expect(await getLiteCheckSnapshot(CHECK_ID)).toBeNull();
  });

  it("returns null for an unknown envelope version", async () => {
    r2GetMock.mockResolvedValue(
      storedObject(
        JSON.stringify({
          version: 2,
          locale: "en",
          createdAt: "2026-08-03T10:00:00Z",
          report: JSON.stringify(REPORT),
        }),
      ),
    );
    expect(await getLiteCheckSnapshot(CHECK_ID)).toBeNull();
  });
});

describe("sweepStaleLiteChecks", () => {
  const CUTOFF = new Date("2026-07-13T00:00:00.000Z");

  it("deletes only snapshots uploaded before the cutoff", async () => {
    r2ListMock.mockResolvedValue({
      objects: [
        { key: "lite-checks/old.json", uploaded: new Date("2026-07-01") },
        { key: "lite-checks/new.json", uploaded: new Date("2026-07-19") },
      ],
      truncated: false,
    });

    const purged = await sweepStaleLiteChecks(CUTOFF);

    expect(purged).toBe(1);
    expect(r2DeleteMock).toHaveBeenCalledWith(["lite-checks/old.json"]);
  });

  it("follows the list cursor to the end", async () => {
    r2ListMock
      .mockResolvedValueOnce({
        objects: [{ key: "lite-checks/a", uploaded: new Date("2026-07-01") }],
        truncated: true,
        cursor: "next",
      })
      .mockResolvedValueOnce({
        objects: [{ key: "lite-checks/b", uploaded: new Date("2026-07-02") }],
        truncated: false,
      });

    const purged = await sweepStaleLiteChecks(CUTOFF);

    expect(purged).toBe(2);
    expect(r2ListMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "next" }),
    );
  });

  it("makes no delete call when nothing is stale", async () => {
    r2ListMock.mockResolvedValue({
      objects: [
        { key: "lite-checks/new.json", uploaded: new Date("2026-07-19") },
      ],
      truncated: false,
    });

    expect(await sweepStaleLiteChecks(CUTOFF)).toBe(0);
    expect(r2DeleteMock).not.toHaveBeenCalled();
  });
});
