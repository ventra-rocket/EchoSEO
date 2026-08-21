import type { searchPerformance as en } from "../en/searchPerformance";

// Search Performance page: connect states, totals, striking-distance and breakdown tables, export.
// Terminology follows the shipped GSC copy in report-email-copy.ts (same
// domain: Search Console clicks/impressions/CTR/position), not the generic
// rank-tracking vocabulary — "Vị trí TB" for a period-average GSC position vs.
// "thứ hạng" for a single keyword's live SERP rank are different metrics that
// already have different established translations in this codebase.
export const searchPerformance: Record<keyof typeof en, string> = {
  "searchPerf.title": "Hiệu suất tìm kiếm",
  "searchPerf.subtitle":
    "Xem lượt nhấp, lượt hiển thị, CTR và vị trí tìm kiếm của site bạn trên Google Search Console.",
  "searchPerf.loading": "Đang tải dữ liệu Search Console…",
  "searchPerf.strikingDistanceIntro":
    "Tìm các từ khóa trong tầm với — những truy vấn đang xếp hạng ngay sát top đầu trang 1, nơi chỉ cần cải thiện thứ hạng một chút là có thể giành thêm nhiều lượt nhấp mới. Kết nối Search Console để xem các từ khóa này.",
  "searchPerf.tab.striking": "Từ khóa trong tầm với ({count})",
  "searchPerf.tab.queries": "Truy vấn",
  "searchPerf.tab.pages": "Trang",
  "searchPerf.filter.device": "Bộ lọc thiết bị",
  "searchPerf.filter.allDevices": "Tất cả thiết bị",
  "searchPerf.filter.country": "Bộ lọc quốc gia",
  "searchPerf.filter.allCountries": "Tất cả quốc gia",
  "searchPerf.filter.dateRange": "Khoảng thời gian",
  "searchPerf.range.last7Days": "7 ngày qua",
  "searchPerf.range.last28Days": "28 ngày qua",
  "searchPerf.range.last3Months": "3 tháng qua",
  "searchPerf.device.desktop": "Desktop",
  "searchPerf.device.mobile": "Mobile",
  "searchPerf.device.tablet": "Tablet",
  "searchPerf.export.toSheets": "Xuất ra Sheets",
  "searchPerf.export.downloadCsv": "Tải CSV",
  "searchPerf.export.failed": "Xuất dữ liệu thất bại",
  "searchPerf.tableLoading": "Đang tải…",
  "searchPerf.metric.query": "Truy vấn",
  "searchPerf.metric.page": "Trang",
  "searchPerf.metric.clicks": "Lượt nhấp",
  "searchPerf.metric.impressions": "Lượt hiển thị",
  "searchPerf.metric.ctr": "CTR",
  "searchPerf.metric.avgPosition": "Vị trí TB",
  "searchPerf.totals.deltaTitle": "so với {prevStart} đến {prevEnd}",
  "searchPerf.dimensionTable.empty":
    "Chưa có dữ liệu cho kỳ này. Search Console chốt số liệu chậm hai đến ba ngày.",
  "searchPerf.striking.empty":
    "Không có từ khóa nào trong tầm với ở kỳ này. Đây là các truy vấn đang xếp hạng ở vị trí 5 đến 20 — nơi một cải thiện thứ hạng có nhiều khả năng nhất để tăng lượt truy cập.",
  "searchPerf.striking.explanation":
    "Các truy vấn đang xếp hạng ở vị trí 5 đến 20, xếp theo lượt hiển thị. Cải thiện trang được liệt kê để đưa các từ khóa này vào top kết quả.",
  "searchPerf.striking.copySuccess":
    "{count, plural, other {Đã sao chép # từ khóa}}",
  "searchPerf.striking.copyError": "Không thể sao chép vào clipboard",
  "searchPerf.striking.saveSuccess":
    "{count, plural, other {Đã lưu # từ khóa}}",
  "searchPerf.striking.saveError": "Không thể lưu từ khóa",
  "searchPerf.striking.copyKeywords": "Sao chép từ khóa",
  "searchPerf.striking.saveAsKeywords": "Lưu thành từ khóa",
  "searchPerf.striking.selectedLabel": "{count, plural, other {truy vấn}}",
};
