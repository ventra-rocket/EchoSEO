import { describe, expect, it } from "vitest";
import {
  buildIndexNowPayload,
  generateIndexNowKey,
  keyFileMatches,
  keyLocationFor,
  selectSubmittableUrls,
} from "./indexnow";

function page(
  url: string,
  over: Partial<{
    statusCode: number | null;
    isIndexable: boolean;
    isHtml: boolean;
  }> = {},
) {
  return {
    url,
    // `?? 200` would clobber an explicit null (a failed fetch), so keep null.
    statusCode: over.statusCode === undefined ? 200 : over.statusCode,
    isIndexable: over.isIndexable ?? true,
    isHtml: over.isHtml ?? true,
  };
}

describe("generateIndexNowKey", () => {
  it("produces a 32-char lowercase hex key in the IndexNow charset", () => {
    const key = generateIndexNowKey();
    expect(key).toMatch(/^[a-f0-9]{32}$/);
  });

  it("does not repeat across calls", () => {
    expect(generateIndexNowKey()).not.toBe(generateIndexNowKey());
  });
});

describe("keyLocationFor / keyFileMatches", () => {
  it("places the key file at the host root", () => {
    expect(keyLocationFor("https://x.test", "abc")).toBe(
      "https://x.test/abc.txt",
    );
    expect(keyLocationFor("https://x.test/some/path", "abc")).toBe(
      "https://x.test/abc.txt",
    );
  });

  it("verifies only an exact (trimmed) key body", () => {
    expect(keyFileMatches("abc\n", "abc")).toBe(true);
    expect(keyFileMatches("  abc  ", "abc")).toBe(true);
    expect(keyFileMatches("abcd", "abc")).toBe(false);
    expect(keyFileMatches("", "abc")).toBe(false);
  });
});

describe("selectSubmittableUrls", () => {
  const host = "x.test";

  it("keeps only indexable, 200, HTML pages of the host", () => {
    const urls = selectSubmittableUrls(
      [
        page("https://x.test/a"),
        page("https://x.test/noindex", { isIndexable: false }),
        page("https://x.test/404", { statusCode: 404 }),
        page("https://x.test/file.pdf", { isHtml: false }),
        page("https://other.test/b"), // cross-host
        page("https://x.test/failed", { statusCode: null }),
      ],
      host,
    );
    expect(urls).toEqual(["https://x.test/a"]);
  });

  it("dedupes repeated URLs", () => {
    const urls = selectSubmittableUrls(
      [
        page("https://x.test/a"),
        page("https://x.test/a"),
        page("https://x.test/b"),
      ],
      host,
    );
    expect(urls).toEqual(["https://x.test/a", "https://x.test/b"]);
  });

  it("caps at the IndexNow maximum", () => {
    const pages = Array.from({ length: 10_050 }, (_, i) =>
      page(`https://x.test/p${i}`),
    );
    expect(selectSubmittableUrls(pages, host)).toHaveLength(10_000);
  });

  it("skips a malformed URL rather than throwing", () => {
    const urls = selectSubmittableUrls(
      [page("not a url"), page("https://x.test/ok")],
      host,
    );
    expect(urls).toEqual(["https://x.test/ok"]);
  });
});

describe("buildIndexNowPayload", () => {
  it("shapes the IndexNow request body", () => {
    expect(
      buildIndexNowPayload({
        host: "x.test",
        key: "k",
        keyLocation: "https://x.test/k.txt",
        urls: ["https://x.test/a"],
      }),
    ).toEqual({
      host: "x.test",
      key: "k",
      keyLocation: "https://x.test/k.txt",
      urlList: ["https://x.test/a"],
    });
  });
});
