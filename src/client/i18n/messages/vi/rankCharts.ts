import type { rankCharts as en } from "../en/rankCharts";

// Rank tracking charts: position distribution, trend chart, history matrix and the per-keyword trend modal.
export const rankCharts: Record<keyof typeof en, string> = {
  "rank.charts.overview.title": "Phân bố thứ hạng",
  "rank.charts.overview.empty.none":
    "Chưa có lịch sử — hãy chạy một lượt kiểm tra để bắt đầu theo dõi thứ hạng theo thời gian.",
  "rank.charts.overview.empty.one":
    "Mới có 1 lượt kiểm tra — biểu đồ xu hướng sẽ hiển thị đầy đủ sau lượt kiểm tra tiếp theo.",

  // "Top" is an established untranslated loanword in the shipped VN catalog
  // (e.g. audit.search.signals.top10Header: "rớt khỏi top 10"), so it stays
  // as-is here too. The numeric ranges carry no words to translate.
  "rank.charts.band.top3": "Top 3",
  "rank.charts.band.top4to10": "4–10",
  "rank.charts.band.top11to20": "11–20",
  "rank.charts.band.notRanking": "Ngoài top 20",

  "rank.charts.trend.axisLabel": "Vị trí trên Google (1 = tốt nhất)",
  "rank.charts.trend.better": "Tốt hơn",

  "rank.charts.range.thirtyDays": "30d",
  "rank.charts.range.ninetyDays": "90d",
  "rank.charts.range.all": "Tất cả",

  "rank.charts.historyMatrix.empty":
    "Chưa có lịch sử. Hãy chạy một lượt kiểm tra để bắt đầu xây dựng dòng thời gian.",
  "rank.charts.historyMatrix.keywordHeader": "Từ khóa",

  "rank.charts.trendModal.deviceDesktop": "Desktop",
  "rank.charts.trendModal.deviceMobile": "Mobile",
  "rank.charts.trendModal.subtitle":
    "{domain} · {location} · Vị trí theo thời gian",
  "rank.charts.trendModal.copy": "Sao chép",
  "rank.charts.trendModal.exportCsv": "Xuất CSV",
  "rank.charts.trendModal.copiedToast": "Đã sao chép vào clipboard",
  "rank.charts.trendModal.close": "Đóng",
  "rank.charts.trendModal.empty.none":
    "Chưa có lịch sử — hãy chạy một lượt kiểm tra để bắt đầu theo dõi thứ hạng theo thời gian.",
  "rank.charts.trendModal.empty.one":
    "Mới có 1 lượt kiểm tra — biểu đồ xu hướng sẽ hiển thị đầy đủ sau lượt kiểm tra tiếp theo.",
  "rank.charts.trendModal.colDate": "Ngày",
  "rank.charts.trendModal.colDevice": "Thiết bị",
  "rank.charts.trendModal.colPosition": "Thứ hạng",
  "rank.charts.trendModal.colChangeShort": "Δ so với lần trước",
  "rank.charts.trendModal.colChangeFull": "Thay đổi so với lần trước",

  "rank.charts.notInTopN": "Ngoài top {depth}",
};
