/**
 * Client-side summary of the `structure-heading-order` measurement.
 *
 * The rule persists its evidence as the outline exactly as written on the page
 * ("H1 › H3 › H3 › …"), which on a heading-heavy page runs to hundreds of
 * tokens — rendered verbatim in the row header it filled multiple phone
 * screens and buried "How to fix this". This module reduces that string to
 * what the reader needs at a glance (how many headings, where the first skip
 * happens); the raw outline stays in the data model and stays reachable
 * behind a disclosure. Parsing is read-only — the measurement contract does
 * not change.
 */

/** The separator `measure()` joins heading levels with, e.g. "H1 › H2". */
const OUTLINE_SEPARATOR = "›";

interface HeadingOutlineSummary {
  headingCount: number;
  /** The first level jump greater than one (e.g. H2 straight to H4), if any. */
  firstSkip: { from: number; to: number } | null;
}

/**
 * Parses an outline measurement string back into levels and finds the first
 * skipped level, mirroring the server rule's `hasHeadingLevelSkip` walk.
 * Returns null for anything that is not a well-formed outline, so callers can
 * fall back to rendering the raw measurement rather than a wrong summary.
 */
export function summarizeHeadingOutline(
  value: string,
): HeadingOutlineSummary | null {
  const tokens = value.split(OUTLINE_SEPARATOR).map((token) => token.trim());
  if (tokens.length === 0) return null;

  const levels: number[] = [];
  for (const token of tokens) {
    const match = /^[Hh]([1-6])$/.exec(token);
    if (!match) return null;
    levels.push(Number(match[1]));
  }

  let firstSkip: HeadingOutlineSummary["firstSkip"] = null;
  let maxSeen = 0;
  for (const level of levels) {
    if (maxSeen > 0 && level > maxSeen + 1) {
      firstSkip = { from: maxSeen, to: level };
      break;
    }
    if (level > maxSeen) maxSeen = level;
  }

  return { headingCount: levels.length, firstSkip };
}
