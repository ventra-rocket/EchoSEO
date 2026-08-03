import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractFilmstrip,
  extractScreenshot,
  fetchPageSpeed,
  PsiRequestError,
  shapePsiResult,
} from "./pagespeed";

describe("shapePsiResult", () => {
  it("prefers real-user field data and scales CrUX CLS", () => {
    const result = shapePsiResult({
      loadingExperience: {
        metrics: {
          LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2100 },
          CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 12 },
          INTERACTION_TO_NEXT_PAINT: { percentile: 180 },
          EXPERIMENTAL_TIME_TO_FIRST_BYTE: { percentile: 600 },
        },
      },
      lighthouseResult: {
        categories: { performance: { score: 0.92 } },
        audits: { "largest-contentful-paint": { numericValue: 9999 } },
      },
    });

    expect(result.cwvSource).toBe("field");
    expect(result.coreWebVitals).toEqual({
      lcpMs: 2100,
      cls: 0.12,
      inpMs: 180,
      ttfbMs: 600,
    });
    expect(result.scores.performance).toBe(92);
  });

  it("falls back to lab metrics and uses TBT as the INP proxy", () => {
    const result = shapePsiResult({
      lighthouseResult: {
        categories: {
          performance: { score: 0.5 },
          seo: { score: 1 },
          accessibility: { score: null },
        },
        audits: {
          "largest-contentful-paint": { numericValue: 3200 },
          "cumulative-layout-shift": { numericValue: 0.05 },
          "total-blocking-time": { numericValue: 340 },
          "server-response-time": { numericValue: 700 },
        },
      },
    });

    expect(result.cwvSource).toBe("lab");
    expect(result.coreWebVitals).toEqual({
      lcpMs: 3200,
      cls: 0.05,
      inpMs: 340,
      ttfbMs: 700,
    });
    expect(result.scores).toEqual({
      performance: 50,
      seo: 100,
      accessibility: null,
      bestPractices: null,
    });
  });

  it("prefers a real lab INP audit over the TBT proxy", () => {
    const result = shapePsiResult({
      lighthouseResult: {
        audits: {
          "largest-contentful-paint": { numericValue: 1000 },
          "cumulative-layout-shift": { numericValue: 0 },
          "interaction-to-next-paint": { numericValue: 120 },
          "total-blocking-time": { numericValue: 999 },
          "server-response-time": { numericValue: 200 },
        },
      },
    });
    expect(result.coreWebVitals?.inpMs).toBe(120);
  });

  it("returns null CWV when neither field nor a complete lab set exists", () => {
    const result = shapePsiResult({
      lighthouseResult: {
        audits: { "largest-contentful-paint": { numericValue: 1000 } },
      },
    });
    expect(result.coreWebVitals).toBeNull();
    expect(result.cwvSource).toBeNull();
  });

  it("throws on a non-object payload", () => {
    expect(() => shapePsiResult("nope")).toThrow();
  });
});

function withScreenshot(data: string) {
  return {
    lighthouseResult: {
      fullPageScreenshot: { screenshot: { data, width: 412, height: 900 } },
    },
  };
}

describe("extractScreenshot", () => {
  it("decodes the data URI into raw bytes and keeps its dimensions", () => {
    // "hi" — small enough to assert byte-for-byte.
    const shot = extractScreenshot(
      withScreenshot("data:image/webp;base64,aGk="),
    );

    expect(shot).not.toBeNull();
    expect(Array.from(shot!.bytes)).toEqual([0x68, 0x69]);
    expect(shot!.contentType).toBe("image/webp");
    expect(shot!.width).toBe(412);
    expect(shot!.height).toBe(900);
  });

  // Every one of these must degrade to "no screenshot" rather than throw: the
  // caller runs inside the Workflow step that already produced a good PSI
  // result, and a missing picture must never cost the visitor their report.
  it.each([
    ["no lighthouse result", {}],
    ["no screenshot field", { lighthouseResult: {} }],
    ["a non-object payload", "nope"],
    [
      "a data URI that is not an image",
      withScreenshot("data:text/plain;base64,aGk="),
    ],
    ["a bare base64 string with no data URI wrapper", withScreenshot("aGk=")],
  ])("returns null for %s", (_label, payload) => {
    expect(extractScreenshot(payload)).toBeNull();
  });
});

function withFilmstrip(items: unknown[]) {
  return {
    lighthouseResult: {
      audits: { "screenshot-thumbnails": { details: { items } } },
    },
  };
}

function frame(timing: number, data = "data:image/jpeg;base64,aGk=") {
  return { timing, timestamp: 1_000_000 + timing, data };
}

describe("extractFilmstrip", () => {
  it("keeps valid frames as data URIs with their timing, ordered by timing", () => {
    const frames = extractFilmstrip(
      // Shuffled on purpose — the output must be chronological regardless.
      withFilmstrip([frame(750), frame(375), frame(1125)]),
    );

    expect(frames).toEqual([
      { data: "data:image/jpeg;base64,aGk=", timingMs: 375 },
      { data: "data:image/jpeg;base64,aGk=", timingMs: 750 },
      { data: "data:image/jpeg;base64,aGk=", timingMs: 1125 },
    ]);
  });

  it("accepts every allowlisted image type", () => {
    const frames = extractFilmstrip(
      withFilmstrip([
        frame(1, "data:image/webp;base64,aGk="),
        frame(2, "data:image/jpeg;base64,aGk="),
        frame(3, "data:image/png;base64,aGk="),
      ]),
    );
    expect(frames).toHaveLength(3);
  });

  // The filmstrip is corroborating evidence riding along on a render spent for
  // the capture — absence or garbage must yield null, never a throw.
  it.each([
    ["a non-object payload", "nope"],
    ["no lighthouse result", {}],
    ["no audits", { lighthouseResult: {} }],
    ["no screenshot-thumbnails audit", { lighthouseResult: { audits: {} } }],
    [
      "no details items",
      { lighthouseResult: { audits: { "screenshot-thumbnails": {} } } },
    ],
    ["an empty items array", withFilmstrip([])],
  ])("returns null for %s", (_label, payload) => {
    expect(extractFilmstrip(payload)).toBeNull();
  });

  it("drops malformed frames and keeps the valid ones", () => {
    const frames = extractFilmstrip(
      withFilmstrip([
        "junk",
        { timing: 100 }, // no data
        { data: 42, timing: 200 }, // data is not a string
        { data: "aGk=", timing: 300 }, // bare base64, no data-URI wrapper
        { data: "data:text/plain;base64,aGk=", timing: 400 }, // not an image
        frame(500),
      ]),
    );

    expect(frames).toEqual([
      { data: "data:image/jpeg;base64,aGk=", timingMs: 500 },
    ]);
  });

  // SVG can carry script; it is refused everywhere the allowlist applies, in
  // the filmstrip exactly as in extractScreenshot.
  it("refuses an SVG frame and returns null when nothing else survives", () => {
    const svgOnly = withFilmstrip([
      frame(100, "data:image/svg+xml;base64,aGk="),
    ]);
    expect(extractFilmstrip(svgOnly)).toBeNull();

    const mixed = extractFilmstrip(
      withFilmstrip([frame(100, "data:image/svg+xml;base64,aGk="), frame(200)]),
    );
    expect(mixed).toEqual([
      { data: "data:image/jpeg;base64,aGk=", timingMs: 200 },
    ]);
  });

  it("drops an oversize frame rather than failing the strip", () => {
    const oversize = `data:image/jpeg;base64,${"A".repeat(30_000)}`;
    const frames = extractFilmstrip(
      withFilmstrip([frame(100, oversize), frame(200)]),
    );

    expect(frames).toEqual([
      { data: "data:image/jpeg;base64,aGk=", timingMs: 200 },
    ]);
  });

  it("caps the strip at 10 frames, dropping the overflow", () => {
    const items = Array.from({ length: 14 }, (_, i) => frame((i + 1) * 100));
    const frames = extractFilmstrip(withFilmstrip(items));

    expect(frames).toHaveLength(10);
    expect(frames![0].timingMs).toBe(100);
    expect(frames![9].timingMs).toBe(1000);
  });
});

describe("fetchPageSpeed", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        ),
    );
    await expect(fetchPageSpeed("https://x.test/", "key")).resolves.toEqual({
      ok: true,
    });
  });

  it("throws a PsiRequestError carrying the status so the caller can classify retryability", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad request", { status: 400 })),
    );
    await expect(
      fetchPageSpeed("https://x.test/", "key"),
    ).rejects.toMatchObject({ status: 400 });
    expect(new PsiRequestError(429).status).toBe(429);
  });
});
