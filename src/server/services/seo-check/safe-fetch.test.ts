import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppError } from "@/server/lib/errors";
import { safeFetch } from "./safe-fetch";

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

const fetchMock = vi.fn((input: RequestInfo | URL) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
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
});
