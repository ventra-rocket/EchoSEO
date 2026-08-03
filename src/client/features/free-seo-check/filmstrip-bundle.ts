/**
 * The client's own reading of the filmstrip bundle the capture render stores
 * in R2 and `site-filmstrip` serves verbatim: `{version, frames[{data,
 * timingMs}], capturedAt}`.
 *
 * Deliberately NOT a type import from the server store — client code must
 * never value-import server modules (they pull in `cloudflare:workers`), so
 * this module owns an independent zod schema and a server-side contract test
 * (`site-screenshot-store` tests parse the exact bytes the store writes with
 * this schema) keeps the two sides honest. The import points that way on
 * purpose: server tests may import this React-free module; a client test
 * importing server code breaks on the workers alias.
 *
 * Parsing is tolerant by design. The filmstrip is corroborating evidence under
 * the capture, never load-bearing: unknown extra fields are ignored (zod
 * strips them), a bundle version this client does not know renders as "no
 * filmstrip" rather than crashing, and a malformed body reads the same as an
 * absent one.
 */
import { z } from "zod";

/** One frame, rendered directly as `<img src={data}>` with a timing caption. */
export interface FilmstripFrame {
  /** `data:image/…;base64,…` — the server allowlists webp/jpeg/png, never SVG. */
  data: string;
  /** Milliseconds from navigation start to this frame. */
  timingMs: number;
}

/** The one bundle shape this client knows how to render (server `version: 1`). */
const KNOWN_BUNDLE_VERSION = 1;

const filmstripBundleSchema = z.object({
  version: z.number(),
  frames: z.array(z.object({ data: z.string(), timingMs: z.number() })),
});

/**
 * Frames from a fetched bundle body, or null when there is nothing renderable
 * — the caller shows no filmstrip row and no error either way. Frames whose
 * data URI is not an image are dropped rather than handed to an `<img>`; the
 * server already refuses them at extraction, so this is belt over braces.
 */
export function parseFilmstripBundle(raw: unknown): FilmstripFrame[] | null {
  const parsed = filmstripBundleSchema.safeParse(raw);
  if (!parsed.success) return null;
  if (parsed.data.version !== KNOWN_BUNDLE_VERSION) return null;

  const frames = parsed.data.frames.filter((frame) =>
    frame.data.startsWith("data:image/"),
  );
  return frames.length > 0 ? frames : null;
}
