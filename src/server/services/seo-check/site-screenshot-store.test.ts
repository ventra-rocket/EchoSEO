import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
// Import direction is load-bearing: this server test may import the client's
// React-free schema module, but a client test importing this store would
// break on the `cloudflare:workers` alias.
import { parseVisualBundle } from "@/client/features/free-seo-check/filmstrip-bundle";

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

const {
  getSiteScreenshot,
  putSiteScreenshot,
  getSiteFilmstrip,
  putSiteFilmstrip,
  sweepStaleSiteScreenshots,
  SITE_FILMSTRIP_VERSION,
} = await import("./site-screenshot-store");

beforeEach(() => {
  vi.clearAllMocks();
  r2DeleteMock.mockResolvedValue(undefined);
});

describe("site screenshot store", () => {
  it("keys reads and writes by lowercased domain and strategy", async () => {
    r2GetMock.mockResolvedValue({ body: null });
    await getSiteScreenshot("Kello.Test", "desktop");
    expect(r2GetMock).toHaveBeenCalledWith(
      "site-screenshots/kello.test/desktop",
    );

    await getSiteScreenshot("Kello.Test", "mobile");
    expect(r2GetMock).toHaveBeenCalledWith(
      "site-screenshots/kello.test/mobile",
    );

    await putSiteScreenshot("Kello.Test", "mobile", {
      bytes: new Uint8Array([1]),
      contentType: "image/webp",
      width: 1,
      height: 1,
    });
    expect(r2PutMock).toHaveBeenCalledWith(
      "site-screenshots/kello.test/mobile",
      expect.any(Uint8Array),
      { httpMetadata: { contentType: "image/webp" } },
    );
  });
});

describe("site filmstrip store", () => {
  const FRAMES = [
    { data: "data:image/jpeg;base64,aGk=", timingMs: 375 },
    { data: "data:image/jpeg;base64,aGk=", timingMs: 750 },
  ];

  const LAB = {
    scores: {
      performance: 92,
      seo: 100,
      accessibility: 88,
      bestPractices: null,
    },
    coreWebVitals: { lcpMs: 1200, cls: 0.02, inpMs: 140, ttfbMs: 300 },
  };

  function lastStoredBody(): unknown {
    const stored: unknown = r2PutMock.mock.calls[0]?.[1];
    return typeof stored === "string" ? (JSON.parse(stored) as unknown) : null;
  }

  it("reads from the strategy-nested filmstrip key", async () => {
    r2GetMock.mockResolvedValue(null);
    await getSiteFilmstrip("Kello.Test", "mobile");
    expect(r2GetMock).toHaveBeenCalledWith(
      "site-screenshots/kello.test/mobile.filmstrip.json",
    );
  });

  it("stores a versioned JSON bundle with the frames and a capture time", async () => {
    await putSiteFilmstrip("Kello.Test", "desktop", FRAMES);

    expect(r2PutMock).toHaveBeenCalledWith(
      "site-screenshots/kello.test/desktop.filmstrip.json",
      expect.any(String),
      { httpMetadata: { contentType: "application/json" } },
    );

    const bundleSchema = z.object({
      version: z.number(),
      frames: z.array(z.object({ data: z.string(), timingMs: z.number() })),
      capturedAt: z.string(),
    });
    const bundle = bundleSchema.parse(lastStoredBody());
    expect(bundle.version).toBe(SITE_FILMSTRIP_VERSION);
    expect(bundle.frames).toEqual(FRAMES);
    // capturedAt must round-trip as a real timestamp, not "Invalid Date".
    expect(Number.isNaN(Date.parse(bundle.capturedAt))).toBe(false);
  });

  // The lab fields ride on version 1 as optionals: cached version-1 bundles
  // and already-shipped clients both stay valid across the deploy, so the
  // version constant must NOT move when they are present.
  it("keeps version 1 when storing lab data", async () => {
    await putSiteFilmstrip("kello.test", "mobile", FRAMES, LAB);
    const bundle = z.object({ version: z.number() }).parse(lastStoredBody());
    expect(bundle.version).toBe(1);
    expect(SITE_FILMSTRIP_VERSION).toBe(1);
  });

  it("writes a payload the client's independent schema accepts", async () => {
    // The client deliberately owns its own zod schema (it cannot import this
    // module), so nothing structural ties the two shapes together. This is the
    // contract: the exact bytes put into R2 — served verbatim by the filmstrip
    // endpoint — must parse into renderable frames on the other side.
    await putSiteFilmstrip("kello.test", "mobile", FRAMES);
    const { frames, lab } = parseVisualBundle(lastStoredBody());
    expect(frames).toEqual(FRAMES);
    // A bundle stored without lab data reads as "no lab", not as an error.
    expect(lab).toBeNull();
  });

  it("round-trips the lab fields through the client schema", async () => {
    await putSiteFilmstrip("kello.test", "mobile", FRAMES, LAB);
    const { frames, lab } = parseVisualBundle(lastStoredBody());
    expect(frames).toEqual(FRAMES);
    expect(lab?.scores).toEqual(LAB.scores);
    expect(lab?.coreWebVitals).toEqual(LAB.coreWebVitals);
    expect(lab?.capturedAt).toBeTruthy();
  });

  // A render can yield scores with no filmstrip; the stored bundle must keep
  // pre-lab clients parsing (they require a frames array) AND surface the lab
  // half to new ones.
  it("stores a frameless lab bundle both schema generations can read", async () => {
    await putSiteFilmstrip("kello.test", "mobile", null, LAB);

    const legacySchema = z.object({
      version: z.number(),
      frames: z.array(z.unknown()),
    });
    expect(legacySchema.parse(lastStoredBody()).frames).toEqual([]);

    const { frames, lab } = parseVisualBundle(lastStoredBody());
    expect(frames).toBeNull();
    expect(lab?.scores).toEqual(LAB.scores);
  });

  it("omits the CWV field when the lab block carries none", async () => {
    await putSiteFilmstrip("kello.test", "mobile", FRAMES, {
      scores: LAB.scores,
      coreWebVitals: null,
    });
    const { lab } = parseVisualBundle(lastStoredBody());
    expect(lab?.scores).toEqual(LAB.scores);
    expect(lab?.coreWebVitals).toBeNull();
  });
});

describe("sweepStaleSiteScreenshots", () => {
  const CUTOFF = new Date("2026-07-13T00:00:00.000Z");

  it("deletes only artifacts uploaded before the cutoff", async () => {
    r2ListMock.mockResolvedValue({
      objects: [
        {
          key: "site-screenshots/old.test/desktop",
          uploaded: new Date("2026-07-01"),
        },
        {
          key: "site-screenshots/new.test/desktop",
          uploaded: new Date("2026-07-19"),
        },
      ],
      truncated: false,
    });

    const purged = await sweepStaleSiteScreenshots(CUTOFF);

    expect(purged).toBe(1);
    expect(r2DeleteMock).toHaveBeenCalledWith([
      "site-screenshots/old.test/desktop",
    ]);
  });

  // The prefix predates the strategy-nested keys: one listing must cover the
  // legacy flat capture, the per-strategy captures, AND the filmstrip bundles,
  // or the shapes that escape it would accumulate forever.
  it("sweeps legacy flat keys and nested strategy/filmstrip keys alike", async () => {
    const stale = new Date("2026-07-01");
    r2ListMock.mockResolvedValue({
      objects: [
        { key: "site-screenshots/old.test", uploaded: stale },
        { key: "site-screenshots/old.test/mobile", uploaded: stale },
        {
          key: "site-screenshots/old.test/mobile.filmstrip.json",
          uploaded: stale,
        },
        {
          key: "site-screenshots/fresh.test/desktop",
          uploaded: new Date("2026-07-19"),
        },
      ],
      truncated: false,
    });

    const purged = await sweepStaleSiteScreenshots(CUTOFF);

    expect(purged).toBe(3);
    expect(r2DeleteMock).toHaveBeenCalledWith([
      "site-screenshots/old.test",
      "site-screenshots/old.test/mobile",
      "site-screenshots/old.test/mobile.filmstrip.json",
    ]);
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
        {
          key: "site-screenshots/new.test/desktop",
          uploaded: new Date("2026-07-19"),
        },
      ],
      truncated: false,
    });

    expect(await sweepStaleSiteScreenshots(CUTOFF)).toBe(0);
    expect(r2DeleteMock).not.toHaveBeenCalled();
  });
});
