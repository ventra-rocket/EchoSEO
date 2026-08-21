// Audit — results, issues and competitors (src/client/features/audit/**).
export const audit = {
  // Audit — results (src/client/features/audit/results/**)
  "audit.results.tab.pages": "Pages ({count})",
  "audit.results.tab.performance": "Performance ({count})",
  "audit.results.tab.allIssues": "All Issues",
  "audit.results.tab.search": "Search",

  "audit.results.search.consoleTitle": "Search Console",
  "audit.results.search.consoleTag": "first-party · free",
  "audit.results.search.referringDomainsTitle": "Off-page · Referring domains",
  "audit.results.search.referringDomainsTag": "provider data · uses credits",

  "audit.results.truncatedNotice.title": "This crawl stopped at {limit} pages.",
  "audit.results.truncatedNotice.body":
    "Your site has more than that, so this report covers the {limit} pages reached first from {startUrl}. Everything shown is measured; what is missing is the rest of the site, not a clean bill of health for it.",
  "audit.results.truncatedNotice.note":
    "Orphan-page and sitemap-coverage checks are switched off for a partial crawl: a page nothing seems to link to may simply not have been reached.",

  "audit.results.throttledNotice.title":
    "{count, plural, one {# page was} other {# pages were}} not read because the site rate-limited this crawl.",
  "audit.results.throttledNotice.body":
    "Those pages answered <mono>429 Too Many Requests</mono>, which is about how fast we asked, not about the pages. They are excluded from the broken-page count and from every on-page check, and are listed under the <em>Throttled</em> status filter.",
  "audit.results.throttledNotice.note":
    "The crawler slows down and retries when this happens. If it keeps recurring, allowing our crawler in the site's rate-limiting rules will let the audit cover the whole site.",

  "audit.results.stats.pagesCrawled": "Pages Crawled",
  "audit.results.stats.totalUrls": "Total URLs",
  "audit.results.stats.lighthouseTests": "Lighthouse Tests",
  "audit.results.stats.avgResponse": "Avg Response",
  "audit.results.stats.avgLighthousePerf": "Avg Lighthouse Perf",
  "audit.results.stats.avgLighthouseSeo": "Avg Lighthouse SEO",
  "audit.results.stats.avgLighthouseA11y": "Avg Lighthouse A11y",
  "audit.results.stats.lighthouseFailures": "Lighthouse Failures",

  "audit.results.columns.url": "URL",
  "audit.results.columns.status": "Status",
  "audit.results.columns.title": "Title",
  "audit.results.columns.h1": "H1",
  "audit.results.columns.words": "Words",
  "audit.results.columns.images": "Images",
  "audit.results.columns.speed": "Speed",
  "audit.results.columns.device": "Device",
  "audit.results.columns.perf": "Perf",
  "audit.results.columns.a11y": "A11y",
  "audit.results.columns.seo": "SEO",
  "audit.results.columns.lcp": "LCP",
  "audit.results.columns.cls": "CLS",
  "audit.results.columns.inp": "INP",
  "audit.results.columns.ttfb": "TTFB",
  "audit.results.columns.issues": "Issues",

  "audit.results.pagesTable.missingTitle": "missing",
  "audit.results.pagesTable.emptyFiltered": "No pages match these filters.",

  "audit.results.performanceTable.failed": "failed",
  "audit.results.performanceTable.ok": "ok",
  "audit.results.performanceTable.defaultFailureMessage":
    "Lighthouse returned no category scores",
  "audit.results.performanceTable.viewIssues": "View issues",
  "audit.results.performanceTable.emptyFiltered":
    "No performance results match these filters.",

  "audit.results.export.sheets": "Export to Sheets",
  "audit.results.export.csv": "CSV",
  "audit.results.export.json": "JSON",
  "audit.results.export.trigger": "Export",

  "audit.results.filters.search": "Search",
  "audit.results.filters.searchPlaceholderPages": "URL, title, meta",
  "audit.results.filters.searchPlaceholderUrl": "URL",
  "audit.results.filters.status": "Status",
  "audit.results.filters.altText": "Alt text",
  "audit.results.filters.words": "Words",
  "audit.results.filters.speedMs": "Speed ms",
  "audit.results.filters.device": "Device",
  "audit.results.filters.maxLcpS": "Max LCP s",
  "audit.results.filters.perf": "Perf",
  "audit.results.filters.seo": "SEO",

  "audit.results.filters.option.all": "All",
  "audit.results.filters.option.status2xx": "2xx",
  "audit.results.filters.option.status3xx": "3xx",
  "audit.results.filters.option.status4xx5xx": "4xx/5xx",
  "audit.results.filters.option.throttled": "Throttled",
  "audit.results.filters.option.missing": "Missing",
  "audit.results.filters.option.missingAlt": "Missing alt",
  "audit.results.filters.option.noMissingAlt": "No missing alt",
  "audit.results.filters.option.desktop": "Desktop",
  "audit.results.filters.option.mobile": "Mobile",
  "audit.results.filters.option.perfOk": "OK",
  "audit.results.filters.option.perfFailed": "Failed",

  "audit.results.filters.toggleTitle": "Toggle filters",
  "audit.results.filters.toggleLabel": "Filters",
  "audit.results.filters.resultCount": "{result} of {total}",
  "audit.results.filters.refineResults": "Refine results",
  "audit.results.filters.activeCount": "{count} active",
  "audit.results.filters.clearAll": "Clear all",
  "audit.results.filters.min": "Min",
  "audit.results.filters.max": "Max",

  // Audit — issues (src/client/features/audit/issues/**)
  "audit.issues.group.indexability": "Indexability",
  "audit.issues.group.links": "Links",
  "audit.issues.group.redirects": "Redirects",
  "audit.issues.group.content": "Content",
  "audit.issues.group.sitemaps": "Sitemaps",
  "audit.issues.group.structuredData": "Structured Data",
  "audit.issues.group.performance": "Performance",
  "audit.issues.group.aiGeo": "AI / GEO",

  "audit.issues.uncoveredNote":
    "Not covered by this audit yet: redirect chains (the crawl stores only the final URL), structured data (the catalog's entry is guidance only — nothing evaluates it into a finding), and AI/GEO checks (they need robots.txt and llms.txt fetches the audit crawl does not perform).",

  "audit.issues.loadError": "We could not load the issues for this audit.",

  "audit.issues.notMaterialized.waitingTitle":
    "Working out the issues for this crawl…",
  "audit.issues.notMaterialized.failedTitle":
    "Issue analysis hasn't completed for this crawl.",
  "audit.issues.notMaterialized.waitingBody":
    "The pages are crawled; the checks that turn them into a list of issues run just after. This updates on its own.",
  "audit.issues.notMaterialized.failedBody":
    "The pages were crawled, but the checks that turn them into a list of issues did not finish. This is not a clean result — run the audit again to get one.",

  "audit.issues.none.title": "No issues found.",
  "audit.issues.none.body":
    "Every check this audit runs passed on every crawled page.",

  "audit.issues.groupList.emptyFiltered": "No issues match these filters.",
  "audit.issues.groupList.summary":
    "{issueCount, plural, one {# issue} other {# issues}} · {urlCount, plural, one {# URL} other {# URLs}}",
  "audit.issues.groupList.newSinceBaseline": "New since baseline",
  "audit.issues.groupList.resolvedSinceBaseline": "Resolved since baseline",
  "audit.issues.groupList.allGroups": "All groups",
  "audit.issues.groupList.severity": "Severity",
  "audit.issues.groupList.anySeverity": "Any",

  "audit.issues.detail.closeDetails": "Close issue details",
  "audit.issues.detail.affectedCount":
    "{count, plural, one {# affected URL} other {# affected URLs}}",
  "audit.issues.detail.close": "Close",
  "audit.issues.detail.loadError": "We could not load the affected URLs.",
  "audit.issues.detail.howToFixIt": "How to fix it",
  "audit.issues.detail.googleDocumentation": "Google documentation",
  "audit.issues.detail.sourceLastChecked": "Source last checked {date}",
  "audit.issues.detail.englishFallback": "(guidance shown in English)",
  "audit.issues.detail.pageOf": "Page {page} of {pageCount}",
  "audit.issues.detail.previous": "Previous",
  "audit.issues.detail.next": "Next",

  "audit.issues.evidence.columnUrl": "URL",
  "audit.issues.evidence.columnStatus": "Status",
  "audit.issues.evidence.columnEvidence": "Evidence",
  "audit.issues.evidence.hideEvidence": "Hide evidence",
  "audit.issues.evidence.showEvidence": "Show evidence capture",

  "audit.issues.screenshot.loading": "Loading evidence…",
  "audit.issues.screenshot.loadError":
    "We could not load the evidence for this URL.",
  "audit.issues.screenshot.alt": "Rendered capture of {url}",
  "audit.issues.screenshot.caption":
    "Rendered from the live page via PageSpeed · captured {date}",
  "audit.issues.screenshot.unavailable":
    "No page capture is available for this URL — it was not crawled as an HTML page in this audit.",
  "audit.issues.screenshot.renderFailed":
    "We could not render this page the last time it was tried.",
  "audit.issues.screenshot.tryAgain": "Try again",
  "audit.issues.screenshot.captureEvidence": "Capture evidence",
  "audit.issues.screenshot.noneCaptured":
    "No evidence could be captured for this URL.",
  "audit.issues.screenshot.notCapturedYet":
    "No evidence has been captured for this URL yet.",
  "audit.issues.screenshot.captureFailedDefault": "Could not capture evidence",

  "audit.issues.ai.priorityNow": "Worth doing now",
  "audit.issues.ai.prioritySoon": "Worth doing soon",
  "audit.issues.ai.priorityLater": "Can wait",
  "audit.issues.ai.explainCta": "Explain for this site",
  "audit.issues.ai.commentaryTitle": "AI commentary",
  "audit.issues.ai.hide": "Hide",
  "audit.issues.ai.disclaimer":
    "Written by a language model to summarize the steps above. The fix steps and the quote are from Google's documentation; this note is not.",

  // Audit — competitors (src/client/features/audit/competitors/**)
  "audit.competitors.card.title": "Competitors",
  "audit.competitors.card.description":
    "Name up to {max} domains you compete with. Each of your pages is matched to theirs and scored against the same rules, so the comparison is page against page rather than domain against domain.",
  "audit.competitors.card.loading": "Loading competitors",
  "audit.competitors.card.remove": "Remove {host}",
  "audit.competitors.card.limitReached":
    "Three is the limit. Remove one to compare against a different domain — each competitor means crawling their pages, and a comparison against ten sites is one nobody reads.",
  "audit.competitors.card.domainPlaceholder": "competitor.com",
  "audit.competitors.card.namePlaceholder": "Name (optional)",
  "audit.competitors.card.add": "Add",
  "audit.competitors.card.addedToast": "Now comparing against {host}.",
  "audit.competitors.card.addErrorDefault": "Could not add that competitor.",
  "audit.competitors.card.removedToast": "Competitor removed.",
  "audit.competitors.card.removeErrorDefault":
    "Could not remove that competitor.",

  "audit.competitors.table.notMeasuredTitle": "Not measured for this page",
  "audit.competitors.table.notMeasuredLabel": "Not measured",
  "audit.competitors.table.passesLabel": "Passes",
  "audit.competitors.table.warningLabel": "Warning",
  "audit.competitors.table.failsLabel": "Fails",
  "audit.competitors.table.loading": "Loading the comparison",
  "audit.competitors.table.title": "Page-by-page comparison",
  "audit.competitors.table.description":
    "Your pages and theirs, judged by the same eleven on-page and technical rules. Core Web Vitals, sitemap and orphan checks are not compared: ours come from a full crawl of your site, and running one against theirs is not something we do.",
  "audit.competitors.table.runComparison": "Run comparison",
  "audit.competitors.table.compareToastSuccess":
    "Compared against {count, plural, one {# competitor} other {# competitors}}.",
  "audit.competitors.table.compareErrorDefault":
    "Could not run the comparison.",
  "audit.competitors.table.pairingSaved":
    "Pairing saved. Run the comparison again to score it.",
  "audit.competitors.table.saveUrlErrorDefault": "Could not save that URL.",
  "audit.competitors.table.noPagePairs":
    "No page pairs yet. Run the comparison to match your pages against theirs.",
  "audit.competitors.table.vs": "vs",
  "audit.competitors.table.pairedByHandBadge": "paired by hand",
  "audit.competitors.table.matchPercent": "match {percent}%",
  "audit.competitors.table.notScoredForPair":
    "Nothing was scored for this pair.",
  "audit.competitors.table.notComparedYet": "Not compared yet.",
  "audit.competitors.table.columnRule": "Rule",
  "audit.competitors.table.columnYou": "You",
  "audit.competitors.table.columnThem": "Them",
  "audit.competitors.table.behind": "behind",
  "audit.competitors.table.ahead": "ahead",
  "audit.competitors.table.savePairing": "Save pairing",
  "audit.competitors.table.cancel": "Cancel",
  "audit.competitors.table.pairDifferentPage": "Pair with a different page",
  "audit.competitors.table.unpairedSummary":
    "{count} of your pages have no counterpart on {host} — pair one by hand",
  "audit.competitors.table.mustBeUrlOn": "Must be a URL on {host}",
  "audit.competitors.table.pairByHand": "Pair by hand",
} as const;
