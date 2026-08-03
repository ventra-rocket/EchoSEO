/**
 * The client's own reading of the visual bundle the capture render stores in
 * R2 and `site-filmstrip` serves verbatim: `{version, frames[{data,
 * timingMs}], capturedAt, scores?, coreWebVitals?}` — the loading filmstrip
 * plus the lab-only Lighthouse scores/CWV shaped from the same PSI response.
 *
 * Deliberately NOT a type import from the server store — client code must
 * never value-import server modules (they pull in `cloudflare:workers`), so
 * this module owns an independent zod schema and a server-side contract test
 * (`site-screenshot-store` tests parse the exact bytes the store writes with
 * this schema) keeps the two sides honest. The import points that way on
 * purpose: server tests may import this React-free module; a client test
 * importing server code breaks on the workers alias.
 *
 * Parsing is tolerant by design. The bundle is corroborating evidence under
 * the capture, never load-bearing: unknown extra fields are ignored (zod
 * strips them), a bundle version this client does not know renders as absent
 * rather than crashing, and a malformed body reads the same as an absent one.
 * The two halves are independent — the lab fields are optional (bundles
 * stored before they existed lack them), and a malformed half degrades alone:
 * "no filmstrip" must never hide the scores, nor the reverse.
 */
import { z } from "zod";

/** One frame, rendered directly as `<img src={data}>` with a timing caption. */
export interface FilmstripFrame {
  /** `data:image/…;base64,…` — the server allowlists webp/jpeg/png, never SVG. */
  data: string;
  /** Milliseconds from navigation start to this frame. */
  timingMs: number;
}

/** The four Lighthouse category scores (0–100), null where PSI withheld one. */
export interface VisualLabScores {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
}

/** Lab-only Core Web Vitals; `inpMs` carries Lighthouse's TBT (labs cannot
 * measure INP), so any rendering must label it TBT with TBT cutoffs. */
export interface VisualLabCwv {
  lcpMs: number;
  cls: number;
  inpMs: number;
  ttfbMs: number;
}

/** The lab half of the bundle. `coreWebVitals` is all-or-nothing on the
 * server (one missing audit nulls the block), so a scores-only value exists. */
export interface VisualLabData {
  scores: VisualLabScores;
  coreWebVitals: VisualLabCwv | null;
  /** ISO timestamp of the render, when the bundle carried one. */
  capturedAt: string | null;
}

/** What a fetched bundle body yields — each half absent independently. */
interface VisualBundle {
  frames: FilmstripFrame[] | null;
  lab: VisualLabData | null;
}

const ABSENT: VisualBundle = { frames: null, lab: null };

/** The one bundle shape this client knows how to render (server `version: 1`).
 * The lab fields were added to version 1 as optionals on purpose — see the
 * store's version note; a bump would blank cached bundles on both sides. */
const KNOWN_BUNDLE_VERSION = 1;

const frameSchema = z.object({ data: z.string(), timingMs: z.number() });

const labScoresSchema = z.object({
  performance: z.number().nullable(),
  seo: z.number().nullable(),
  accessibility: z.number().nullable(),
  bestPractices: z.number().nullable(),
});

const labCwvSchema = z.object({
  lcpMs: z.number(),
  cls: z.number(),
  inpMs: z.number(),
  ttfbMs: z.number(),
});

// Every field except `version` is `.catch`-guarded so one malformed half
// degrades to its own absence instead of rejecting the whole bundle.
const visualBundleSchema = z.object({
  version: z.number(),
  frames: z.array(frameSchema).catch([]),
  scores: labScoresSchema.nullish().catch(undefined),
  coreWebVitals: labCwvSchema.nullish().catch(undefined),
  capturedAt: z.string().nullish().catch(undefined),
});

/**
 * Parses a fetched bundle body; either half is null when there is nothing
 * renderable — the caller shows no filmstrip row / an absent lab state, and
 * no error either way. Frames whose data URI is not an image are dropped
 * rather than handed to an `<img>`; the server already refuses them at
 * extraction, so this is belt over braces.
 */
export function parseVisualBundle(raw: unknown): VisualBundle {
  const parsed = visualBundleSchema.safeParse(raw);
  if (!parsed.success) return ABSENT;
  if (parsed.data.version !== KNOWN_BUNDLE_VERSION) return ABSENT;

  const frames = parsed.data.frames.filter((frame) =>
    frame.data.startsWith("data:image/"),
  );

  const scores = parsed.data.scores ?? null;
  const coreWebVitals = parsed.data.coreWebVitals ?? null;
  // A scores object with every value null carries nothing worth a panel; the
  // server does not store one, so treat it like the absent old-bundle case.
  const hasScores =
    scores !== null && Object.values(scores).some((score) => score !== null);

  const lab: VisualLabData | null =
    hasScores || coreWebVitals
      ? {
          scores: scores ?? {
            performance: null,
            seo: null,
            accessibility: null,
            bestPractices: null,
          },
          coreWebVitals,
          capturedAt: parsed.data.capturedAt ?? null,
        }
      : null;

  return { frames: frames.length > 0 ? frames : null, lab };
}
