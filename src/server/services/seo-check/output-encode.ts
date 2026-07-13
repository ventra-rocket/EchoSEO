/**
 * Escapes untrusted scanned page content before it reaches render or email.
 *
 * Every string pulled from a scanned page (title, meta description, headings,
 * JSON-LD, ...) must pass through this before storage/render — never render
 * scanned content via `dangerouslySetInnerHTML`.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}
