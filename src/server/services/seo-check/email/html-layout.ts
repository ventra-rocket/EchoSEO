/**
 * Wraps an email body in a real HTML document.
 *
 * Both templates used to ship bare `<p>` fragments. Mail clients cope, but
 * filters read a fragment as a sign of something assembled by a script rather
 * than by anyone who expected a human to read it — and this funnel's mail
 * already has to work against the resemblance its subject matter carries.
 *
 * Styling stays inline and minimal: `<style>` blocks are stripped by most
 * clients, and every extra flourish is one more thing to score against.
 */
import { escapeHtml } from "../output-encode";

const BODY_STYLE = [
  "margin:0",
  "padding:24px",
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  "font-size:15px",
  "line-height:1.5",
  "color:#1f2937",
].join(";");

export function emailHtmlDocument(title: string, bodyHtml: string): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    "</head>",
    `<body style="${BODY_STYLE}">`,
    bodyHtml,
    "</body>",
    "</html>",
  ].join("\n");
}
