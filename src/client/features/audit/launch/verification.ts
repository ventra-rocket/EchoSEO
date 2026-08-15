/**
 * The launch form's copy of the domain-ownership rule, so a crawl the server will
 * refuse is explained in the form instead of failing after a round trip.
 *
 * It shares the predicate (`propertyProvesOwnership`) with the server gate in
 * `server/features/audit/authz/target-verification.ts` and takes the threshold
 * from the access query the same gate derives it from, so the two cannot drift.
 * The server stays the authority: this answers "will that be refused, and why",
 * never "is this allowed".
 */
import { propertyProvesOwnership } from "@/shared/gsc-property-match";

type AuditAccess = {
  verifiedSiteUrl: string | null;
  verificationPageThreshold: number | null;
};

export type LaunchVerificationGate = {
  /** Host the crawl would start on, named back to the user as they typed it. */
  domain: string;
  /** Largest crawl allowed on a domain no connected property covers. */
  threshold: number;
  /** The property connected to this project, or null when there is none. */
  verifiedSiteUrl: string | null;
};

/**
 * The origin the server will crawl for what the user has typed so far, or null
 * while that is not readable yet. Mirrors `normalizeAndValidateStartUrl`: a
 * missing scheme becomes `https:`, so this cannot disagree with the launch gate
 * about which origin is being verified.
 */
export function guessTargetOrigin(urlInput: string): string | null {
  const raw = urlInput.trim();
  if (!raw) return null;

  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * The verification gate that will refuse this launch, or null when it won't.
 *
 * Null is also the answer whenever the outcome is not knowable here — no gate in
 * this deployment, an unreadable URL, an unparsed page count — because guessing
 * would block a launch the server would have accepted.
 */
export function evaluateLaunchVerificationGate(input: {
  urlInput: string;
  maxPages: number;
  access: AuditAccess | undefined;
}): LaunchVerificationGate | null {
  const threshold = input.access?.verificationPageThreshold ?? null;
  if (threshold === null) return null;
  if (!Number.isFinite(input.maxPages) || input.maxPages <= threshold) {
    return null;
  }

  const origin = guessTargetOrigin(input.urlInput);
  if (!origin) return null;

  const verifiedSiteUrl = input.access?.verifiedSiteUrl ?? null;
  if (verifiedSiteUrl && propertyProvesOwnership(origin, verifiedSiteUrl)) {
    return null;
  }

  return { domain: new URL(origin).hostname, threshold, verifiedSiteUrl };
}
