/**
 * Email document shell plus the small set of building blocks every template is
 * allowed to use.
 *
 * Templates used to ship bare `<p>` fragments. Mail clients cope, but filters
 * read a fragment as a sign of something assembled by a script rather than by
 * anyone who expected a human to read it — and this codebase's mail already has
 * to work against the resemblance its subject matter carries.
 *
 * Two constraints shape everything below, and neither is negotiable:
 *
 * 1. **No modern layout.** Outlook renders through Word, which understands
 *    neither flexbox nor grid nor custom properties, and most clients strip
 *    `<style>` blocks outright. So structure is nested `<table>` and every rule
 *    is an inline `style` attribute. Anything that looks like app CSS here is a
 *    bug that will only show up in someone's inbox.
 * 2. **Helpers escape, callers don't.** Every `string` parameter in this module
 *    is plain text and is escaped here. The single exception is a parameter
 *    literally named `innerHtml`, which is HTML produced by another helper in
 *    this file. That convention exists so no caller ever has to remember to
 *    escape — forgetting is the normal failure mode, and report content is full
 *    of user-supplied URLs and page titles.
 */
import { escapeHtml } from "@/server/services/seo-check/output-encode";

// Typography only, so it can be applied to both <body> and the wrapper cell
// without doubling the frame. Gmail drops <body> styles, which is why the cell
// needs its own copy; the padding lives on the outer table cell alone.
const TEXT_STYLE = [
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  "font-size:15px",
  "line-height:1.5",
  "color:#1f2937",
].join(";");

const BODY_STYLE = ["margin:0", "padding:0", TEXT_STYLE].join(";");

/** Body text. Everything else derives its colour from this one. */
const TEXT_COLOR = "#1f2937";
/** Secondary text: still AA on white (5.7:1), visibly quieter. */
const MUTED_COLOR = "#6b7280";
/** Link blue at 5.2:1 on white — AA for body copy, not just large text. */
const LINK_COLOR = "#2563eb";
/** Hairlines and table borders; decorative, so contrast does not apply. */
const BORDER_COLOR = "#e5e7eb";
/** Table header fill, chosen to stay legible with `TEXT_COLOR` on top. */
const HEADER_BG = "#f3f4f6";
/** Zebra fill for even rows; odd rows stay plain white. */
const ZEBRA_BG = "#f9fafb";

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

/**
 * Content width. 600px is the email convention: it fits the Outlook desktop
 * reading pane without a horizontal scrollbar and leaves room for a phone at
 * 320px once the wrapper's padding is subtracted.
 */
const CONTENT_WIDTH_PX = 600;

export function emailHtmlDocument(
  title: string,
  bodyHtml: string,
  lang: string = "en",
): string {
  return [
    "<!doctype html>",
    `<html lang="${lang}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    "</head>",
    // Gmail strips <body> and re-parents the markup into its own container, so
    // padding and the base font set on <body> are not reliably delivered. The
    // wrapper below carries both instead: every rule that matters survives
    // because it sits on a table cell inside the content Gmail keeps.
    `<body style="${BODY_STYLE}">`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">',
    '<tr><td align="center" style="padding:24px">',
    // Measured, not assumed: a fixed `width:600px` here overflowed a 375px
    // viewport by 273px, because a table cell sizes itself to a fixed-width
    // child rather than clamping it, so `max-width:100%` had nothing smaller to
    // resolve against. A percentage width capped by `max-width` fits every
    // client that understands CSS; the MSO conditional below hands Outlook's
    // Word renderer a real 600px table instead, since it ignores `max-width`.
    // The comment is inert everywhere else.
    `<!--[if mso]><table role="presentation" width="${CONTENT_WIDTH_PX}" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${CONTENT_WIDTH_PX}px;border-collapse:collapse">`,
    `<tr><td style="${TEXT_STYLE}">`,
    bodyHtml,
    "</td></tr>",
    "</table>",
    "<!--[if mso]></td></tr></table><![endif]-->",
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("\n");
}

/**
 * One cell of `emailTable`.
 *
 * `text` is plain text and is escaped on render; `href` turns the cell into a
 * link and is validated like every other URL here.
 */
export type EmailCell = {
  text: string;
  /** Absolute URL; renders the cell as a link. */
  href?: string;
  align?: "left" | "right";
  muted?: boolean;
};

/**
 * Whether a URL may become an `href` at all.
 *
 * Report content carries URLs that came from a scanned page, so `javascript:`
 * and `data:` are reachable inputs, not theoretical ones. Escaping alone does
 * not help — `javascript&#58;alert(1)` is still executed by some clients once
 * the entity is decoded back into the attribute. The only safe answer is a
 * scheme allowlist, and anything failing it is rendered as inert text rather
 * than dropped, so the reader still sees what the page contained.
 *
 * `URL` parsing rather than a prefix check: it also rejects the malformed and
 * the relative, neither of which can work in an inbox anyway.
 */
function isRenderableHref(href: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return false;
  }

  return parsed.protocol === "https:" || parsed.protocol === "http:";
}

/**
 * Renders `text` as a link when `href` is safe, and as plain text when it is
 * not. Shared by every helper that accepts a URL so the fallback is identical
 * everywhere.
 */
function anchorOrText(
  href: string | undefined,
  text: string,
  style: string,
): string {
  const safeText = escapeHtml(text);
  if (!href || !isRenderableHref(href)) return safeText;

  return `<a href="${escapeHtml(href)}" style="${style}">${safeText}</a>`;
}

const LINK_STYLE = `color:${LINK_COLOR};text-decoration:underline`;

export function emailHeading(text: string, level: 1 | 2 | 3 = 2): string {
  // Sizes are absolute px, not `em`: Outlook's inherited font size on a heading
  // inside a table cell is not the browser's, so relative units drift.
  const sizes: Record<1 | 2 | 3, string> = {
    1: "22px",
    2: "18px",
    3: "15px",
  };
  const style = [
    `margin:0 0 12px`,
    `font-family:${FONT_STACK}`,
    `font-size:${sizes[level]}`,
    "font-weight:600",
    "line-height:1.3",
    `color:${TEXT_COLOR}`,
  ].join(";");

  return `<h${level} style="${style}">${escapeHtml(text)}</h${level}>`;
}

const PARAGRAPH_STYLE = [
  "margin:0 0 12px",
  `font-family:${FONT_STACK}`,
  "font-size:15px",
  "line-height:1.5",
  `color:${TEXT_COLOR}`,
].join(";");

export function emailParagraph(text: string): string {
  return `<p style="${PARAGRAPH_STYLE}">${escapeHtml(text)}</p>`;
}

/**
 * The one deliberate hole in the escape-everything convention, and the reason
 * it stays a convention instead of becoming folklore.
 *
 * A weekly report needs a badge sitting inline with its sentence — "Homepage
 * title missing [critical]" — and there is no way to express that with
 * `emailParagraph`, whose whole job is to make markup impossible. Without this,
 * every caller would hand-splice `<p>` tags around `emailBadge(...)` output,
 * which is exactly the habit the convention exists to prevent: once one caller
 * writes raw markup, the next one writes raw markup around a page title.
 *
 * So the hole is named, single, and narrow. `innerHtml` accepts **only** the
 * return value of helpers in this file (composed with plain string
 * concatenation and literal punctuation). It must never receive a value that
 * came from the database, the GSC API, a crawled page, or a request — those go
 * through `emailParagraph`, `emailBadge`, `emailLink` or a table cell, which
 * escape.
 */
export function emailRawParagraph(innerHtml: string): string {
  return `<p style="${PARAGRAPH_STYLE}">${innerHtml}</p>`;
}

export function emailMuted(text: string): string {
  const style = [
    "margin:0 0 12px",
    `font-family:${FONT_STACK}`,
    "font-size:13px",
    "line-height:1.5",
    `color:${MUTED_COLOR}`,
  ].join(";");

  return `<p style="${style}">${escapeHtml(text)}</p>`;
}

export function emailLink(href: string, text: string): string {
  return anchorOrText(href, text, LINK_STYLE);
}

/**
 * A call to action that survives clients with images disabled — it is a padded
 * link, not a background image or a VML shape, so the worst case is an
 * unstyled but working link rather than an invisible one.
 *
 * An unsafe `href` degrades to the label as plain text: a button that goes
 * nowhere is less harmful than a button that runs something.
 */
export function emailButton(href: string, label: string): string {
  const style = [
    "display:inline-block",
    "padding:10px 18px",
    `background-color:${TEXT_COLOR}`,
    "color:#ffffff",
    `font-family:${FONT_STACK}`,
    "font-size:15px",
    "font-weight:600",
    "line-height:1.2",
    "border-radius:6px",
    "text-decoration:none",
  ].join(";");

  const rendered = anchorOrText(href, label, style);

  return `<p style="margin:0 0 16px">${rendered}</p>`;
}

/**
 * Severity pill. Tone pairs are picked for contrast, not just hue: each text
 * colour clears WCAG AA (4.5:1) against its own fill, because a "critical"
 * badge nobody can read defeats the point of colour-coding at all.
 *
 * The tone is also spelled out in the badge text by callers, since roughly one
 * reader in twelve cannot separate the red from the green.
 */
export function emailBadge(
  text: string,
  tone: "critical" | "warning" | "neutral" | "positive",
): string {
  const tones: Record<typeof tone, { bg: string; fg: string }> = {
    critical: { bg: "#fee2e2", fg: "#991b1b" },
    warning: { bg: "#fef3c7", fg: "#92400e" },
    neutral: { bg: "#f3f4f6", fg: "#374151" },
    positive: { bg: "#dcfce7", fg: "#166534" },
  };
  const { bg, fg } = tones[tone];
  const style = [
    "display:inline-block",
    "padding:2px 8px",
    `background-color:${bg}`,
    `color:${fg}`,
    `font-family:${FONT_STACK}`,
    "font-size:12px",
    "font-weight:600",
    "line-height:1.6",
    "border-radius:10px",
    "white-space:nowrap",
  ].join(";");

  return `<span style="${style}">${escapeHtml(text)}</span>`;
}

/**
 * A titled block of content, separated by whitespace rather than a card:
 * borders and shadows are the first things a filter reads as "marketing", and
 * a weekly report has no reason to look like one.
 */
export function emailSection(title: string, innerHtml: string): string {
  return [
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 24px">',
    "<tr>",
    '<td style="padding:0">',
    emailHeading(title, 2),
    innerHtml,
    "</td>",
    "</tr>",
    "</table>",
  ].join("\n");
}

/**
 * Data table for report figures.
 *
 * `role="presentation"` because this table *is* the layout as far as a screen
 * reader in a mail client is concerned — mail clients' table semantics are
 * unreliable and an announced grid of one column is worse than none. Widths
 * and padding are attributes plus inline styles together: Outlook honours the
 * attributes, everything else honours the styles.
 *
 * Rows are rendered exactly as given, including ragged ones — a short row
 * simply produces fewer cells. Padding rows to the header width here would
 * hide a caller bug behind a plausible-looking table.
 */
export function emailTable(input: {
  headers: string[];
  rows: EmailCell[][];
}): string {
  const { headers, rows } = input;

  const headerCells = headers
    .map((header, index) => {
      const style = [
        "padding:8px 10px",
        `background-color:${HEADER_BG}`,
        `border-bottom:1px solid ${BORDER_COLOR}`,
        `font-family:${FONT_STACK}`,
        "font-size:13px",
        "font-weight:700",
        `color:${TEXT_COLOR}`,
        // Numeric columns are conventionally last; the caller signals intent
        // per body cell, and the header follows the first body row's lead.
        `text-align:${rows[0]?.[index]?.align === "right" ? "right" : "left"}`,
      ].join(";");

      return `<th style="${style}">${escapeHtml(header)}</th>`;
    })
    .join("");

  const bodyRows = rows
    .map((row, rowIndex) => {
      // 1-indexed odd rows stay white; the tint lands on the even ones.
      const background = rowIndex % 2 === 0 ? "#ffffff" : ZEBRA_BG;
      const cells = row
        .map((cell) => {
          const style = [
            "padding:8px 10px",
            `background-color:${background}`,
            `border-bottom:1px solid ${BORDER_COLOR}`,
            `font-family:${FONT_STACK}`,
            "font-size:14px",
            "line-height:1.4",
            `color:${cell.muted ? MUTED_COLOR : TEXT_COLOR}`,
            `text-align:${cell.align === "right" ? "right" : "left"}`,
          ].join(";");

          return `<td style="${style}">${anchorOrText(cell.href, cell.text, LINK_STYLE)}</td>`;
        })
        .join("");

      return `<tr>${cells}</tr>`;
    })
    .join("\n");

  return [
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 16px">',
    `<thead><tr>${headerCells}</tr></thead>`,
    `<tbody>\n${bodyRows}\n</tbody>`,
    "</table>",
  ].join("\n");
}

export function emailOrderedList(items: string[]): string {
  const style = [
    "margin:0 0 12px",
    "padding-left:20px",
    `font-family:${FONT_STACK}`,
    "font-size:15px",
    "line-height:1.6",
    `color:${TEXT_COLOR}`,
  ].join(";");
  const rendered = items
    .map((item) => `<li style="margin:0 0 4px">${escapeHtml(item)}</li>`)
    .join("\n");

  return `<ol style="${style}">\n${rendered}\n</ol>`;
}

/**
 * Quoted guidance with its source.
 *
 * A left rule instead of an indent: `blockquote`'s default margin differs
 * wildly across clients, so the visual cue has to be a border we set. The
 * source link is part of the quote rather than a footnote because the whole
 * point of quoting Google verbatim is that the reader can check it.
 */
export function emailQuote(
  text: string,
  sourceUrl: string,
  sourceLabel: string,
): string {
  const style = [
    "margin:0 0 16px",
    "padding:8px 0 8px 14px",
    `border-left:3px solid ${BORDER_COLOR}`,
    `font-family:${FONT_STACK}`,
    "font-size:14px",
    "line-height:1.5",
    `color:${TEXT_COLOR}`,
  ].join(";");
  const sourceStyle = [
    "margin:6px 0 0",
    `font-family:${FONT_STACK}`,
    "font-size:13px",
    `color:${MUTED_COLOR}`,
  ].join(";");

  return [
    `<blockquote style="${style}">`,
    `<div>${escapeHtml(text)}</div>`,
    `<div style="${sourceStyle}">${anchorOrText(sourceUrl, sourceLabel, LINK_STYLE)}</div>`,
    "</blockquote>",
  ].join("\n");
}

export function emailDivider(): string {
  // An empty bordered cell, not `<hr>`: Outlook gives `<hr>` its own margins
  // and a 3D shading it will not let go of.
  return [
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 20px">',
    "<tr>",
    `<td style="height:1px;line-height:1px;font-size:0;background-color:${BORDER_COLOR}">&nbsp;</td>`,
    "</tr>",
    "</table>",
  ].join("\n");
}

/**
 * Closing block: quieter type, a top rule, and wherever the caller puts it, the
 * place the unsubscribe link belongs. Bulk mail that hides its opt-out is what
 * the header requirements exist to punish.
 */
export function emailFooter(innerHtml: string): string {
  const style = [
    "padding:16px 0 0",
    `border-top:1px solid ${BORDER_COLOR}`,
    `font-family:${FONT_STACK}`,
    "font-size:13px",
    "line-height:1.5",
    `color:${MUTED_COLOR}`,
  ].join(";");

  return [
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:24px 0 0">',
    "<tr>",
    `<td style="${style}">`,
    innerHtml,
    "</td>",
    "</tr>",
    "</table>",
  ].join("\n");
}
