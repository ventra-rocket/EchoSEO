/**
 * Shape of the per-locale check-result copy.
 *
 * Split out of `check-result-copy.ts` only because that file carries two full
 * locales of prose and outgrew the repo's per-file line budget. The contract
 * lives here; the words live there.
 */
import type { RuleCategory } from "@/server/lib/seo-rules/types";
import type { SignalStatus } from "@/server/services/seo-check/types";

export interface CheckResultCopy {
  /** ScoreGauge — the ring under the overall score. */
  gauge: {
    outOf100: string;
    gradeAria: (grade: string) => string;
  };
  /** Headline under the gauge, by score band (plus the zero-issue case). */
  headline: {
    none: string;
    good: (issueCount: number) => string;
    fair: (issueCount: number) => string;
    needsWork: (issueCount: number) => string;
  };
  /**
   * "What we read" — the raw values actually found on the page, with their
   * measured lengths. This is the evidence behind the scores; without it the
   * report states verdicts about a page it never shows the visitor.
   */
  pageRead: {
    heading: string;
    title: string;
    metaDescription: string;
    h1: string;
    words: string;
    /** Shown in place of a value the page does not have. */
    missing: string;
  };
  /**
   * Renders a `Measurement` — the value a check read. One vocabulary for the
   * whole result, so the page-read panel and the signal rows cannot end up
   * saying "54 chars" two different ways.
   */
  measurement: {
    chars: (count: number) => string;
    count: (value: number) => string;
    ratio: (value: number, of: number) => string;
  };
  /**
   * The heading-order row's compact readout. The raw outline can run to
   * hundreds of tokens, so the row header shows this summary and the full
   * outline sits behind the disclosure labelled below.
   */
  headingOutline: {
    headingCount: (count: number) => string;
    firstSkip: (from: number, to: number) => string;
    viewFullOutline: string;
  };
  /**
   * The triage strip above the checks: how many of each verdict, and the row
   * that keeps passing checks reachable without letting them crowd the page.
   */
  triage: {
    failing: (count: number) => string;
    warnings: (count: number) => string;
    passed: (count: number) => string;
    /** The collapsed row's label. */
    passedToggle: (count: number) => string;
    /** Shown instead of the checks list when nothing needs attention. */
    allClear: string;
    checksHeading: string;
  };
  /** Card label per rule category. "Meta"/"Core Web Vitals" stay untranslated. */
  categoryLabels: Record<RuleCategory, string>;
  /** SignalRow chrome around the server-localized signal text. */
  signal: {
    statusBadge: Record<SignalStatus, string>;
    howToFix: string;
    /** Trailing space included — the guidance link follows immediately. */
    guidancePrefix: string;
    guidanceLinkText: string;
    /** Trailing space included — the quoted (English) Google excerpt follows. */
    guidanceReviewed: (date: string) => string;
  };
  /** Source line next to the "Core Web Vitals" heading (heading stays as-is). */
  coreWebVitals: {
    sourceField: string;
    sourceLab: string;
  };
  /** Deep-report-only chrome (PSI cards, checks section, crawled pages). */
  deepReport: {
    psiLabels: Record<
      "performance" | "seo" | "accessibility" | "bestPractices",
      string
    >;
    checksHeading: string;
    primaryPageSuffix: string;
    otherPagesHeading: (count: number) => string;
    noIssues: string;
    issuesToFix: (count: number) => string;
    /** Group label over the per-category scores in the merged score panel. */
    categoriesGroupLabel: string;
  };
  /** The horizontal score band across the top of the Deep report. */
  reportBand: {
    /** The caller passes an already-localized date string. */
    scanned: (date: string) => string;
    pagesCrawled: (count: number) => string;
  };
  /** The desktop page capture, shown on both the Lite result and Deep report. */
  screenshot: {
    label: string;
    alt: (host: string) => string;
    /** Shown in the frame when a capture could not be produced. */
    unavailable: string;
    /** Sets expectation while the live capture renders (it can take ~30s). */
    loadingHint: string;
    /** The failed state's one action. */
    retry: string;
  };
  /** The GEO / AI-search section — scored separately, framed as directional. */
  geoSection: {
    heading: string;
    /** The honesty line: reinforces fundamentals, not a guarantee. */
    disclaimer: string;
    scoreLabel: string;
    policyHeading: string;
    botAllowed: string;
    botBlocked: string;
    googleExtendedLabel: string;
    gptbotLabel: string;
    llmsTxtLabel: string;
    llmsTxtFound: string;
    llmsTxtMissing: string;
    /** Trails the llms.txt row — reminds it is not a Google standard. */
    llmsTxtNote: string;
  };
  /** DeepTierPitch + the paused notice that stands in for the request form. */
  deepPitch: {
    unlockTitle: string;
    unlockBody: (metricCount: number) => string;
    pausedNotice: string;
  };
  /** DeepRequestForm — the email-gated Deep entry point. */
  deepForm: {
    /** API error code → message; falls back to `errorDefault`. */
    errors: Record<string, string>;
    errorDefault: string;
    sentTitle: string;
    /** Rendered as `{before} <email>{after}` around the mono email span. */
    sentBodyBefore: string;
    sentBodyAfter: string;
    sentSpamHint: string;
    emailLabel: string;
    emailPlaceholder: string;
    consentLabel: string;
    unconfigured: string;
    /** Shown when the Turnstile widget (or its config) failed to load. */
    challengeLoadError: string;
    /** Label on the user-initiated control that remounts a failed widget. */
    challengeRetry: string;
    submitIdle: string;
    submitLoading: string;
  };
  /** The `/r/{id}` page shell around the Deep report. */
  reportPage: {
    /** API error code → message; falls back to `errorDefault`. */
    errors: Record<string, string>;
    errorDefault: string;
    loading: string;
    stalledBody: string;
    stalledRefresh: string;
    pendingTitle: string;
    pendingHint: string;
    /** Fallback title for an unrecognized failure. */
    failedTitle: string;
    /** Specific server failure strings (kill-switch, quota) → localized text;
     * an unrecognized message falls back to `failedTitle`. EN maps each to
     * itself so the page reads exactly as before. */
    failedMessages: Record<string, string>;
    failedHint: string;
    dedupedNotice: string;
    ctaHeading: string;
    ctaBody: string;
    /** Cashes the ctaHeading's cheque — points at the product, not the tool. */
    ctaPrimary: string;
    ctaLink: string;
    /** Header action for whoever received this link — run their own check. */
    headerCta: string;
    /** Footer line naming what EchoSEO is (mirrors the landing's footer). */
    footerLine: string;
  };
  /* ——— share URL (/c/{id}) block — appended; keep at the end of the shape. ——— */
  /** The landing's copy-link control for the minted share URL, and the share
   * page's own chrome. The `/c/` page otherwise reuses `reportPage` strings
   * (loading/errors/header/footer) — the two pages make the same promises. */
  share: {
    /** Lead-in ahead of the mono share URL. */
    linkLabel: string;
    copyButton: string;
    /** Transient confirmation after a successful clipboard write. */
    copied: string;
    /** Clipboard write failed — points at the (already rewritten) address bar. */
    copyFailed: string;
  };

  /**
   * The Di động/Máy tính tabs over the Deep report's lab panel (Core Web
   * Vitals + Lighthouse). Mobile is the scored strategy; desktop is a
   * comparative display tab, and reports stored before desktop capture
   * existed render with no tab bar at all.
   */
  strategyTabs: {
    /** aria-label on the tablist. */
    ariaLabel: string;
    mobileTab: string;
    desktopTab: string;
    /** Honesty line on the desktop tab — display only, mobile stays scored. */
    desktopComparativeNote: string;
    /** Unobtrusive note on reports built before desktop capture existed. */
    desktopNotCaptured: string;
    /** Shown inside a tab whose PSI run carried no usable lab data. */
    noStrategyData: string;
  };
}
