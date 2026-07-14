/**
 * Shared HTTP helpers for the public Free SEO Checker endpoints (Lite + Deep).
 *
 * These endpoints are raw Worker routes dispatched in server.ts before the
 * TanStack auth pipeline, so they build their own responses and map AppError
 * codes to status codes here in one place.
 */
import { waitUntil } from "cloudflare:workers";
import { AppError, asAppError } from "@/server/lib/errors";
import { captureServerError } from "@/server/lib/posthog";
import {
  shouldCaptureAppErrorCode,
  type ErrorCode,
} from "@/shared/error-codes";

export function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}

/**
 * Parses a JSON request body, mapping a malformed body to a (non-reportable)
 * VALIDATION_ERROR instead of a 500 + PostHog event, so a junk-body flood on a
 * public endpoint stays cheap.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR");
  }
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ERROR_STATUS: Partial<Record<ErrorCode, number>> = {
  VALIDATION_ERROR: 400,
  CRAWL_TARGET_BLOCKED: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UPSTREAM_UNAVAILABLE: 502,
};

export function errorResponse(error: unknown, request: Request): Response {
  const appError = asAppError(error);
  const code: ErrorCode = appError?.code ?? "INTERNAL_ERROR";

  if (!appError) {
    console.error("free-seo-check: unexpected error", error);
  }

  if (shouldCaptureAppErrorCode(appError?.code)) {
    const url = new URL(request.url);
    waitUntil(
      captureServerError(error, {
        errorCode: code,
        method: request.method,
        path: url.pathname,
      }),
    );
  }

  return jsonResponse({ error: code }, ERROR_STATUS[code] ?? 500);
}
