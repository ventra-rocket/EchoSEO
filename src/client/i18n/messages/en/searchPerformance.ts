// Search Performance page: connect states, totals, striking-distance and breakdown tables, export.
export const searchPerformance = {
  "searchPerf.title": "Search Performance",
  "searchPerf.subtitle":
    "See your site's clicks, impressions, CTR, and position from Google Search Console.",
  "searchPerf.loading": "Loading Search Console data…",
  // The page's most important sentence: what "striking distance" means and why it matters.
  "searchPerf.strikingDistanceIntro":
    "Find your striking-distance keywords — queries ranking just off the top of page one, where a small improvement can win the most new clicks. Connect Search Console to see them.",
  "searchPerf.tab.striking": "Striking distance ({count})",
  "searchPerf.tab.queries": "Queries",
  "searchPerf.tab.pages": "Pages",
  "searchPerf.filter.device": "Device filter",
  "searchPerf.filter.allDevices": "All devices",
  "searchPerf.filter.country": "Country filter",
  "searchPerf.filter.allCountries": "All countries",
  "searchPerf.filter.dateRange": "Date range",
  "searchPerf.range.last7Days": "Last 7 days",
  "searchPerf.range.last28Days": "Last 28 days",
  "searchPerf.range.last3Months": "Last 3 months",
  "searchPerf.device.desktop": "Desktop",
  "searchPerf.device.mobile": "Mobile",
  "searchPerf.device.tablet": "Tablet",
  "searchPerf.export.toSheets": "Export to Sheets",
  "searchPerf.export.downloadCsv": "Download CSV",
  "searchPerf.export.failed": "Export failed",
  "searchPerf.tableLoading": "Loading…",
  // Shared metric/column labels: reused across the totals cards and both the
  // breakdown-table and striking-distance-table column headers so "Clicks"
  // is never translated twice.
  "searchPerf.metric.query": "Query",
  "searchPerf.metric.page": "Page",
  "searchPerf.metric.clicks": "Clicks",
  "searchPerf.metric.impressions": "Impressions",
  "searchPerf.metric.ctr": "CTR",
  "searchPerf.metric.avgPosition": "Avg position",
  "searchPerf.totals.deltaTitle": "vs {prevStart} to {prevEnd}",
  "searchPerf.dimensionTable.empty":
    "No data for this period yet. Search Console data trails by two to three days.",
  "searchPerf.striking.empty":
    "No striking-distance queries in this period. These are queries ranking at positions 5 to 20, where an improvement is most likely to move traffic.",
  "searchPerf.striking.explanation":
    "Queries ranking at positions 5 to 20, sorted by impressions. Improve the listed page to move them into the top results.",
  "searchPerf.striking.copySuccess":
    "{count, plural, one {Copied # keyword} other {Copied # keywords}}",
  "searchPerf.striking.copyError": "Couldn't copy to clipboard",
  "searchPerf.striking.saveSuccess":
    "{count, plural, one {Saved # keyword} other {Saved # keywords}}",
  "searchPerf.striking.saveError": "Could not save keywords",
  "searchPerf.striking.copyKeywords": "Copy keywords",
  "searchPerf.striking.saveAsKeywords": "Save as keywords",
  "searchPerf.striking.selectedLabel":
    "{count, plural, one {query} other {queries}}",
} as const;
