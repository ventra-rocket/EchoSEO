import { describe, expect, it } from "vitest";
import { parseFilmstripBundle } from "./filmstrip-bundle";

const FRAME = { data: "data:image/webp;base64,aGk=", timingMs: 375 };

describe("parseFilmstripBundle", () => {
  it("returns the frames of a well-formed version-1 bundle", () => {
    const frames = parseFilmstripBundle({
      version: 1,
      frames: [FRAME, { data: "data:image/jpeg;base64,aGk=", timingMs: 750 }],
      capturedAt: "2026-08-03T00:00:00.000Z",
    });
    expect(frames).toHaveLength(2);
    expect(frames?.[0]).toEqual(FRAME);
  });

  it("ignores unknown extra fields instead of rejecting the bundle", () => {
    // A future server may append fields; an old client must keep rendering.
    const frames = parseFilmstripBundle({
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
      parseFilmstripBundle({ version: 2, frames: [FRAME], capturedAt: "x" }),
    ).toBeNull();
  });

  it("treats malformed bodies as absent, never throws", () => {
    expect(parseFilmstripBundle(null)).toBeNull();
    expect(parseFilmstripBundle("not an object")).toBeNull();
    expect(parseFilmstripBundle({})).toBeNull();
    expect(
      parseFilmstripBundle({
        version: 1,
        frames: [{ data: 5, timingMs: "x" }],
      }),
    ).toBeNull();
  });

  it("treats an empty frame list as absent", () => {
    expect(parseFilmstripBundle({ version: 1, frames: [] })).toBeNull();
  });

  it("drops frames whose data URI is not an image", () => {
    const frames = parseFilmstripBundle({
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
