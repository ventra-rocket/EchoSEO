/**
 * Pure IndexNow helpers — no database, no network. The IndexNow protocol lets a
 * site tell participating engines (Bing, Yandex, Seznam, Naver, … — NOT Google)
 * that URLs changed. Host ownership is proven by serving `<key>.txt` at the host
 * root; a submission receipt is acceptance, never an indexing guarantee.
 */

/** The public IndexNow aggregator; it fans a submission out to every engine. */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** IndexNow accepts at most 10 000 URLs per request. */
const INDEXNOW_MAX_URLS = 10_000;

/**
 * An IndexNow key must be 8–128 characters of `[a-zA-Z0-9-]`. A 32-char hex
 * string fits and carries 128 bits of entropy. It is host-submission proof, not
 * a secret (it is served publicly at the key location), so a CSPRNG is used for
 * unguessability rather than confidentiality.
 */
export function generateIndexNowKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Where the key file must be served: the host root, e.g. https://x.com/<key>.txt */
export function keyLocationFor(origin: string, key: string): string {
  return `${new URL(origin).origin}/${key}.txt`;
}

/** The key file verifies when its body is exactly the key (whitespace trimmed). */
export function keyFileMatches(body: string, key: string): boolean {
  return body.trim() === key;
}

interface CrawledPage {
  url: string;
  statusCode: number | null;
  isIndexable: boolean;
  isHtml: boolean;
}

/**
 * The URLs eligible to submit for `host`: indexable, 200, HTML pages, deduped and
 * capped at the IndexNow limit. The same-host filter stops a cross-host link that
 * slipped into the crawl from ever being submitted under this host's key.
 */
export function selectSubmittableUrls(
  pages: CrawledPage[],
  host: string,
): string[] {
  const normalizedHost = host.toLowerCase();
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const page of pages) {
    if (urls.length >= INDEXNOW_MAX_URLS) break;
    if (!page.isIndexable || page.statusCode !== 200 || !page.isHtml) continue;

    let sameHost = false;
    try {
      sameHost = new URL(page.url).hostname.toLowerCase() === normalizedHost;
    } catch {
      continue;
    }
    if (!sameHost || seen.has(page.url)) continue;

    seen.add(page.url);
    urls.push(page.url);
  }

  return urls;
}

interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export function buildIndexNowPayload(input: {
  host: string;
  key: string;
  keyLocation: string;
  urls: string[];
}): IndexNowPayload {
  return {
    host: input.host,
    key: input.key,
    keyLocation: input.keyLocation,
    urlList: input.urls,
  };
}
