import { describe, expect, it } from "vitest";
import {
  emailBadge,
  emailButton,
  emailDivider,
  emailFooter,
  emailHeading,
  emailHtmlDocument,
  emailLink,
  emailMuted,
  emailOrderedList,
  emailParagraph,
  emailQuote,
  emailRawParagraph,
  emailSection,
  emailTable,
  type EmailCell,
} from "./html-layout";

/** What a scanned page title or a GSC query can actually contain. */
const HOSTILE = `<script>alert("x")</script>`;

describe("escaping convention", () => {
  // Every `string` parameter in this module is plain text. The convention only
  // holds if it holds everywhere, so each text-taking helper is checked rather
  // than a representative one — a single unescaped helper is a live XSS in a
  // webmail client, and report content is full of user-supplied strings.
  it.each([
    ["emailHeading", () => emailHeading(HOSTILE)],
    ["emailParagraph", () => emailParagraph(HOSTILE)],
    ["emailMuted", () => emailMuted(HOSTILE)],
    ["emailLink", () => emailLink("https://example.test", HOSTILE)],
    ["emailButton", () => emailButton("https://example.test", HOSTILE)],
    ["emailBadge", () => emailBadge(HOSTILE, "critical")],
    ["emailSection title", () => emailSection(HOSTILE, "<p>safe</p>")],
    ["emailOrderedList", () => emailOrderedList([HOSTILE])],
    ["emailQuote text", () => emailQuote(HOSTILE, "https://example.test", "s")],
    [
      "emailQuote label",
      () => emailQuote("q", "https://example.test", HOSTILE),
    ],
    ["emailTable header", () => emailTable({ headers: [HOSTILE], rows: [] })],
    [
      "emailTable cell",
      () => emailTable({ headers: ["h"], rows: [[{ text: HOSTILE }]] }),
    ],
  ])("%s escapes untrusted text", (_label, render) => {
    const html = render();

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    // The quotes matter as much as the angle brackets: unescaped, they break
    // out of the surrounding `style="..."`/`href="..."` attribute.
    expect(html).toContain("&quot;");
  });

  it("escapes the document title but passes the body through as HTML", () => {
    const html = emailHtmlDocument(HOSTILE, "<p>already rendered</p>");

    expect(html).toContain(`<title>&lt;script&gt;`);
    expect(html).toContain("<p>already rendered</p>");
  });

  it("emailRawParagraph does not escape, by design", () => {
    // The one named hole in the convention: it exists so a caller can put a
    // badge inline with text without hand-splicing `<p>` tags, and it accepts
    // only output of helpers in this file — never a value from the database,
    // GSC, or a crawl. Asserted so the boundary is visible to whoever reads
    // this file next.
    const html = emailRawParagraph(
      `Homepage title missing ${emailBadge("critical", "critical")}`,
    );

    expect(html).toContain("<span");
    expect(html).not.toContain("&lt;span");
    expect(emailRawParagraph(HOSTILE)).toContain("<script>");
  });
});

describe("href handling", () => {
  it.each([
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["relative", "/reports/1"],
    ["empty", ""],
  ])("renders %s hrefs as inert text, never an anchor", (_label, href) => {
    // Report URLs come from crawled pages, so these are reachable inputs.
    // Escaping alone is not enough — some clients decode `javascript&#58;`
    // back into an executable attribute — so the scheme is allowlisted and
    // anything else degrades to text the reader can still see.
    expect(emailLink(href, "click")).toBe("click");
    expect(emailButton(href, "click")).not.toContain("<a ");
    const cell = emailTable({
      headers: ["url"],
      rows: [[{ text: "click", href }]],
    });
    expect(cell).not.toContain("<a ");
  });

  it.each([
    ["https", "https://example.test/r/1?a=b&c=d"],
    ["http", "http://localhost:5173/r/1"],
  ])("keeps %s hrefs and escapes them into the attribute", (_label, href) => {
    const html = emailLink(href, "open");

    expect(html).toContain("<a href=");
    expect(html).not.toContain("&c=d");
    expect(html).toContain(href.replace("&", "&amp;"));
  });
});

describe("emailTable", () => {
  it("renders one cell per entry, ragged rows included", () => {
    const rows: EmailCell[][] = [
      [{ text: "a" }, { text: "1", align: "right" }],
      [{ text: "b" }, { text: "2", align: "right" }],
      // A short row stays short: padding it here would hide a caller bug
      // behind a plausible-looking table.
      [{ text: "c" }],
    ];

    const html = emailTable({ headers: ["name", "count"], rows });

    expect(html.match(/<th /g)).toHaveLength(2);
    expect(html.match(/<td /g)).toHaveLength(5);
    expect(html.match(/<tr>/g)).toHaveLength(4);
  });

  it("right-aligns the cells that ask for it, and their header with them", () => {
    const html = emailTable({
      headers: ["page", "clicks"],
      rows: [
        [
          { text: "/", align: "left" },
          { text: "12", align: "right" },
        ],
      ],
    });

    expect(html.match(/text-align:right/g)).toHaveLength(2);
  });

  it("keeps odd rows white and tints the even ones", () => {
    const html = emailTable({
      headers: ["h"],
      rows: [[{ text: "1" }], [{ text: "2" }], [{ text: "3" }]],
    });

    expect(html.match(/background-color:#ffffff/g)).toHaveLength(2);
    expect(html.match(/background-color:#f9fafb/g)).toHaveLength(1);
  });
});

describe("mail-client compatibility", () => {
  // Outlook renders through Word: no flexbox, no grid, no custom properties,
  // and `<style>` blocks are stripped by most clients. Anything from the app's
  // CSS vocabulary leaking in here only fails in someone's inbox, where it is
  // invisible to every other test in this repo.
  const everything = [
    emailHeading("h", 1),
    emailParagraph("p"),
    emailRawParagraph(emailBadge("critical", "critical")),
    emailMuted("m"),
    emailLink("https://example.test", "l"),
    emailButton("https://example.test", "b"),
    emailBadge("warning", "warning"),
    emailBadge("neutral", "neutral"),
    emailBadge("positive", "positive"),
    emailSection("s", emailParagraph("inner")),
    emailTable({ headers: ["h"], rows: [[{ text: "c" }]] }),
    emailOrderedList(["one", "two"]),
    emailQuote("q", "https://example.test", "Google"),
    emailDivider(),
    emailFooter(emailLink("https://example.test/u", "Unsubscribe")),
  ].join("\n");

  it.each(["display:flex", "display:grid", "var(--", "<style"])(
    "never emits %s",
    (forbidden) => {
      expect(everything).not.toContain(forbidden);
    },
  );

  it("lays out with presentation tables so screen readers skip the scaffolding", () => {
    expect(emailSection("s", "")).toContain('role="presentation"');
    expect(emailTable({ headers: [], rows: [] })).toContain(
      'role="presentation"',
    );
    expect(emailDivider()).toContain('role="presentation"');
    expect(emailFooter("")).toContain('role="presentation"');
  });
});
