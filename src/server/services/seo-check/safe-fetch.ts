import { AppError } from "@/server/lib/errors";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";

const MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Sent on every checker fetch, because sending none is not the neutral choice
 * it looks like.
 *
 * Observed on `thehourglass.com`: CloudFront answers **403** to a request with
 * a missing or empty `User-Agent`, and **200** to the same request carrying any
 * value at all — even a single letter. The checker sent none, so a perfectly
 * reachable site failed with "the site may block automated checkers", blaming
 * the site for a header we had left off.
 *
 * Naming ourselves is also the courteous default: it lets a site owner see who
 * is calling in their logs and allowlist the checker rather than guess.
 */
const CHECKER_USER_AGENT =
  "EchoSEO-Checker/1.0 (+https://echoseo.ventrarocket.vn)";
/** Caps memory/CPU cost of a single crawled page — including decompression bombs. */
const DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024;

interface SafeFetchOptions {
  maxRedirects?: number;
  timeoutMs?: number;
  init?: RequestInit;
}

interface SafeFetchResult {
  response: Response;
  /** The final URL after following (and re-validating) all redirect hops. */
  finalUrl: string;
}

/**
 * SSRF-safe fetch for the public free checker.
 *
 * Reuses the shared audit URL policy (`normalizeAndValidateStartUrl`) — scheme
 * allowlist, private/loopback/link-local/CGNAT/cloud-metadata blocking, and DoH
 * resolution — for the initial target AND re-validates every redirect hop
 * manually (`redirect: "manual"`), so a public URL cannot bounce us into an
 * internal address (the redirect re-validation the audit path lacked).
 *
 * This is the FIRST gate on every server-side fetch the checker makes (Lite
 * page fetch and, later, the GEO robots.txt/llms.txt fetches).
 */
export async function safeFetch(
  inputUrl: string,
  {
    maxRedirects = MAX_REDIRECTS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    init = {},
  }: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  let url = await normalizeAndValidateStartUrl(inputUrl);

  // Built once and reused across hops. `Headers` rather than an object spread so
  // any shape a caller passes (object, array, Headers) merges correctly, and a
  // caller that sets its own agent still wins.
  const headers = new Headers(init.headers);
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", CHECKER_USER_AGENT);
  }

  for (let hop = 0; hop <= maxRedirects; hop++) {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      // DNS failure, connection refused, TLS error, or the timeout signal
      // firing — all the same user-facing outcome: the target is unreachable.
      throw new AppError("UPSTREAM_UNAVAILABLE", "Failed to reach target URL", {
        cause: cause instanceof Error ? cause.message : String(cause),
      });
    }

    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: url };
    }

    const location = response.headers.get("location");
    if (!location) {
      // A 3xx without a Location — nothing to follow; hand it back as-is.
      return { response, finalUrl: url };
    }

    // Resolve relative redirects against the current URL, then re-validate the
    // absolute target through the same SSRF policy (throws if it points inward).
    const nextUrl = new URL(location, url).toString();
    url = await normalizeAndValidateStartUrl(nextUrl);
  }

  throw new AppError("UPSTREAM_UNAVAILABLE");
}

/**
 * Reads a response body as text, capped at `maxBytes`.
 *
 * Guards against a huge or maliciously large/decompression-bomb response —
 * `Content-Length` is checked first as a fast path, then the stream itself is
 * capped in case the header is absent or understates the actual size.
 */
export async function readBoundedText(
  response: Response,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new AppError("UPSTREAM_UNAVAILABLE", "Response too large");
  }

  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const decoder = new TextDecoder();
  let text = "";
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new AppError("UPSTREAM_UNAVAILABLE", "Response too large");
    }

    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}
