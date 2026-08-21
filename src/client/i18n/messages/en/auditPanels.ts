// Audit — operational panels not covered by audit.ts/auditChrome.ts: the live
// crawl-progress card, baseline comparison (history/**, distinct from the
// audit.chrome.history.* past-audits list), and the dashboard site card.
export const auditPanels = {
  // Audit — progress (src/client/features/audit/progress/**)
  "audit.progress.phase.discovery": "Discovery",
  "audit.progress.phase.crawling": "Crawling",
  "audit.progress.phase.lighthouse": "Lighthouse",
  "audit.progress.phase.finalizing": "Finalizing",
  "audit.progress.phase.running": "Running",
  "audit.progress.heading.lighthouse": "Running Lighthouse checks",
  "audit.progress.heading.crawling": "Crawling pages",
  "audit.progress.heading.discovery": "Reading sitemaps",
  "audit.progress.lighthouseCount": "{done} / {total} checks",
  "audit.progress.lighthouseFailedSuffix": " ({failed} failed)",
  "audit.progress.pagesCount": "{crawled} / {total} pages",
  "audit.progress.discovery.readingSitemaps": "Reading robots.txt and sitemaps",
  "audit.progress.discovery.summary":
    "{urlCount, plural, one {# URL} other {# URLs}} found in {docCount, plural, one {# sitemap document} other {# sitemap documents}}",
  "audit.progress.eta.estimating": "Estimating…",
  "audit.progress.eta.minutes": "~{minutes} min remaining",
  "audit.progress.eta.seconds": "~{seconds} sec remaining",
  "audit.progress.queueStatus": "{queued} queued · {visited} visited",
  "audit.progress.crawlRate": "Crawling at {rate} pages/s",
  "audit.progress.refusedRequestsSuffix":
    "{count, plural, one { · the site refused # request so far} other { · the site refused # requests so far}}",
  "audit.progress.crawledPagesHeading": "Crawled Pages ({count})",
  "audit.progress.updated": "Updated {time}",

  // Audit — history (src/client/features/audit/history/**): baseline
  // comparison shown above the Pages table and the Issues delta bar. Distinct
  // from audit.chrome.history.*, which is the past-audits list.
  "audit.history.baselineSelector.label": "Compare against",
  "audit.history.baselineSelector.auto": "Previous crawl (auto)",
  "audit.history.baselineSelector.option":
    "{date} · {count, plural, one {# page} other {# pages}}",
  "audit.history.baselineSelector.analysisPending": " · analysis pending",
  "audit.history.sourceCrawl": "Source: crawl",
  "audit.history.pageChanges.summaryNone":
    "No page facts changed since the last crawl.",
  "audit.history.pageChanges.summaryChanged":
    "{count, plural, one {# page} other {# pages}} changed since {date}.",
  "audit.history.pageChanges.highlightRemovedFromSitemap":
    "{count} removed from sitemap",
  "audit.history.pageChanges.highlightBecameNoindex": "{count} became noindex",
  "audit.history.pageChanges.highlightStatusChanged": "{count} status changed",
  "audit.history.pageChanges.truncated":
    "Showing the first {shown} changed pages of {total}.",
  "audit.history.pageChanges.field.removedFromSitemap": "Removed from sitemap",
  "audit.history.pageChanges.field.becameNoindex": "Became noindex",
  "audit.history.pageChanges.field.becameIndexable": "Became indexable",
  "audit.history.pageChanges.field.added": "{field} added",
  "audit.history.pageChanges.field.removed": "{field} removed",
  "audit.history.pageChanges.field.changed": "{field} changed",
  "audit.history.pageChanges.field.rangeChange": "{field} {from} → {to}",
  "audit.history.pageChanges.fieldLabel.title": "Title",
  "audit.history.pageChanges.fieldLabel.metaDescription": "Meta description",
  "audit.history.pageChanges.fieldLabel.canonicalUrl": "Canonical",
  "audit.history.pageChanges.fieldLabel.statusCode": "Status",
  "audit.history.pageChanges.fieldLabel.h1Count": "H1 count",
  "audit.history.pageChanges.fieldLabel.wordCount": "Word count",
  "audit.history.pageChanges.fieldLabel.isIndexable": "Indexable",
  "audit.history.pageChanges.fieldLabel.inSitemap": "Sitemap",
  "audit.history.comparisonBar.loading": "Comparing with a previous crawl…",
  "audit.history.comparisonBar.compareError":
    "Couldn't compare with the selected crawl. The issues below are still this crawl's own findings.",
  "audit.history.comparisonBar.singleSnapshot":
    "Findings from this crawl only. This is the first audit of this site — a second audit will show what's new and what's fixed.",
  "audit.history.comparisonBar.notComparableBaselineNotMaterialized":
    "Can't compare with the crawl of {date} yet — its issue analysis hasn't finished, so a comparison would wrongly read every earlier issue as resolved.",
  "audit.history.comparisonBar.notComparableDefault":
    "Can't compare yet — issue analysis for this crawl hasn't finished.",
  "audit.history.comparisonBar.chipNew": "new",
  "audit.history.comparisonBar.chipResolved": "resolved",
  "audit.history.comparisonBar.chipStillPresent": "still present",
  "audit.history.comparisonBar.crawlLabelsLine":
    "This crawl ({current}) vs {baseline} · Source: crawl",
  "audit.history.comparisonBar.fixedSinceThen": "Fixed since then:",

  // Audit — cards (src/client/features/audit/cards/**)
  "audit.cards.currentBadge": "Current",
  "audit.cards.noDomainSet": "No domain set",
  "audit.cards.reportLink": "Report",
  "audit.cards.counter.crawled": "Crawled",
  "audit.cards.counter.redirects": "Redirects",
  "audit.cards.counter.broken": "Broken",
  "audit.cards.counter.blocked": "Blocked",
  "audit.cards.notMeasuredTitle": "Not measured on this crawl",
  "audit.cards.footer": "Crawler EchoSEO · crawl of {date}",
  "audit.cards.noindexSuffix":
    "{count, plural, one { · # page noindex} other { · # pages noindex}}",
  "audit.cards.health.notAnalysed": "Issues not analysed for this crawl",
  "audit.cards.health.scoreDescription":
    "{score}% of pages with no critical or high issue ({clean}/{crawled})",
  "audit.cards.health.critical": "{count} critical",
  "audit.cards.health.high": "{count} high",
  "audit.cards.health.low": "{count} low",
  "audit.cards.emptyState.body":
    "No completed crawl yet, so there is nothing measured to show.",
  "audit.cards.emptyState.cta": "Run the first audit",
} as const;
