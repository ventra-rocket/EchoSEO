// Audit — chrome (route shell, launch, verification, search)
export const auditChrome = {
  "audit.chrome.heading": "Site Audit",
  "audit.chrome.allAudits": "← All audits",
  "audit.chrome.backToAudits": "← Back to audits",
  "audit.chrome.loadError":
    "We could not load this audit. It may have been deleted.",
  "audit.chrome.startedAt": "{hostname} · Started {startedAt}",

  "audit.chrome.failed.title": "This audit stopped before it finished.",
  "audit.chrome.failed.reported": "It reported: <mono>{errorMessage}</mono>",
  "audit.chrome.failed.noReason": "No reason was recorded for this run.",
  "audit.chrome.failed.retry":
    "Start it again, and if it stops the same way tell us on the <support>support page</support> with the message above.",

  "audit.chrome.thinCrawl.noPages": "No page could be read on this site.",
  "audit.chrome.thinCrawl.onlyFirstPage": "Only the first page could be read.",
  "audit.chrome.thinCrawl.body":
    "Either the site turns automated clients away, or the start URL links to nothing else we are allowed to follow. Check that <mono>{hostname}/robots.txt</mono> permits crawling, then try again — the <support>support page</support> can help if it persists.",

  "audit.chrome.status.running": "Running",
  "audit.chrome.status.done": "Done",
  "audit.chrome.status.failed": "Failed",

  "audit.chrome.launch.title": "Start New Audit",
  "audit.chrome.launch.readOnlyNotice":
    "You have read-only access to this workspace, so you can review existing audits but not start new ones.",
  "audit.chrome.launch.submitStarting": "Starting…",
  "audit.chrome.launch.submit": "Start Audit",
  "audit.chrome.launch.crawlLimitLabel": "Crawl limit",
  "audit.chrome.launch.maxPagesLabel": "Max pages",
  "audit.chrome.launch.pagesRangeHint": "Enter any value from {min} to {max}.",
  "audit.chrome.launch.lighthouseTooltip":
    "Lighthouse measures the performance of your pages and identifies issues.",
  "audit.chrome.launch.includeLighthouse": "Include Lighthouse",
  "audit.chrome.launch.lighthouseSampleNote":
    "We choose a sample of 20 pages to audit, removing pages from duplicate templates.",
  "audit.chrome.launch.lighthouseNeedsKey":
    "Lighthouse needs a DataForSEO key — add one in Settings.",
  "audit.chrome.launch.verificationConnected":
    "Search Console property connected ({url}). Crawls over {threshold} pages are allowed on the domains it proves — that host and its subdomains.",
  "audit.chrome.launch.verificationRequired":
    "Crawls over {threshold} pages require a matching verified Search Console property for the domain.",
  "audit.chrome.launch.verificationGateMismatch":
    "{domain} is not proved by the connected Search Console property ({url}), so it can be crawled up to {limit} pages. Connect a property covering {domain} — a Domain property covers every subdomain — to crawl more.",
  "audit.chrome.launch.verificationGateNone":
    "No Search Console property is connected, so {domain} can be crawled up to {limit} pages. Connect a matching property in Settings to crawl more.",
  "audit.chrome.launch.crawlLimitButton": "Crawl {limit} pages",
  "audit.chrome.launch.urlRequired": "Please enter a URL.",
  "audit.chrome.launch.startedToast": "Audit started!",
  "audit.chrome.launch.startError": "Failed to start audit",
  "audit.chrome.launch.deletedToast": "Audit deleted",
  "audit.chrome.launch.confirmTitle": "Crawl up to {maxPages} pages?",
  "audit.chrome.launch.confirmBody":
    "{startUrl} — a crawl this size is fine, it just takes a while. It runs in the background, so you can leave this page and come back.",
  "audit.chrome.launch.cancel": "Cancel",
  "audit.chrome.launch.confirmStart": "Start crawl",

  "audit.chrome.history.empty": "No audits yet",
  "audit.chrome.history.title": "Previous Audits",
  "audit.chrome.history.columnDate": "Date",
  "audit.chrome.history.columnUrl": "URL",
  "audit.chrome.history.columnStatus": "Status",
  "audit.chrome.history.columnPages": "Pages",
  "audit.chrome.history.columnLighthouse": "Lighthouse",
  "audit.chrome.history.yes": "Yes",
  "audit.chrome.history.view": "View",
  "audit.chrome.history.actionsLabel": "Audit actions",
  "audit.chrome.history.delete": "Delete audit",

  // Audit — verification (src/client/features/audit/verification/**)
  "audit.verification.recrawlStarted":
    "Re-crawl started — verifying your fixes.",
  "audit.verification.recrawlError": "Could not start the re-crawl.",
  "audit.verification.recrawlButton": "Re-crawl to verify",
  "audit.verification.pending":
    "Fix verification will appear once this re-crawl finishes processing its issues.",
  "audit.verification.baselineUnavailable":
    "The baseline crawl is no longer available to verify these fixes against.",
  "audit.verification.title": "Fix verification",
  "audit.verification.baselineDate": "vs baseline crawl of {date}",
  "audit.verification.stats.resolved": "Resolved",
  "audit.verification.stats.stillPresent": "Still present",
  "audit.verification.stats.inconclusive": "Inconclusive",
  "audit.verification.stats.regressions": "Regressions",
  "audit.verification.inconclusiveNote":
    "Not re-crawled, so the fix could not be confirmed",
  "audit.verification.inconclusiveTruncated": "(first 200 shown)",

  // Audit — search (src/client/features/audit/search/**)
  "audit.search.referring.loadError":
    "We could not load off-page data for this audit.",
  "audit.search.referring.accessCheckFailed":
    "We couldn't check whether off-page data can be fetched for this site.",
  "audit.search.referring.tryAgainShortly": "Try again shortly.",
  "audit.search.referring.cannotTrigger":
    "Ask a workspace editor or owner to fetch off-page data for this site.",
  "audit.search.referring.refreshError": "Failed to fetch off-page data",
  "audit.search.referring.noSnapshot":
    "No off-page reading has been fetched for this site yet. Fetching pulls the current referring-domain count from DataForSEO and stores it, so viewing it later costs nothing and a trend builds up over time.",
  "audit.search.referring.metricDomains": "Referring domains",
  "audit.search.referring.metricNew": "New (provider period)",
  "audit.search.referring.metricLost": "Lost (provider period)",
  "audit.search.referring.trendLabel":
    "referring domains since the previous reading ({from} → {to})",
  "audit.search.referring.sourceLine":
    "Source: {provider} · {target} · {coverage} · queried {date}",
  "audit.search.referring.providerDisabled":
    "The backlinks provider is not enabled for this deployment.",
  "audit.search.referring.fetchLabel": "Fetch off-page data",
  "audit.search.referring.refreshLabel": "Refresh off-page data",
  "audit.search.referring.confirmSpend": "This spends one credit. Continue?",
  "audit.search.referring.confirm": "Confirm",
  "audit.search.referring.cancel": "Cancel",
  "audit.search.referring.actionUsesCredits": "{label} · uses credits",

  "audit.search.signals.loadError":
    "We could not load Search Console signals for this audit.",
  "audit.search.signals.notConnected":
    "Connect Google Search Console for this project to see organic traffic and ranking changes for this site.",
  "audit.search.signals.propertyMismatch":
    "The connected Search Console property (<mono>{property}</mono>) doesn't cover this audit's domain, so its search data isn't shown here. Connect the property that matches this site.",
  "audit.search.signals.noData": "No Search Console data for {window} yet.",
  "audit.search.signals.metricClicks": "Organic clicks",
  "audit.search.signals.metricImpressions": "Impressions",
  "audit.search.signals.vsPrevious": "vs previous ({previous})",
  "audit.search.signals.top10Empty":
    "No pages dropped out of the top 10 in this window.",
  "audit.search.signals.top10Header":
    "{count, plural, one {# page} other {# pages}} dropped out of the top 10",
  "audit.search.signals.notInResults": "not in results",
  "audit.search.signals.positionChange": "avg {from} → {to}",
  "audit.search.signals.sourceLine":
    "Source: GSC · {property} · {current} vs {previous}",
  "audit.search.signals.windowRange": "{from} to {to}",

  // Audit — indexing (src/client/features/audit/indexing/**)
  "audit.indexing.heading": "Google Search Console",
  "audit.indexing.description":
    "Check how Google sees your pages. Inspection is read-only — requesting indexing or submitting a sitemap happens in Search Console.",
  "audit.indexing.notConnected":
    "Connect Google Search Console for this project to check index status.",
  "audit.indexing.propertyMismatch":
    "The connected property (<mono>{property}</mono>) does not cover this site, so its index data can't be shown here.",
  "audit.indexing.propertyLabel": "Property: <mono>{property}</mono>",
  "audit.indexing.urlInputLabel": "URL to inspect",
  "audit.indexing.checkButton": "Check index status",
  "audit.indexing.inspectError":
    "Could not inspect this URL. Try again shortly.",
  "audit.indexing.manageSitemaps": "Manage sitemaps in Search Console",
  "audit.indexing.missingFromSitemap":
    "{count} crawled pages are missing from your sitemap (see All Issues).",
  "audit.indexing.invalidUrl": "Enter a URL on this site to inspect it.",
  "audit.indexing.inspectNotConnected":
    "Search Console access was lost — reconnect to inspect URLs.",
  "audit.indexing.inspectPropertyMismatch":
    "The connected property no longer covers this site.",
  "audit.indexing.inspectFailed":
    "Google couldn't inspect this URL right now — it may be rate-limited or the property's access changed. Try again shortly.",
  "audit.indexing.rowCoverage": "Coverage",
  "audit.indexing.rowVerdict": "Verdict",
  "audit.indexing.rowIndexing": "Indexing",
  "audit.indexing.rowLastCrawl": "Last crawl",
  "audit.indexing.openInSearchConsole": "Open in Search Console",
} as const;
