import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppError } from "@/server/lib/errors";
import { safeFetch, readBoundedText } from "./safe-fetch";

const DOH_HOST = "cloudflare-dns.com";

function dohEmpty(): Response {
  // Empty DNS answer → hostname resolves to nothing blocked → allowed.
  return new Response(JSON.stringify({ Status: 0, Answer: [] }), {
    status: 200,
    headers: { "content-type": "application/dns-json" },
  });
}

function redirectTo(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

let pageResponses: Response[];

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.toString() : input.url;
}

/** Every call the code under test makes except the DoH lookups the URL policy
 * performs — i.e. the actual page fetches, one per redirect hop. */
function pageCalls() {
  return fetchMock.mock.calls.filter(
    ([input]) => !requestUrl(input).includes(DOH_HOST),
  );
}

const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
  void init;
  const url = requestUrl(input);
  if (url.includes(DOH_HOST)) return Promise.resolve(dohEmpty());
  const next = pageResponses.shift();
  if (!next) throw new Error(`unexpected page fetch: ${url}`);
  return Promise.resolve(next);
});

beforeEach(() => {
  pageResponses = [];
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("safeFetch", () => {
  it("returns the response + normalized final URL for a 200", async () => {
    pageResponses = [new Response("<html></html>", { status: 200 })];

    const { response, finalUrl } = await safeFetch("https://start.test/page");

    expect(response.status).toBe(200);
    expect(finalUrl).toBe("https://start.test/page");
  });

  /** A missing User-Agent is not neutral: CloudFront and similar WAFs answer it
   * with 403 while accepting any value, which made reachable sites look like
   * they were blocking the checker. */
  it("identifies itself with a User-Agent on every hop", async () => {
    pageResponses = [
      redirectTo("https://other.test/next"),
      new Response("<html></html>", { status: 200 }),
    ];

    await safeFetch("https://start.test/");

    const calls = pageCalls();
    expect(calls).toHaveLength(2);
    for (const [, init] of calls) {
      expect(new Headers(init?.headers).get("User-Agent")).toMatch(
        /^EchoSEO-Checker\//,
      );
    }
  });

  it("lets a caller override the User-Agent", async () => {
    pageResponses = [new Response("<html></html>", { status: 200 })];

    await safeFetch("https://start.test/", {
      init: { headers: { "User-Agent": "Custom/9.9" } },
    });

    const [, init] = pageCalls()[0];
    expect(new Headers(init?.headers).get("User-Agent")).toBe("Custom/9.9");
  });

  it("follows a public redirect and re-validates the hop", async () => {
    pageResponses = [
      redirectTo("https://other.test/next"),
      new Response("<html></html>", { status: 200 }),
    ];

    const { response, finalUrl } = await safeFetch("https://start.test/");

    expect(response.status).toBe(200);
    expect(finalUrl).toBe("https://other.test/next");
  });

  it("blocks a redirect to a private address (SSRF)", async () => {
    pageResponses = [redirectTo("http://192.168.0.1/admin")];

    await expect(safeFetch("https://start.test/")).rejects.toMatchObject({
      code: "CRAWL_TARGET_BLOCKED",
    } satisfies Partial<AppError>);
  });

  it("blocks a redirect to the cloud metadata IP", async () => {
    pageResponses = [redirectTo("http://169.254.169.254/latest/meta-data/")];

    await expect(safeFetch("https://start.test/")).rejects.toMatchObject({
      code: "CRAWL_TARGET_BLOCKED",
    } satisfies Partial<AppError>);
  });

  it("rejects an initial private target before any page fetch", async () => {
    await expect(safeFetch("http://127.0.0.1:8080/")).rejects.toMatchObject({
      code: "CRAWL_TARGET_BLOCKED",
    } satisfies Partial<AppError>);
    // 127.0.0.1 is an IP literal → blocked synchronously, no DoH or page fetch.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops after exceeding the redirect budget", async () => {
    pageResponses = [
      redirectTo("https://a.test/1"),
      redirectTo("https://a.test/2"),
      redirectTo("https://a.test/3"),
    ];

    await expect(
      safeFetch("https://start.test/", { maxRedirects: 1 }),
    ).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    } satisfies Partial<AppError>);
  });

  it("maps a network-level failure to UPSTREAM_UNAVAILABLE", async () => {
    fetchMock.mockImplementationOnce((input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url.includes(DOH_HOST)) return Promise.resolve(dohEmpty());
      return Promise.reject(new TypeError("network error"));
    });

    await expect(safeFetch("https://start.test/")).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    } satisfies Partial<AppError>);
  });
});

describe("readBoundedText", () => {
  it("returns the body when under the cap", async () => {
    const text = await readBoundedText(new Response("hello world"), 1_000);

    expect(text).toBe("hello world");
  });

  it("rejects fast via Content-Length before reading the body", async () => {
    const response = new Response("small", {
      headers: { "content-length": "999999999" },
    });

    await expect(readBoundedText(response, 1_000)).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    } satisfies Partial<AppError>);
  });

  it("caps a streamed body that understates its size (decompression-bomb case)", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("a".repeat(2_000)));
        controller.close();
      },
    });
    const response = new Response(stream);

    await expect(readBoundedText(response, 100)).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    } satisfies Partial<AppError>);
  });
});
