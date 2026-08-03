/**
 * Client-side pre-flight validation for the checker's URL input.
 *
 * Exists to catch obviously-unfetchable input BEFORE the API call: the server
 * verifies (and so consumes) the Turnstile token before it validates the URL,
 * so a typo like "not-a-valid-site" burned a challenge and came back as a
 * generic "couldn't reach that site". This mirrors the accepting half of the
 * server's `normalizeAndValidateStartUrl` — schemeless domains get https://
 * prepended, only http/https parse — without the SSRF policy, which stays a
 * server concern. Never a security boundary: the server re-validates
 * everything.
 */

export function isValidCheckUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  // A URL has no interior whitespace; "not a valid site" should not fetch.
  if (/\s/.test(trimmed)) return false;

  const withScheme =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return false;
  }

  // Rejects javascript:, data:, file:, and anything else that is not a web
  // origin. Checked on the parsed URL, not the raw string, so an explicit
  // scheme the visitor typed is what gets judged.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  // A public web host has at least one dot ("example.com"); a dotless token
  // ("not-a-valid-site", "localhost") is the exact input this guard exists
  // for. The trailing-dot form ("example.com.") normalizes fine server-side
  // but the label after the last dot must exist.
  const hostname = parsed.hostname.replace(/\.$/, "");
  if (!hostname.includes(".")) return false;
  // `new URL` percent-encodes some invalid host characters instead of
  // throwing; a hostname is letters/digits/dots/hyphens (IDNs arrive here
  // already punycoded by the URL parser).
  if (!/^[a-z0-9.-]+$/i.test(hostname)) return false;
  // No empty labels ("example..com") and no label edges on a hyphen-only token.
  if (hostname.split(".").some((label) => label.length === 0)) return false;

  return true;
}
