/**
 * Domain-ownership verification for professional audit targets.
 *
 * Verification is derived at check time (not stored as a mutable flag) so
 * disconnecting the Search Console property immediately stops granting authority.
 * Only a matching GSC property (`sc-domain:` or URL-prefix) proves ownership
 * today; DNS proof is a reserved P12 seam. An IndexNow key is host-submission
 * proof only and is intentionally never an input here, so it can never grant
 * Google-facing authority.
 *
 * The predicate is `propertyProvesOwnership`, never the stricter
 * `propertyCoversOrigin` the GSC reads use: this asks who controls the site, and
 * the owner of `https://example.com/` controls `blog.example.com` whether or not
 * a property reports on it.
 */
import type { AuthMode } from "@/lib/auth-mode";
import { AUDIT_VERIFICATION_PAGE_THRESHOLD } from "@/shared/audit-limits";
import { propertyProvesOwnership } from "@/shared/gsc-property-match";

type TargetVerification = "unverified" | "gsc_property";

export function evaluateTargetVerification(input: {
  origin: string;
  gscSiteUrl: string | null | undefined;
}): TargetVerification {
  if (
    input.gscSiteUrl &&
    propertyProvesOwnership(input.origin, input.gscSiteUrl)
  ) {
    return "gsc_property";
  }
  return "unverified";
}

export function hasGoogleFacingAuthority(
  verification: TargetVerification,
): boolean {
  return verification !== "unverified";
}

export function requiresVerifiedDomain(input: {
  authMode: AuthMode;
  maxPages: number;
  threshold?: number;
}): boolean {
  const threshold = input.threshold ?? AUDIT_VERIFICATION_PAGE_THRESHOLD;
  return input.authMode === "hosted" && input.maxPages > threshold;
}

/**
 * The crawl size above which this auth mode demands a verified domain, or null
 * where the mode has no such gate. Derived from the launch rule itself so the
 * explanation shown before launch cannot drift from the rule enforced at launch.
 */
export function getVerificationPageThreshold(
  authMode: AuthMode,
): number | null {
  return requiresVerifiedDomain({
    authMode,
    maxPages: Number.POSITIVE_INFINITY,
  })
    ? AUDIT_VERIFICATION_PAGE_THRESHOLD
    : null;
}

/**
 * Whether a launch must be blocked because a large hosted crawl targets an
 * unverified domain.
 */
export function isLaunchBlockedByVerification(input: {
  authMode: AuthMode;
  maxPages: number;
  verification: TargetVerification;
  threshold?: number;
}): boolean {
  return (
    requiresVerifiedDomain(input) &&
    !hasGoogleFacingAuthority(input.verification)
  );
}
