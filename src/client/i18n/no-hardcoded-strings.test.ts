import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * The gate that would have caught ten untranslated components.
 *
 * On 21/08 the Site Audit surface was converted to react-intl and declared
 * finished after rendering one completed audit. Ten components under
 * `features/audit/` still held hardcoded English — the crawl progress card, the
 * baseline selector, the comparison and page-change panels, the export panel,
 * IndexNow, the periodic report card. None of them render in the state that
 * happens to load first, so nothing on screen said they were missed, and a
 * per-directory grep comes back clean on a page that is already showing two
 * languages.
 *
 * So the check cannot be "did the reviewer see English". It has to be
 * structural: no JSX text and no user-visible attribute in a converted
 * directory may carry prose. A directory joins CONVERTED_DIRS only when it is
 * finished, which also gives the next conversion an objective definition of
 * done instead of someone's reading of a screenshot.
 *
 * The first version of this test scanned `.tsx` only, and that was the same
 * mistake one layer up: five user-visible toasts live in `.ts` hooks
 * (`useRankCheckTrigger`, `useMetricsRefresh`), so the gate would have called
 * a directory clean while English toasts fired over a Vietnamese page. A
 * component is not the only thing a user reads. Hence the second scan below.
 */
const CONVERTED_DIRS = [
  "src/client/features/audit",
  "src/client/features/rank-tracking",
  "src/client/features/gsc",
  "src/client/features/search-performance",
  "src/client/features/keywords",
  "src/client/features/saved-keywords",
  "src/client/layout",
  // A shared component belongs to every surface that renders it. This
  // directory entered the gate only after all prose was converted and the
  // detector learned that JSX text under semantic `<code>` is a technical
  // value (`AUTH_MODE`, `TEAM_DOMAIN`), not a sentence. The exemption is narrow:
  // user-visible attributes on `<code>` are still checked.
  "src/client/components",
  // Keyword Research renders this shared provider gate before any owned page
  // state when a workspace has no DataForSEO key. Listing only `keywords/`
  // would have declared the real first-run screen translated while its main
  // card stayed English. The whole directory is listed now, not just that one
  // file: `useAccessGate.ts` next to it resolved every provider-gate failure
  // through the English-only legacy error map, so four converted surfaces
  // rendered an English sentence under a translated heading. One shared hook,
  // four broken surfaces, and a per-file entry that could not see it.
  "src/client/features/access-gate",
  // A feature directory is not the whole surface: a route file renders the page
  // heading above it. Converting `features/rank-tracking` left "Rank Tracking /
  // Track keyword positions across domains" in English at the top of every
  // Vietnamese rank page, and the directory-shaped gate said nothing. Listed
  // per file because their siblings — `saved.tsx` most of all — are not
  // converted yet.
  "src/routes/_project/p/$projectId/rank-tracking.tsx",
  "src/routes/_project/p/$projectId/keywords.tsx",
  "src/routes/_project/p/$projectId/saved.tsx",
  "src/routes/_project/p/$projectId/rank-tracking/$configId.tsx",
  // The pre-login path. Every entry above sits behind a login that was itself
  // English, so a Vietnamese user met sign-up, verification and onboarding
  // before any translated screen. Listed per route file because the auth
  // routes are siblings of unconverted ones (`subscribe`, `billing`).
  "src/client/features/onboarding",
  // Both auth routes render their inputs through this directory's shared
  // `AuthTextField`, so it belongs to the pre-login surface the same way
  // `src/client/components` belongs to the dashboard. It holds message ids
  // rather than copy, which is why it enters the gate clean.
  "src/client/features/auth",
  "src/routes/_auth.sign-in.tsx",
  "src/routes/_auth.sign-up.tsx",
  "src/routes/verify-email.tsx",
  "src/routes/forgot-password.tsx",
  "src/routes/reset-password.tsx",
  "src/routes/_authenticated.oauth-consent.tsx",
  // The two provider-backed data surfaces. Their live result states need a
  // DataForSEO key, so conversion was verified with the real components and
  // catalogs under fixture-shaped props plus the key-missing gate that a
  // keyless workspace actually reaches — not by opening a populated table.
  "src/client/features/domain",
  "src/client/features/backlinks",
  "src/routes/_project/p/$projectId/domain.tsx",
  "src/routes/_project/p/$projectId/backlinks.tsx",
  // The last four English surfaces, closing #103-#106. `_app/ai.tsx` is listed
  // per file because its siblings (`subscribe`, `billing`) travel with their own
  // issues, and the AI page is the one that documents MCP tools to agents as
  // well as to people.
  "src/client/features/ai-search",
  "src/client/features/assistant-workspace",
  "src/client/features/projects",
  "src/client/features/billing",
  "src/client/features/lighthouse",
  "src/routes/_app/ai.tsx",
  // The `/ai` page renders half its content from this directory: the copy
  // control, the setup guides, the tool list and the skills section. Converting
  // only the route left "Copy", "Copied to clipboard" and two clipboard-failure
  // toasts in English on a Vietnamese page — the same shape as the access-gate
  // hook, found the same way, by reading the screen instead of the gate.
  "src/client/features/ai-mcp",
  "src/routes/_app/settings.tsx",
  "src/routes/_app/projects.tsx",
  "src/routes/_app/billing.tsx",
  "src/routes/_app/support.tsx",
  "src/routes/_app/help/dataforseo-api-key.tsx",
  "src/routes/_authenticated.subscribe.tsx",
];

/**
 * Prose reaches a user through these calls without ever being JSX. `toast.*` is
 * the common one; the second argument of `getStandardErrorMessage` is a
 * user-facing fallback that only renders when a request fails, which is exactly
 * the state nobody opens while translating.
 */
const PROSE_SINKS = new Set([
  "toast",
  "toast.error",
  "toast.info",
  "toast.loading",
  "toast.message",
  "toast.success",
  "toast.warning",
  "getStandardErrorMessage",
  "getLocalizedErrorMessage",
]);

/**
 * Attributes a user reads. `title` and `aria-label` matter most: they are the
 * two that hide from a visual pass entirely, and one of them carried the
 * "measured zero" claim the rank overlay had to walk back.
 */
const USER_VISIBLE_ATTRS = new Set([
  "alt",
  "aria-description",
  "aria-label",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "data-tip",
  "placeholder",
  "title",
]);

/** Visible defaults in shared component prop destructuring. */
const USER_VISIBLE_PROP_DEFAULTS = new Set([
  "ariaLabel",
  "label",
  "placeholder",
  "selectedLabel",
  "title",
]);

/**
 * Proper nouns stay untranslated on purpose, matching the shipped bilingual
 * report copy: a Vietnamese reader looking for "Lighthouse" in the Cloudflare
 * dashboard needs to find the same word here. Exact strings only — a set of
 * substrings would quietly excuse a sentence for containing one brand.
 */
const ALLOWED_LITERALS = new Set([
  "DataForSEO",
  "EchoSEO",
  // The visual wordmark splits EchoSEO into two spans only to color "SEO".
  // They remain exact brand fragments, not translatable words.
  "Echo",
  "SEO",
  "Google",
  "Google Search Console",
  "IndexNow",
  "Lighthouse",
  "Search Console",
  // A unit, not a word: "ms" reads the same in both catalogs, and spelling it
  // through a message id would make every latency cell a translation lookup.
  "ms",
]);

/** Prose is two or more consecutive Latin letters. `·`, `→`, `4/4`, `%` are not. */
const PROSE = /\p{Script=Latin}{2,}/u;

/**
 * `&mdash;` and `&ldquo;` are punctuation a reader never reads as words, but
 * their entity names are Latin letters, so they have to come out before the
 * prose test rather than be excused one spelling at a time.
 */
const HTML_ENTITY = /&[a-z]+\d*;/gi;

/** A bare URL is an example, not a sentence — `https://example.com` is identical in both locales. */
const BARE_URL = /^https?:\/\/\S+$/i;

type Finding = { file: string; line: number; text: string };

/**
 * Takes a directory or a single file, because a surface can be converted before
 * the directory around it is: listing one finished file is honest, and listing
 * its directory would claim 43 unconverted strings are done.
 */
function sourceFilesIn(target: string): string[] {
  if (!statSync(target).isDirectory()) return [target];

  const out: string[] = [];
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    const path = join(target, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFilesIn(path));
      continue;
    }
    const isSource = entry.name.endsWith(".tsx") || entry.name.endsWith(".ts");
    const isTest = entry.name.includes(".test.");
    if (isSource && !isTest) out.push(path);
  }
  return out;
}

/** `toast.error` reads as a property access; `getStandardErrorMessage` as a bare name. */
function calleeName(node: ts.CallExpression): string {
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) {
    const target = callee.expression;
    return ts.isIdentifier(target)
      ? `${target.text}.${callee.name.text}`
      : callee.name.text;
  }
  return "";
}

/**
 * Uppercase identifiers inside a semantic `<code>` element are data, not
 * prose. `AUTH_MODE`, `TEAM_DOMAIN` and `POLICY_AUD` must be identical in every
 * locale. Walk every ancestor rather than checking only the immediate parent:
 * `<code><span>AUTH_MODE</span></code>` is still code.
 *
 * The caller also checks CODE_IDENTIFIER: ordinary prose inside `<code>` and a
 * `title="Copy this value"` on it must still go through react-intl.
 */
function isInsideCodeElement(node: ts.Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (
      ts.isJsxElement(current) &&
      ts.isIdentifier(current.openingElement.tagName) &&
      current.openingElement.tagName.text === "code"
    ) {
      return true;
    }
  }
  return false;
}

/** Configuration identifiers are code; prose inside `<code>` is still prose. */
const CODE_IDENTIFIER = /^[A-Z][A-Z0-9_]*$/;

/**
 * A template literal is prose if any of its fixed spans is. `Metrics updated
 * for ${n} keywords` has to be caught: the interpolation is what makes it look
 * like a value rather than a sentence.
 */
function stringArgumentProse(node: ts.Expression): string | null {
  if (ts.isStringLiteral(node)) return isProse(node.text) ? node.text : null;
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return isProse(node.text) ? node.text : null;
  }
  if (ts.isTemplateExpression(node)) {
    const spans = [
      node.head.text,
      ...node.templateSpans.map((s) => s.literal.text),
    ];
    const firstInterpolation =
      node.head.text === "" && spans[1]?.startsWith("/")
        ? "https://example.invalid"
        : node.head.text.endsWith("https://")
          ? "example.invalid"
          : "value";
    const renderedExample = node.templateSpans.reduce(
      (text, span, index) =>
        `${text}${index === 0 ? firstInterpolation : "value"}${span.literal.text}`,
      node.head.text,
    );
    if (BARE_URL.test(renderedExample)) return null;
    const prose = spans.find((span) => isProse(span));
    return prose ? spans.join("${…}") : null;
  }
  return null;
}

function isProse(raw: string): boolean {
  const text = raw.trim();
  if (!text || ALLOWED_LITERALS.has(text)) return false;
  if (BARE_URL.test(text)) return false;
  return PROSE.test(text.replaceAll(HTML_ENTITY, " ").trim());
}

function findHardcodedStrings(file: string): Finding[] {
  return findHardcodedStringsInSource(file, readFileSync(file, "utf8"));
}

function findHardcodedStringsInSource(file: string, source: string): Finding[] {
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const findings: Finding[] = [];

  const record = (node: ts.Node, text: string) => {
    const { line } = tree.getLineAndCharacterOfPosition(node.getStart(tree));
    findings.push({ file, line: line + 1, text: text.trim().slice(0, 60) });
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isJsxText(node) &&
      isProse(node.text) &&
      !(isInsideCodeElement(node) && CODE_IDENTIFIER.test(node.text.trim()))
    ) {
      record(node, node.text);
    }

    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const name = node.name.text;
      const value = node.initializer;
      if (USER_VISIBLE_ATTRS.has(name) && value) {
        // Only a literal is a finding. An expression is either a formatted
        // message or a value, and this test cannot tell which — that is what
        // review is for.
        if (ts.isStringLiteral(value) && isProse(value.text)) {
          record(node, `${name}="${value.text}"`);
        } else if (ts.isJsxExpression(value) && value.expression) {
          const prose = stringArgumentProse(value.expression);
          if (prose) record(node, `${name}={"${prose}"}`);
        }
      }
    }

    if (
      ts.isBindingElement(node) &&
      ts.isIdentifier(node.name) &&
      USER_VISIBLE_PROP_DEFAULTS.has(node.name.text) &&
      node.initializer
    ) {
      const prose = stringArgumentProse(node.initializer);
      if (prose) record(node, `${node.name.text} = "${prose}"`);
    }

    if (ts.isCallExpression(node) && PROSE_SINKS.has(calleeName(node))) {
      const name = calleeName(node);
      for (const argument of node.arguments) {
        const prose = stringArgumentProse(argument);
        if (prose) record(node, `${name}(… "${prose}" …)`);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(tree);
  return findings;
}

describe("converted surfaces hold no hardcoded prose", () => {
  for (const dir of CONVERTED_DIRS) {
    it(`${dir} routes every user-visible string through react-intl`, () => {
      const findings = sourceFilesIn(dir).flatMap(findHardcodedStrings);
      const report = findings.map((f) => `${f.file}:${f.line} — ${f.text}`);
      expect(report).toEqual([]);
    });
  }

  it("detects prose, and does not flag brands, symbols or numbers", () => {
    // Pins the detector itself. Without this the suite could go green because
    // the walk silently stopped matching, which is the failure mode of every
    // gate that only ever reports success.
    expect(isProse("Crawls over 5,000 pages are allowed")).toBe(true);
    expect(isProse("Đang crawl trang")).toBe(true);
    expect(isProse("Lighthouse")).toBe(false);
    expect(isProse("Google Search Console")).toBe(false);
    expect(isProse(" · ")).toBe(false);
    expect(isProse("4/4")).toBe(false);
    expect(isProse("→")).toBe(false);
    expect(isProse("&mdash;")).toBe(false);
    expect(isProse("&ldquo;")).toBe(false);
    expect(isProse("https://example.com")).toBe(false);
    // An entity beside real words is still a sentence.
    expect(isProse("&mdash; every issue comes with a fix")).toBe(true);
    // A URL inside a sentence does not excuse the sentence.
    expect(isProse("Open https://example.com to continue")).toBe(true);
    expect(isProse("")).toBe(false);
  });

  it("treats code literals as data without excusing prose around them", () => {
    const source = [
      "export function Probe() {",
      "  return (",
      "    <p>",
      "      Check <code><span>AUTH_MODE</span></code> before launch",
      '      <code title="Copy this value">TEAM_DOMAIN</code>',
      "      <code>Run this command</code>",
      "    </p>",
      "  );",
      "}",
    ].join("\n");

    expect(
      findHardcodedStringsInSource("probe.tsx", source).map(
        (finding) => finding.text,
      ),
    ).toEqual([
      "Check",
      "before launch",
      'title="Copy this value"',
      "Run this command",
    ]);
  });

  it("detects tooltip/template attributes and visible prop defaults", () => {
    const source = [
      'export function Probe({ label = "Visible default" }) {',
      "  const name = 'keyword';",
      "  return (",
      '    <div data-tip="Hidden tooltip" aria-label={`Remove ${name}`}>',
      "      <input placeholder={`${origin}/their-page`} />",
      "      {label}",
      "    </div>",
      "  );",
      "}",
    ].join("\n");

    expect(
      findHardcodedStringsInSource("probe.tsx", source).map(
        (finding) => finding.text,
      ),
    ).toEqual([
      'label = "Visible default"',
      'data-tip="Hidden tooltip"',
      'aria-label={"Remove ${…}"}',
    ]);
  });
});
