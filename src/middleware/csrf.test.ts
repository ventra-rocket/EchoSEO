import { describe, expect, it } from "vitest";
import { isSameOriginServerFnRequest } from "./csrf";

const APP_ORIGIN = "https://app.echoseo.ventrarocket.vn";
const SERVER_FN_PATH = "/_serverFn/deleteProject";

function serverFnRequest(headers: Record<string, string>, url?: string) {
  return new Request(url ?? `${APP_ORIGIN}${SERVER_FN_PATH}`, {
    method: "POST",
    headers,
  });
}

describe("isSameOriginServerFnRequest", () => {
  it("rejects a cross-site page driving a server function", () => {
    const request = serverFnRequest({ Origin: "https://evil.test" });

    expect(isSameOriginServerFnRequest(request)).toBe(false);
  });

  it("rejects an opaque origin, which is not ours either", () => {
    // Sandboxed iframes and cross-origin redirect chains send `Origin: null`.
    const request = serverFnRequest({ Origin: "null" });

    expect(isSameOriginServerFnRequest(request)).toBe(false);
  });

  it("rejects a look-alike host that only prefixes ours", () => {
    const request = serverFnRequest({
      Origin: `${APP_ORIGIN}.evil.test`,
    });

    expect(isSameOriginServerFnRequest(request)).toBe(false);
  });

  it("allows our own origin", () => {
    const request = serverFnRequest({ Origin: APP_ORIGIN });

    expect(isSameOriginServerFnRequest(request)).toBe(true);
  });

  it("allows a request that carries no Origin at all", () => {
    // Browsers omit Origin on same-origin GET navigations, which is what SSR
    // sees, and no cross-site page can produce a request that omits it — so
    // absent is not a CSRF signal.
    const request = serverFnRequest({});

    expect(isSameOriginServerFnRequest(request)).toBe(true);
  });

  it("compares against the forwarded origin behind a TLS proxy", () => {
    // Self-hosted (Dockerfile.selfhost): the browser sends the public https
    // origin while the app sees plain http on an internal port. Comparing the
    // raw request origin would reject every server function call.
    const request = serverFnRequest(
      {
        Origin: "https://seo.example.com",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "seo.example.com",
      },
      `http://localhost:3000${SERVER_FN_PATH}`,
    );

    expect(isSameOriginServerFnRequest(request)).toBe(true);
  });

  it("ignores forwarded headers on an already-public https request", () => {
    const request = serverFnRequest({
      Origin: "https://evil.test",
      "x-forwarded-proto": "https",
      "x-forwarded-host": "evil.test",
    });

    expect(isSameOriginServerFnRequest(request)).toBe(false);
  });
});
