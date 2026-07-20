/**
 * Domain-ownership verification for professional audit targets.
 *
 * Verification is derived at check time (not stored as a mutable flag) so
 * disconnecting the Search Console property immediately stops granting authority.
 * Only a matching GSC property (`sc-domain:` or URL-prefix) proves ownership
 * today; DNS proof is a reserved P12 seam. An IndexNow key is host-submission
 * proof only and is intentionally never an input here, so it can never grant
 * Google-facing authority.
 */
import type { AuthMode } from "@/lib/auth-mode";

type TargetVerification = "unverified" | "gsc_property";

/**
 * Above this crawl size a hosted-tier audit must run against a verified domain.
 * Self-host / local stay permissive with an honest "unverified" label.
 */
export const AUDIT_VERIFICATION_PAGE_THRESHOLD = 100;

/**
 * Does a connected GSC `siteUrl` prove ownership of `origin`?
 * - `sc-domain:<domain>` — domain property covering the domain + all subdomains.
 * - `https://host/…` — URL-prefix property matching the same protocol + host.
 */
export function originMatchesGscSiteUrl(
  origin: string,
  siteUrl: string,
): boolean {
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  const originHost = originUrl.hostname.toLowerCase();

  const domainPrefix = "sc-domain:";
  if (siteUrl.startsWith(domainPrefix)) {
    const domain = siteUrl.slice(domainPrefix.length).trim().toLowerCase();
    if (!domain) return false;
    return originHost === domain || originHost.endsWith(`.${domain}`);
  }

  try {
    const propertyUrl = new URL(siteUrl);
    return (
      propertyUrl.protocol === originUrl.protocol &&
      propertyUrl.hostname.toLowerCase() === originHost
    );
  } catch {
    return false;
  }
}

export function evaluateTargetVerification(input: {
  origin: string;
  gscSiteUrl: string | null | undefined;
}): TargetVerification {
  if (
    input.gscSiteUrl &&
    originMatchesGscSiteUrl(input.origin, input.gscSiteUrl)
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
