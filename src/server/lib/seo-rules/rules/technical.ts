/**
 * Technical rule catalog: HTTPS/status code/robots noindex/mixed content.
 *
 * Thresholds match Phase 1's original `evaluateSignals` logic in
 * `services/seo-check/lite.ts` — this is a refactor of where that logic
 * lives, not a behavior change.
 */
import type { OnPageSignals, Rule } from "../types";

export const TECHNICAL_RULES: Array<Rule<OnPageSignals>> = [
  {
    id: "server-https",
    category: "server",
    severity: "critical",
    label: "Served over HTTPS",
    appliesWhen: (page) => (page.url.startsWith("https:") ? "pass" : "fail"),
    problem:
      "The page is served over plain HTTP instead of HTTPS, which is a security risk and part of Google's page-experience assessment.",
    fixSteps: [
      "Install a TLS certificate and serve the site over HTTPS.",
      "Redirect all HTTP requests to the HTTPS equivalent (301).",
    ],
    googleSourceUrl:
      "https://developers.google.com/search/docs/appearance/page-experience",
    guideQuote: "Are your pages served in a secure fashion?",
    lastReviewedDate: "2026-07-13",
  },
  {
    id: "server-status",
    category: "server",
    severity: "critical",
    label: "Responds with a healthy status code",
    appliesWhen: (page) => {
      if (page.statusCode === 200) return "pass";
      if (page.statusCode < 400) return "warn";
      return "fail";
    },
    problem:
      "The page returned an error or redirect status code instead of 200 OK, which can keep it out of the index entirely.",
    fixSteps: [
      "Fix the server error, or update the link/sitemap entry if the URL has permanently moved.",
      "Make sure the final URL after any redirects returns 200 OK.",
    ],
    googleSourceUrl:
      "https://developers.google.com/crawling/docs/troubleshooting/http-status-codes",
    guideQuote:
      "Google doesn't use the content from URLs that return 4xx status codes.",
    lastReviewedDate: "2026-07-13",
  },
  {
    id: "server-indexable",
    category: "server",
    severity: "critical",
    label: "Not blocked from indexing via robots meta",
    appliesWhen: (page) => {
      const blocksIndex = (page.robotsMeta ?? "")
        .toLowerCase()
        .includes("noindex");
      return blocksIndex ? "fail" : "pass";
    },
    problem:
      'The page has a <meta name="robots" content="noindex"> tag, which tells Google not to show it in search results at all.',
    fixSteps: [
      "Remove the noindex directive from the robots meta tag (or X-Robots-Tag header) if the page should be searchable.",
      "Double-check this wasn't left over from staging/development.",
    ],
    googleSourceUrl:
      "https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag",
    guideQuote:
      "Do not show this page, media, or resource in search results. If you don't specify this rule, the page, media, or resource may be indexed and shown in search results.",
    lastReviewedDate: "2026-07-13",
  },
  {
    id: "server-mixed-content",
    category: "server",
    severity: "high",
    label: "No mixed HTTP content on an HTTPS page",
    appliesWhen: (page) => (page.hasMixedContent ? "fail" : "pass"),
    problem:
      "An HTTPS page is loading one or more sub-resources (images, scripts, stylesheets, iframes) over plain HTTP, which browsers flag as insecure.",
    fixSteps: [
      "Update every sub-resource URL (img/script/link/iframe src or href) to use https:// instead of http://.",
      "Use protocol-relative or root-relative URLs to avoid this recurring.",
    ],
    googleSourceUrl: "https://web.dev/articles/what-is-mixed-content",
    guideQuote:
      "A page has mixed content when its initial HTML is loaded over a secure HTTPS connection, but other resources (such as images, videos, stylesheets, and scripts) are loaded over an insecure HTTP connection.",
    lastReviewedDate: "2026-07-13",
  },
];
