import { describe, expect, it } from "vitest";
import { parseVisualBundle } from "./filmstrip-bundle";

const FRAME = { data: "data:image/webp;base64,aGk=", timingMs: 375 };

const SCORES = {
  performance: 92,
  seo: 100,
  accessibility: 88,
  bestPractices: 75,
};

const CWV = { lcpMs: 1200, cls: 0.02, inpMs: 140, ttfbMs: 300 };

describe("parseVisualBundle", () => {
  it("returns the frames of a well-formed version-1 bundle", () => {
    const { frames } = parseVisualBundle({
      version: 1,
      frames: [FRAME, { data: "data:image/jpeg;base64,aGk=", timingMs: 750 }],
      capturedAt: "2026-08-03T00:00:00.000Z",
    });
    expect(frames).toHaveLength(2);
    expect(frames?.[0]).toEqual(FRAME);
  });

  // Bundles stored before the lab fields existed must read as "no lab data",
  // never as an error — they stay cached for up to 24h after a deploy.
  it("treats a pre-lab bundle as frames-only, not an error", () => {
    const { frames, lab } = parseVisualBundle({
      version: 1,
      frames: [FRAME],
      capturedAt: "2026-08-03T00:00:00.000Z",
    });
    expect(frames).toHaveLength(1);
    expect(lab).toBeNull();
  });

  it("returns both halves of a bundle carrying frames and lab data", () => {
    const { frames, lab } = parseVisualBundle({
      version: 1,
      frames: [FRAME],
      capturedAt: "2026-08-03T00:00:00.000Z",
      scores: SCORES,
      coreWebVitals: CWV,
    });
    expect(frames).toHaveLength(1);
    expect(lab).toEqual({
      scores: SCORES,
      coreWebVitals: CWV,
      capturedAt: "2026-08-03T00:00:00.000Z",
    });
  });

  // The store writes `frames: []` when a render produced scores but no
  // filmstrip; an absent filmstrip must not hide the scores.
  it("returns the lab data of a frameless bundle", () => {
    const { frames, lab } = parseVisualBundle({
      version: 1,
      frames: [],
      capturedAt: "2026-08-03T00:00:00.000Z",
      scores: SCORES,
    });
    expect(frames).toBeNull();
    expect(lab?.scores).toEqual(SCORES);
    expect(lab?.coreWebVitals).toBeNull();
  });

  it("keeps the frames when the lab fields are malformed", () => {
    const { frames, lab } = parseVisualBundle({
      version: 1,
      frames: [FRAME],
      scores: "junk",
      coreWebVitals: { lcpMs: "fast" },
    });
    expect(frames).toHaveLength(1);
    expect(lab).toBeNull();
  });

  it("keeps the lab data when the frames are malformed", () => {
    const { frames, lab } = parseVisualBundle({
      version: 1,
      frames: "junk",
      scores: SCORES,
      coreWebVitals: CWV,
    });
    expect(frames).toBeNull();
    expect(lab?.scores).toEqual(SCORES);
  });

  it("treats an all-null scores object with no CWV as absent lab data", () => {
    const { lab } = parseVisualBundle({
      version: 1,
      frames: [FRAME],
      scores: {
        performance: null,
        seo: null,
        accessibility: null,
        bestPractices: null,
      },
    });
    expect(lab).toBeNull();
  });

  it("ignores unknown extra fields instead of rejecting the bundle", () => {
    // A future server may append fields; an old client must keep rendering.
    const { frames } = parseVisualBundle({
      version: 1,
      frames: [FRAME],
      capturedAt: "2026-08-03T00:00:00.000Z",
      strategy: "mobile",
      note: "added later",
    });
    expect(frames).toHaveLength(1);
  });

  it("treats a version this client does not know as absent", () => {
    // A version bump means the shape changed in a way this schema cannot
    // vouch for — render nothing rather than something possibly wrong.
    expect(
      parseVisualBundle({
        version: 2,
        frames: [FRAME],
        capturedAt: "x",
        scores: SCORES,
      }),
    ).toEqual({ frames: null, lab: null });
  });

  it("treats malformed bodies as absent, never throws", () => {
    expect(parseVisualBundle(null)).toEqual({ frames: null, lab: null });
    expect(parseVisualBundle("not an object")).toEqual({
      frames: null,
      lab: null,
    });
    expect(parseVisualBundle({})).toEqual({ frames: null, lab: null });
    expect(
      parseVisualBundle({
        version: 1,
        frames: [{ data: 5, timingMs: "x" }],
      }),
    ).toEqual({ frames: null, lab: null });
  });

  it("treats an empty frame list as absent", () => {
    expect(parseVisualBundle({ version: 1, frames: [] }).frames).toBeNull();
  });

  it("drops frames whose data URI is not an image", () => {
    const { frames } = parseVisualBundle({
      version: 1,
      frames: [
        { data: "https://evil.test/a.png", timingMs: 100 },
        { data: "data:text/html;base64,aGk=", timingMs: 200 },
        FRAME,
      ],
    });
    expect(frames).toEqual([FRAME]);
  });
});
