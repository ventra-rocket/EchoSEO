import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { AppError } from "@/server/lib/errors";
import { getPublicOrigin } from "@/server/mcp/public-origin";

/**
 * Origin check for server functions — our CSRF defense.
 *
 * Server functions are cookie-authenticated (`ensureUserMiddleware` resolves
 * the session straight from request headers), so without this a third-party
 * page could drive any of them with the visitor's session attached. Better
 * Auth's `SameSite=Lax` cookie already blocks the classic cross-site form POST;
 * this is the second lock, so a future cookie-policy change (or a browser that
 * relaxes Lax) cannot silently reopen the hole.
 *
 * The rule:
 *
 * - `Origin` present and not ours -> reject. A page cannot forge or omit this
 *   header on a fetch/XHR/form POST; the browser sets it. `Origin: null`
 *   (sandboxed iframe, cross-origin redirect chain) is likewise not ours and
 *   is rejected.
 * - `Origin` absent -> allow. Browsers omit it on same-origin GET navigations,
 *   which is what SSR sees, and no cross-site page can cause a request that
 *   omits it. A non-browser caller (curl with a stolen cookie) is credential
 *   theft, not CSRF, and is not what this gate is for.
 *
 * Compared against `getPublicOrigin`, not `new URL(request.url).origin`, so a
 * self-hosted deployment behind a TLS-terminating proxy (`Dockerfile.selfhost`)
 * compares the browser's `https://host` against the same public origin instead
 * of the proxy's internal `http://` one.
 */
export function isSameOriginServerFnRequest(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (origin === null) return true;
  return origin === getPublicOrigin(request);
}

/**
 * A `type: "function"` middleware, not a `requestMiddleware`: the pinned
 * @tanstack/react-start (1.167) has no `createCsrfMiddleware`, and its request
 * middleware runs for page requests too, with no flag saying which handler is
 * about to run — filtering those back down to server functions would mean
 * sniffing the build-time server-fn path prefix, and getting it wrong would
 * either miss server functions or reject the cross-origin MCP endpoints. A
 * function middleware is scoped to server functions by construction.
 */
export const csrfMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    if (!isSameOriginServerFnRequest(getRequest())) {
      throw new AppError(
        "FORBIDDEN",
        "Cross-origin server function request rejected",
      );
    }

    return next();
  },
);
