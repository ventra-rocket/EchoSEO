import type { domainOverview as en } from "../en/domainOverview";

// Domain Overview shell: search card, stat cards, loading/empty states, history section and the route heading above them. See en/domainOverview.ts for scope.
export const domainOverview: Record<keyof typeof en, string> = {
  "domainOverview.page.subtitle":
    "Phân tích hồ sơ SEO của bất kỳ tên miền nào: lưu lượng truy cập, từ khóa và backlink.",
  "domainOverview.recentSearches.button": "Tìm kiếm gần đây",

  "domainOverview.search.domainPlaceholder": "Nhập tên miền",
  "domainOverview.search.sort.rank": "Theo thứ hạng",
  "domainOverview.search.sort.traffic": "Theo lưu lượng truy cập",
  "domainOverview.search.sort.volume": "Theo lượng tìm kiếm",
  "domainOverview.search.sort.score": "Theo điểm số",
  "domainOverview.search.sort.cpc": "Theo CPC",
  "domainOverview.search.submit": "Tìm kiếm",
  "domainOverview.search.submitting": "Đang tải…",
  "domainOverview.search.includeSubdomains": "Bao gồm tên miền phụ",

  "domainOverview.search.validation.domainRequired": "Vui lòng nhập tên miền",
  "domainOverview.search.validation.domainInvalid":
    "Vui lòng nhập URL hoặc tên miền hợp lệ (vd: example.com)",

  "domainOverview.search.lookupFailed": "Tra cứu thất bại.",
  "domainOverview.search.notEnoughDataToast":
    "Không đủ dữ liệu cho tên miền này",
  "domainOverview.search.tabLimitReached":
    "Đóng bớt một tab để mở thêm lượt tìm kiếm (tối đa {max, number}).",

  "domainOverview.stats.organicTraffic": "Lưu lượng truy cập tự nhiên ước tính",
  "domainOverview.stats.organicKeywords": "Từ khóa tự nhiên",
  "domainOverview.stats.noData": "Không đủ dữ liệu",

  "domainOverview.result.notEnoughData":
    "Chưa đủ dữ liệu cho tên miền này. Hãy thử tên miền khác hoặc bao gồm tên miền phụ.",

  "domainOverview.tabs.keywords": "Từ khóa hàng đầu",
  "domainOverview.tabs.pages": "Trang hàng đầu",

  "domainOverview.history.emptyPrompt": "Nhập tên miền để bắt đầu",
  "domainOverview.history.recentCount":
    "{count, plural, other {# lượt tìm kiếm gần đây}}",
  "domainOverview.history.rootDomainOnly": "Chỉ tên miền gốc",
  "domainOverview.history.removeAriaLabel":
    "Xóa lượt tìm kiếm gần đây cho {domain}",
} as const;
