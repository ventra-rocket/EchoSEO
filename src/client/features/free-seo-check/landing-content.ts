/**
 * Editorial copy for the public `/free-seo-check` landing, kept as plain
 * constants so a later i18n slice can lift them into the message catalogs without
 * re-authoring. The FAQ array is the single source for BOTH the rendered
 * accordion and the `FAQPage` structured data — they cannot drift because they
 * read the same object.
 *
 * Every claim here is grounded in what the checker actually does: the Lite tier
 * scores three on-page signal groups (meta, structure, server) with fixes that
 * cite Google's own docs, and the Deep tier adds Core Web Vitals from PageSpeed
 * Insights plus a bounded internal-page crawl.
 */

export interface LandingFeature {
  title: string;
  body: string;
}

interface FaqEntry {
  question: string;
  answer: string;
}

export const LANDING_INTRO =
  "Paste a URL and get an instant, plain-language read on its on-page SEO — " +
  "then a fix for each issue that points at Google's own guidance, not a guess.";

export const WHAT_WE_CHECK: readonly LandingFeature[] = [
  {
    title: "Title & meta",
    body:
      "Whether the page states a clear title and meta description — the text " +
      "Google shows in results and the first thing a searcher reads.",
  },
  {
    title: "Heading structure",
    body:
      "Whether the page has one clear H1 and a sensible heading outline, so " +
      "both readers and crawlers can tell what it is about.",
  },
  {
    title: "Technical basics",
    body:
      "Status codes, redirects, and indexability signals — the plumbing that " +
      "decides whether a page can rank at all before content ever matters.",
  },
];

export const HOW_IT_WORKS: readonly LandingFeature[] = [
  {
    title: "Instant on-page check",
    body:
      "Results appear in your browser moments after you submit — no signup, no " +
      "wait. Each issue comes with steps to fix it and the Google page that " +
      "backs the advice.",
  },
  {
    title: "Free deep check by email",
    body:
      "Ask for the deep check and we run Core Web Vitals through Google " +
      "PageSpeed Insights and crawl several of your internal pages, then email " +
      "you a shareable report when it is done. Also free — the email just lets " +
      "us reach you when the crawl finishes.",
  },
];

export const FAQS: readonly FaqEntry[] = [
  {
    question: "Is the SEO check really free?",
    answer:
      "Yes. The instant on-page check is free with no signup. The deeper check — " +
      "Core Web Vitals plus a multi-page crawl — is free too; it only asks for an " +
      "email so we can send the report once the crawl finishes.",
  },
  {
    question: "Do I need to sign up or install anything?",
    answer:
      "No. Paste a URL, pass the bot check, and read the result in your browser.",
  },
  {
    question: "How is this different from PageSpeed Insights?",
    answer:
      "PageSpeed scores loading performance. This checks on-page SEO — titles, " +
      "headings, indexability — and, in the deep check, pulls Core Web Vitals from " +
      "PageSpeed too, then explains how to fix what it finds with a link to Google's " +
      "own documentation for each issue.",
  },
  {
    question: "What does the deep check add?",
    answer:
      "Core Web Vitals (LCP, INP, CLS) plus TTFB, measured through Google " +
      "PageSpeed Insights, plus a crawl of several of your internal pages. It " +
      "runs in the background and arrives in your inbox as a shareable report.",
  },
  {
    question: "Is my report private?",
    answer:
      "The report link is unlisted and set to no-index, so it never shows up in " +
      "search results — only someone with the link can open it.",
  },
];
