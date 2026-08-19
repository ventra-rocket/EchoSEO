/**
 * Text extraction that respects the boundaries a browser renders.
 *
 * Cheerio's `.text()` concatenates descendant text nodes with no separator, so
 * `<h1><span>Xây dựng hệ thống</span><span>đẳng cấp thế giới</span></h1>` reads
 * back as `thốngđẳng` — a word that exists on no page — and every fused
 * boundary also costs the word count one word.
 *
 * The naive fix (a space at every boundary) breaks the other direction:
 * `un<b>der</b>` must stay `under`. There is no single rule that is right for
 * both, because `<span>` is inline by default and only becomes a line through
 * CSS we never load. So the two readers get the rule that fails safely for what
 * they are used for:
 *
 * - {@link headingText} separates at **every element boundary**. A heading that
 *   splits one word across inline tags is rare, and a spurious space there is
 *   cosmetic; a fused word misreads the page's most important line.
 * - {@link visibleText} separates at **block-level tags and `<br>`** only.
 *   Inline elements that CSS turns into blocks stay fused, so the count can
 *   still be low — but over-counting is the safer error for thin-content rules,
 *   and this direction never invents words.
 *
 * `<title>` needs neither: the HTML parser treats its content as raw text, so
 * it can hold no element boundary to separate at.
 *
 * Do not "simplify" either rule to a shared one. See issue #79.
 */

/**
 * The slice of a parsed HTML node this walk needs. Declared structurally so the
 * module does not reach past cheerio into its parser package, which pnpm does
 * not expose to us anyway.
 */
interface HtmlNode {
  readonly type: string;
  readonly data?: string;
  readonly name?: string;
  readonly children?: readonly HtmlNode[];
}

/**
 * Tags whose content a browser does not render as page text. Matches the set
 * the word count has always stripped, so this module changes where separators
 * go and nothing else.
 */
const SKIP_TAGS = new Set(["script", "style", "noscript", "svg"]);

/**
 * Tags a browser lays out on their own line. `<br>` is here for the same reason
 * even though it has no content: it renders a break.
 */
const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "br",
  "caption",
  "dd",
  "details",
  "dialog",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "hr",
  "legend",
  "li",
  "main",
  "menu",
  "nav",
  "ol",
  "option",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

/** True where a tag's edges render as a break in page text. */
type Boundary = (tagName: string) => boolean;

const atBlock: Boundary = (tagName) => BLOCK_TAGS.has(tagName);
const atEveryElement: Boundary = () => true;

/**
 * Inside a heading the every-boundary rule wins even when the walk started
 * under the block rule, so the word count can never fuse a word on the same
 * line the H1 field reports unfused. A reader compares those two numbers.
 */
const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/**
 * Depth-first walk pushing text fragments in document order.
 *
 * Fragments are collected instead of concatenated because a 118 KB product page
 * carries thousands of text nodes, and this runs once per crawled page. The
 * outermost node's own separators are trimmed off at the end, so a caller may
 * hand in a block element without it skewing the result.
 */
function walk(
  nodes: readonly HtmlNode[],
  out: string[],
  boundary: Boundary,
): void {
  for (const node of nodes) {
    if (node.type === "text") {
      if (node.data) out.push(node.data);
      continue;
    }
    // Comments, doctypes and processing instructions render nothing, and are
    // the only other node kinds that carry no tag name.
    if (node.name === undefined) continue;
    if (SKIP_TAGS.has(node.name)) continue;
    const separates = boundary(node.name);
    if (separates) out.push("\n");
    if (node.children) {
      walk(
        node.children,
        out,
        HEADING_TAGS.has(node.name) ? atEveryElement : boundary,
      );
    }
    if (separates) out.push("\n");
  }
}

function extract(node: HtmlNode, boundary: Boundary): string {
  const out: string[] = [];
  walk([node], out, boundary);
  return out.join("").replace(/\s+/g, " ").trim();
}

/**
 * Heading text with a space at every element boundary, so two block spans read
 * as two words. `un<b>der</b>` becomes `un der` — the accepted cost of never
 * reporting a fused word in a heading.
 */
export function headingText(node: HtmlNode): string {
  return extract(node, atEveryElement);
}

/**
 * Page text as a browser lays it out: separated at block-level tags and `<br>`,
 * joined across inline tags. Feeds the word count.
 */
export function visibleText(node: HtmlNode): string {
  return extract(node, atBlock);
}
