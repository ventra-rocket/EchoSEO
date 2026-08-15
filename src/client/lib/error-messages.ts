import { isErrorCode, type ErrorCode } from "@/shared/error-codes";
import { AUDIT_VERIFICATION_PAGE_THRESHOLD } from "@/shared/audit-limits";

const STANDARD_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "Please sign in and try again.",
  AUTH_CONFIG_MISSING:
    "EchoSEO auth is not configured. Follow the README setup steps for Cloudflare Access.",
  PAYMENT_REQUIRED:
    "An active hosted subscription is required before you can use EchoSEO.",
  INSUFFICIENT_CREDITS:
    "You've run out of credits. Add more credits or upgrade your plan to continue.",
  FORBIDDEN: "You do not have access to this resource.",
  NOT_FOUND: "The requested resource was not found.",
  AUDIT_CAPACITY_REACHED:
    "You've reached audit capacity for your account. Delete old audits from your projects to start a new one.",
  // Names the rule and the way out. The generic FORBIDDEN sentence used to stand
  // in here, which told a user who had simply asked for too many pages on a
  // domain they don't own that they lacked access to the product.
  AUDIT_VERIFICATION_REQUIRED: `Crawls over ${AUDIT_VERIFICATION_PAGE_THRESHOLD.toLocaleString()} pages need a Search Console property that covers this domain. Lower Max pages to ${AUDIT_VERIFICATION_PAGE_THRESHOLD.toLocaleString()}, or connect a matching property in Settings.`,
  VALIDATION_ERROR: "Please check your input and try again.",
  CRAWL_TARGET_BLOCKED: "This crawl target is blocked by security policy.",
  BACKLINKS_NOT_ENABLED:
    "Backlinks is not enabled for the connected DataForSEO account yet.",
  BACKLINKS_BILLING_ISSUE:
    "The connected DataForSEO account has a billing or balance issue.",
  AI_SEARCH_NOT_ENABLED:
    "AI Optimization is not enabled for the connected DataForSEO account yet.",
  AI_SEARCH_BILLING_ISSUE:
    "The connected DataForSEO account has a billing or balance issue.",
  // Covers 401 and 403 alike: the key may be wrong, or it may be a good key on
  // an account DataForSEO will not serve yet. Naming only the first was wrong
  // for every 403 and sent people to re-check a key that was already correct.
  DATAFORSEO_AUTH_FAILED:
    "DataForSEO refused the request. Either the API key is wrong, or the DataForSEO account behind it cannot fetch data yet — check both in Settings.",
  DATAFORSEO_KEY_MISSING:
    "Add your DataForSEO API key in Settings to load keyword, backlink, domain, and rank data.",
  RATE_LIMITED: "Too many requests. Please wait and try again.",
  UPSTREAM_UNAVAILABLE:
    "The data provider is temporarily unavailable. Please retry in a moment.",
  TARGET_BEHIND_AUTH:
    "That site is behind a login or access gate, so its pages can't be checked.",
  CONFLICT: "This request conflicts with existing data.",
  INTERNAL_ERROR:
    "An unexpected error occurred. Please check server logs and try again.",
};

export function getStandardErrorMessage(
  error: unknown,
  fallback: string = STANDARD_MESSAGES.INTERNAL_ERROR,
): string {
  if (!(error instanceof Error)) return fallback;
  if (isErrorCode(error.message)) return STANDARD_MESSAGES[error.message];
  if (error.message) return error.message;
  return fallback;
}

export function getErrorCode(error: unknown): ErrorCode | null {
  if (!(error instanceof Error)) return null;
  return isErrorCode(error.message) ? error.message : null;
}
