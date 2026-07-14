import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPageSpeed, PsiRequestError, shapePsiResult } from "./pagespeed";

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
