import { z } from "zod";

const ERROR_CODES = [
  "UNAUTHENTICATED",
  "AUTH_CONFIG_MISSING",
  "PAYMENT_REQUIRED",
  "INSUFFICIENT_CREDITS",
  "FORBIDDEN",
  "NOT_FOUND",
  "AUDIT_CAPACITY_REACHED",
  "VALIDATION_ERROR",
  "CRAWL_TARGET_BLOCKED",
  "BACKLINKS_NOT_ENABLED",
  "BACKLINKS_BILLING_ISSUE",
  "AI_SEARCH_NOT_ENABLED",
  "AI_SEARCH_BILLING_ISSUE",
  "DATAFORSEO_AUTH_FAILED",
  "RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "TARGET_BEHIND_AUTH",
  "CONFLICT",
  "INTERNAL_ERROR",
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

const NON_REPORTABLE_ERROR_CODES = new Set<ErrorCode>([
  "UNAUTHENTICATED",
  "NOT_FOUND",
  "PAYMENT_REQUIRED",
  "INSUFFICIENT_CREDITS",
  "VALIDATION_ERROR",
  // A 429 is the rate limiter doing its job, not a fault to investigate. The
  // public report page polls while a check runs, so one visitor behind a shared
  // NAT can emit a long 429 run — capturing each one is pure noise and cost.
  "RATE_LIMITED",
  // The visitor asked us to check a site whose content is behind a login/SSO
  // gate — an expected "can't check this target" outcome, not a fault.
  "TARGET_BEHIND_AUTH",
]);

export function isErrorCode(value: string): value is ErrorCode {
  return errorCodeSchema.safeParse(value).success;
}

export function shouldCaptureAppErrorCode(
  code: ErrorCode | null | undefined,
): boolean {
  return code == null || !NON_REPORTABLE_ERROR_CODES.has(code);
}
