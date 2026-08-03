/**
 * Per-locale copy for the check-result UI: the Lite report rendered on the
 * landing pages and the shareable Deep report page (`/r/{id}`).
 *
 * Same shape as `landing-copy.ts` — a plain locale-keyed object, not a
 * react-intl catalog — because these components render on public SSR routes
 * that have no IntlProvider. Strings with interpolation are functions so each
 * locale controls its own word order (and Vietnamese needs no plural forms).
 *
 * Only presentational CHROME lives here. Signal text (label/problem/fixSteps)
 * is localized server-side, and `signal.guideQuote` is always the verbatim
 * English Google quote.
 *
 * The EN strings must stay byte-identical to what the components rendered
 * before localization — existing English tests and e2e assertions depend on
 * them. Do not reword EN here without updating those.
 */
import type { Locale } from "@/client/i18n/config";
import type { CheckResultCopy } from "./check-result-copy-types";
import { CHECK_RESULT_COPY_VI } from "./check-result-copy-vi";

const EN: CheckResultCopy = {
  gauge: {
    outOf100: "out of 100",
    gradeAria: (grade) => `Grade ${grade}`,
  },
  headline: {
    none: "No issues found — nicely done.",
    good: (n) => `Good — ${n} ${n === 1 ? "issue" : "issues"} to fix.`,
    fair: (n) => `Fair — ${n} ${n === 1 ? "issue" : "issues"} to fix.`,
    needsWork: (n) =>
      `Needs work — ${n} ${n === 1 ? "issue" : "issues"} to fix.`,
  },
  pageRead: {
    heading: "What we read on your page",
    title: "Title",
    metaDescription: "Meta description",
    h1: "H1 heading",
    words: "Words",
    missing: "not found",
  },
  measurement: {
    chars: (count) => `${count} chars`,
    count: (value) => `${value}`,
    ratio: (value, of) => `${value} of ${of}`,
  },
  headingOutline: {
    headingCount: (count) => `${count} ${count === 1 ? "heading" : "headings"}`,
    firstSkip: (from, to) => `first skip: H${from} → H${to}`,
    viewFullOutline: "View full outline",
  },
  triage: {
    failing: (n) => `${n} failing`,
    warnings: (n) => `${n} ${n === 1 ? "warning" : "warnings"}`,
    passed: (n) => `${n} passed`,
    passedToggle: (n) => `${n} ${n === 1 ? "check" : "checks"} passed`,
    allClear: "Every check passed — nothing to fix.",
    checksHeading: "What needs attention",
  },
  categoryLabels: {
    meta: "Meta",
    structure: "Page Structure",
    server: "Server",
    "core-web-vitals": "Core Web Vitals",
    geo: "AI Search",
  },
  signal: {
    statusBadge: { pass: "pass", warn: "warn", fail: "fail" },
    howToFix: "How to fix this",
    guidancePrefix: "Per ",
    guidanceLinkText: "Google's guidance",
    guidanceReviewed: (date) => `, reviewed ${date}: `,
  },
  coreWebVitals: {
    sourceField: "Real Chrome user data (CrUX)",
    sourceLab: "Lab simulation (no field data yet)",
  },
  deepReport: {
    psiLabels: {
      performance: "Performance",
      seo: "SEO",
      accessibility: "Accessibility",
      bestPractices: "Best Practices",
    },
    checksHeading: "Checks",
    primaryPageSuffix: "(primary page)",
    otherPagesHeading: (count) => `Other pages crawled (${count})`,
    noIssues: "no issues",
    issuesToFix: (count) => `${count} to fix`,
    categoriesGroupLabel: "Category scores",
  },
  reportBand: {
    scanned: (date) => `Scanned ${date}`,
    pagesCrawled: (count) =>
      `${count} ${count === 1 ? "page" : "pages"} crawled`,
  },
  screenshot: {
    label: "What we loaded",
    alt: (host) => `Screenshot of ${host} as our checker rendered it`,
    unavailable: "Preview unavailable",
    loadingHint: "Rendering a live capture — this can take up to 30 seconds.",
    retry: "Retry",
  },
  geoSection: {
    heading: "AI Search readiness",
    disclaimer:
      "Directional — Google's AI features run on the same ranking systems as Search, so these checks reinforce SEO fundamentals. They are not a guarantee of appearing in AI answers.",
    scoreLabel: "AI readiness",
    policyHeading: "AI crawler policy",
    botAllowed: "allowed",
    botBlocked: "blocked",
    googleExtendedLabel: "Google-Extended (Gemini, Vertex)",
    gptbotLabel: "GPTBot (OpenAI)",
    llmsTxtLabel: "llms.txt",
    llmsTxtFound: "found",
    llmsTxtMissing: "not found",
    llmsTxtNote: "experimental — not a Google standard, optional",
  },
  deepPitch: {
    unlockTitle: "Unlock the Deep report",
    unlockBody: (metricCount) =>
      `Adds ${metricCount} Core Web Vitals metrics from real Chrome users, ` +
      "Google Lighthouse scores, and a crawl of your other pages — free.",
    pausedNotice:
      "Deep reports are paused while we finish setting up delivery — check " +
      "back soon.",
  },
  deepForm: {
    errors: {
      VALIDATION_ERROR:
        "Use a real email address — disposable inboxes aren't accepted.",
      CRAWL_TARGET_BLOCKED: "That URL can't be checked.",
      // Same reasoning as the landing's copy: this form's failure path renews
      // the challenge too, so by the time anyone reads this there is nothing to
      // retry but the submit itself.
      FORBIDDEN: "Verification didn't go through — we've reset it, try again.",
      RATE_LIMITED:
        "You've hit the free-check limit for now — try again later.",
      UPSTREAM_UNAVAILABLE:
        "Deep checks are paused right now — please try again later.",
    },
    errorDefault: "Something went wrong — please try again.",
    sentTitle: "Check your inbox",
    sentBodyBefore: "We sent a confirmation link to",
    sentBodyAfter:
      ". Click it and your deep check starts — you'll get a link to the full " +
      "report.",
    sentSpamHint:
      "Not there in a minute? Check your spam folder — we're a new sender, " +
      "so filters are still learning to trust us.",
    emailLabel: "Email address",
    emailPlaceholder: "you@company.com",
    consentLabel:
      "Email me my deep SEO report. We'll send a confirmation link first — " +
      "no marketing without your say-so.",
    unconfigured: "Deep checks aren't configured for this deployment yet.",
    challengeLoadError: "Couldn't load verification.",
    challengeRetry: "Try again",
    submitIdle: "Email me the deep report",
    submitLoading: "Sending…",
  },
  reportPage: {
    errors: {
      NOT_FOUND: "This report link is invalid or has expired.",
      VALIDATION_ERROR: "This report link is invalid.",
      RATE_LIMITED: "Too many requests — wait a moment and refresh.",
    },
    errorDefault: "We couldn't load this report — please refresh.",
    loading: "Loading your report…",
    stalledBody:
      "This check is taking longer than usual. It's still running — refresh " +
      "this page in a minute.",
    stalledRefresh: "Refresh",
    pendingTitle:
      "Your deep check is running — crawling your pages and pulling Core Web " +
      "Vitals from Google.",
    pendingHint: "This page updates itself. It usually takes under a minute.",
    // The generic fallback — matches the server's GENERIC_FAILURE_MESSAGE, so an
    // unrecognized `view.message` still reads as before.
    failedTitle: "The deep check could not be completed.",
    // The two specific, actionable server messages (kill-switch, quota) mapped
    // to themselves in EN — so the page keeps showing them, byte-identical.
    failedMessages: {
      "Free deep checks are paused right now. Please try again later.":
        "Free deep checks are paused right now. Please try again later.",
      "Today's free deep-check limit has been reached. Please try again tomorrow.":
        "Today's free deep-check limit has been reached. Please try again tomorrow.",
    },
    failedHint:
      "Run the free check again — if it keeps failing, the site may be " +
      "blocking automated requests.",
    dedupedNotice:
      "This site was already checked today, so here are those results — " +
      "they cover the page shown below.",
    ctaHeading: "Want these fixes done for you?",
    ctaBody:
      "EchoSEO is an open, agent-native SEO platform — self-host it free " +
      "with your own keys, or let the agent layer apply the fixes and prove " +
      "the result against your own Search Console data.",
    ctaPrimary: "See what EchoSEO can do",
    ctaLink: "Check another page",
    headerCta: "Check your site",
    footerLine:
      "EchoSEO is an open, agent-native SEO platform. This checker is free — " +
      "self-hostable, your data stays private, and reports auto-delete " +
      "after 30 days.",
  },
  /* ——— share URL (/c/{id}) block — appended; keep at the end. ——— */
  share: {
    linkLabel: "Share this result",
    copyButton: "Copy link",
    copied: "Link copied",
    copyFailed: "Couldn't copy — copy the URL from the address bar instead.",
  },
  strategyTabs: {
    ariaLabel: "Device type",
    mobileTab: "Mobile",
    desktopTab: "Desktop",
    desktopComparativeNote:
      "For comparison only — scores use mobile data, matching Google's " +
      "mobile-first indexing.",
    desktopNotCaptured:
      "Desktop metrics weren't captured for this report — newer checks " +
      "include them.",
    noStrategyData: "No lab data was captured for this device type.",
  },
  /* ——— visual filmstrip block — appended; keep at the end. ——— */
  filmstrip: {
    ariaLabel: "Loading timeline",
    frameAlt: (timing) => `Loading frame at ${timing}`,
    timing: (ms) => `${(ms / 1000).toFixed(1)} s`,
  },
};

export const CHECK_RESULT_COPY: Record<Locale, CheckResultCopy> = {
  en: EN,
  vi: CHECK_RESULT_COPY_VI,
};
