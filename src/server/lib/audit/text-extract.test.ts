import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";
import { analyzeHtml } from "./page-analyzer";
import { headingText, visibleText } from "./text-extract";

function first(html: string, selector: string) {
  const node = cheerio.load(html)(selector).get(0);
  if (!node) throw new Error(`no ${selector} in fixture`);
  return node;
}

function analyze(html: string) {
  return analyzeHtml(html, "https://a.com/", 200, 10);
}

/**
 * The rule under test, stated once so the next reader does not "fix" it back:
 *
 * - heading text separates at EVERY element boundary
 * - page text separates at BLOCK-LEVEL tags and `<br>` only
 *
 * Neither rule is right for both readers; see `text-extract.ts` and issue #79.
 */
describe("headingText — separates at every element boundary", () => {
  it("reads two block spans as two words, not one fused word", () => {
    // The live regression: ventrarocket.vn reported "Xây dựng hệ thốngđẳng cấp
    // thế giới", a word that appears on no page.
    const h1 = first(
      `<h1>
         <span class="block">Xây dựng hệ thống</span>
         <span class="block bg-gradient-to-r">đẳng cấp thế giới</span>
       </h1>`,
      "h1",
    );

    expect(headingText(h1)).toBe("Xây dựng hệ thống đẳng cấp thế giới");
  });

  it("separates a text node from a following element", () => {
    const h1 = first("<h1>Pricing<span>for teams</span></h1>", "h1");

    expect(headingText(h1)).toBe("Pricing for teams");
  });

  it("drops an svg icon instead of leaking its title text", () => {
    const h1 = first(`<h1><svg><title>icon</title></svg>Contact us</h1>`, "h1");

    expect(headingText(h1)).toBe("Contact us");
  });

  it("accepts the cost of the rule: an inline-split word gains a space", () => {
    // `un<b>der</b>` inside a heading reads "un der". This is deliberate — a
    // spurious space is cosmetic, a fused word misreads the page's main line.
    const h1 = first("<h1>un<b>der</b></h1>", "h1");

    expect(headingText(h1)).toBe("un der");
  });
});

describe("visibleText — separates at block boundaries only", () => {
  it("keeps a word split across inline tags whole", () => {
    const p = first("<p>un<b>der</b></p>", "p");

    expect(visibleText(p)).toBe("under");
  });

  it("separates across block tags and <br>", () => {
    const body = first(
      "<body><div>one</div><div>two</div><p>three<br>four</p></body>",
      "body",
    );

    expect(visibleText(body)).toBe("one two three four");
  });

  it("skips script, style, noscript and svg content", () => {
    const body = first(
      `<body>real
         <script>var fused = 1;</script>
         <style>.a{color:red}</style>
         <noscript>enable js</noscript>
         <svg><title>icon</title></svg>
       </body>`,
      "body",
    );

    expect(visibleText(body)).toBe("real");
  });

  it("ignores comments", () => {
    const p = first("<p>a<!-- hidden -->b</p>", "p");

    expect(visibleText(p)).toBe("ab");
  });
});

describe("analyzeHtml — the two rules as the page reports them", () => {
  it("reports the heading unfused and counts every rendered word", () => {
    const analysis = analyze(
      `<html><head><title>Ventra Rocket</title></head>
       <body>
         <h1><span class="block">Xây dựng hệ thống</span><span class="block">đẳng cấp thế giới</span></h1>
         <div>one</div><div>two</div>
       </body></html>`,
    );

    expect(analysis.h1s).toEqual(["Xây dựng hệ thống đẳng cấp thế giới"]);
    // 8 heading words + 2 div words. The old reading was 8: "thốngđẳng" fused
    // the spans into one word, and "onetwo" fused the two divs.
    expect(analysis.wordCount).toBe(10);
    // The count agrees with the heading it shows: every H1 word is counted.
    expect(analysis.h1s[0].split(" ")).toHaveLength(8);
  });

  it("does not count a word twice when inline tags split it", () => {
    const analysis = analyze("<body><p>un<b>der</b>stood</p></body>");

    expect(analysis.wordCount).toBe(1);
  });

  it("reports zero words for an empty body", () => {
    expect(analyze("<body></body>").wordCount).toBe(0);
  });

  it("leaves the title alone, which needs no separator", () => {
    // `<title>` content is raw text to the parser, so it can hold no element
    // boundary. Asserted so a later change does not "align" it with headings.
    expect(analyze("<title>A <b>B</b> C</title>").title).toBe("A <b>B</b> C");
  });
});
