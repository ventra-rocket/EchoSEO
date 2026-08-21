// Rank tracking charts: position distribution, trend chart, history matrix and the per-keyword trend modal.
export const rankCharts = {
  // Overview — position distribution chart (RankTrackingOverview.tsx)
  "rank.charts.overview.title": "Position distribution",
  "rank.charts.overview.empty.none":
    "No history yet — run a check to start tracking positions over time.",
  "rank.charts.overview.empty.one":
    "Only 1 check so far — the trend fills in after the next check.",

  // Position bands — shared by the distribution legend and its tooltip. Fixed
  // at top 20 server-side (RankTrackingRepository.getConfigTrend), independent
  // of a config's configurable serpDepth used elsewhere in this slice.
  "rank.charts.band.top3": "Top 3",
  "rank.charts.band.top4to10": "4–10",
  "rank.charts.band.top11to20": "11–20",
  "rank.charts.band.notRanking": "Not in top 20",

  // Trend chart axis (RankTrackingTrendChart.tsx) — shared by the overview
  // distribution chart and the per-keyword modal chart.
  "rank.charts.trend.axisLabel": "Google position (1 = best)",
  "rank.charts.trend.better": "Better",

  // 30d / 90d / All range toggle — shared by the overview chart and the modal.
  "rank.charts.range.thirtyDays": "30d",
  "rank.charts.range.ninetyDays": "90d",
  "rank.charts.range.all": "All",

  // History matrix (RankTrackingHistoryMatrix.tsx)
  "rank.charts.historyMatrix.empty":
    "No history yet. Run a check to start building the timeline.",
  "rank.charts.historyMatrix.keywordHeader": "Keyword",

  // Keyword trend modal (KeywordTrendModal.tsx)
  "rank.charts.trendModal.deviceDesktop": "Desktop",
  "rank.charts.trendModal.deviceMobile": "Mobile",
  "rank.charts.trendModal.subtitle":
    "{domain} · {location} · Position over time",
  "rank.charts.trendModal.copy": "Copy",
  "rank.charts.trendModal.exportCsv": "Export CSV",
  "rank.charts.trendModal.copiedToast": "Copied to clipboard",
  "rank.charts.trendModal.close": "Close",
  "rank.charts.trendModal.empty.none":
    "No history yet — run a check to start tracking position over time.",
  "rank.charts.trendModal.empty.one":
    "Only 1 check so far — the trend chart fills in after the next check.",
  // Column labels shared between the on-screen history table and the CSV
  // export headers (handleCopy/handleExport) — only the change column's
  // wording differs between the compact table (Δ) and the standalone file.
  "rank.charts.trendModal.colDate": "Date",
  "rank.charts.trendModal.colDevice": "Device",
  "rank.charts.trendModal.colPosition": "Position",
  "rank.charts.trendModal.colChangeShort": "Δ vs previous check",
  "rank.charts.trendModal.colChangeFull": "Change vs previous",

  // "Not in top {depth}" — shared by the history table's position cell and
  // the chart tooltip. depth is the config's serpDepth, not the fixed 20 used
  // by rank.charts.band.notRanking above.
  "rank.charts.notInTopN": "Not in top {depth}",
} as const;
