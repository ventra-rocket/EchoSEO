import type { rankTable as en } from "../en/rankTable";

// Rank tracking table: columns, cells, toolbar, filters, export and the Search Console overlay note.
export const rankTable: Record<keyof typeof en, string> = {
  // Columns (RankTrackingColumns.tsx) — short header labels
  "rank.table.column.keyword": "Từ khóa",
  "rank.table.column.volume": "Lượng tìm kiếm",
  "rank.table.column.kd": "KD",
  "rank.table.column.cpc": "CPC",
  "rank.table.column.position": "Thứ hạng",
  "rank.table.column.url": "URL",
  "rank.table.column.serpFeatures": "Tính năng SERP",
  "rank.table.column.gscClicks": "GSC Click",
  "rank.table.column.gscImpressions": "GSC Hiển thị",
  "rank.table.column.gscAvgPosition": "GSC Vị trí TB",
  "rank.table.column.sortByAriaLabel": "Sắp xếp theo {label}",
  "rank.table.column.viewPositionHistory": "Xem lịch sử thứ hạng",

  // Column header tooltips
  "rank.table.tooltip.keyword":
    "Từ khóa tìm kiếm đang được theo dõi trên Google",
  "rank.table.tooltip.volume": "Lượng tìm kiếm hàng tháng ước tính từ Google",
  "rank.table.tooltip.kd":
    "Điểm độ khó từ khóa (0-100) — càng cao càng khó lên hạng",
  "rank.table.tooltip.cpc":
    "Chi phí trung bình mỗi lượt click trên Google Ads (USD)",
  "rank.table.tooltip.position":
    "Thứ hạng hiện tại trên Google, kèm mức thay đổi so với kỳ so sánh",
  "rank.table.tooltip.url":
    "Trang trên site của bạn đang xếp hạng cho từ khóa này",
  "rank.table.tooltip.serpFeatures":
    "Các tính năng kết quả đặc biệt xuất hiện trên trang kết quả tìm kiếm (ví dụ: AI Overview, People Also Ask)",
  "rank.table.tooltip.gscClicks":
    "Số lượt click Search Console ghi nhận cho đúng truy vấn này trong 28 ngày qua — dữ liệu gốc của Google, không phải kết quả kiểm tra SERP",
  "rank.table.tooltip.gscImpressions":
    "Số lượt hiển thị Search Console ghi nhận cho đúng truy vấn này trong 28 ngày qua",
  "rank.table.tooltip.gscAvgPosition":
    "Vị trí trung bình trong 28 ngày qua, tính trên các lượt hiển thị mà site thực sự nhận được. Đây là giá trị trung bình, không phải thứ hạng thời gian thực trong cột Thứ hạng",

  // SERP feature badges
  "rank.table.serp.featuredSnippet.short": "FS",
  "rank.table.serp.peopleAlsoAsk.short": "PAA",
  "rank.table.serp.aiOverview.short": "AI",
  "rank.table.serp.localPack.short": "Local",
  "rank.table.serp.knowledgePanel.short": "KP",
  "rank.table.serp.video.short": "Video",
  "rank.table.serp.images.short": "Ảnh",
  "rank.table.serp.shopping.short": "Shop",
  "rank.table.serp.topStories.short": "Tin",
  "rank.table.serp.featuredSnippet.tooltip":
    "Featured Snippet — hộp trả lời nổi bật ở đầu kết quả tìm kiếm",
  "rank.table.serp.peopleAlsoAsk.tooltip":
    "People Also Ask — các câu hỏi liên quan có thể mở rộng",
  "rank.table.serp.aiOverview.tooltip":
    "AI Overview — bản tóm tắt do AI tạo ở đầu trang tìm kiếm",
  "rank.table.serp.localPack.tooltip":
    "Local Pack — bản đồ kèm danh sách doanh nghiệp địa phương",
  "rank.table.serp.knowledgePanel.tooltip":
    "Knowledge Panel — hộp thông tin về một thực thể",
  "rank.table.serp.video.tooltip":
    "Video — kết quả video hiển thị trong trang tìm kiếm",
  "rank.table.serp.images.tooltip":
    "Hình ảnh — kết quả hình ảnh hiển thị trong trang tìm kiếm",
  "rank.table.serp.shopping.tooltip": "Shopping — danh sách sản phẩm kèm giá",
  "rank.table.serp.topStories.tooltip":
    "Top Stories — băng chuyền bài báo tin tức",

  // Position cell
  "rank.table.rank.lost": "mất hạng",

  // GSC absent-cell tooltips — preserve the "unknown vs Google-reported-nothing"
  // distinction; never flatten either branch into a generic "no data" line.
  "rank.table.gsc.tooltip.countComplete":
    "Google không ghi nhận gì cho truy vấn này trong khoảng thời gian — hiển thị là 0, nhưng các truy vấn quá hiếm cũng bị Search Console lược bỏ hoàn toàn và sẽ trông giống hệt như vậy",
  "rank.table.gsc.tooltip.countTruncated":
    "Nằm ngoài các truy vấn đã đọc được từ Search Console — chưa xác định, không phải là 0",
  "rank.table.gsc.tooltip.positionComplete":
    "Google không ghi nhận gì cho truy vấn này trong khoảng thời gian, nên không có vị trí trung bình để hiển thị — các truy vấn quá hiếm cũng bị Search Console lược bỏ hoàn toàn và sẽ trông giống hệt như vậy",
  "rank.table.gsc.tooltip.positionTruncated":
    "Nằm ngoài các truy vấn đã đọc được từ Search Console — không có số đo nào",

  "rank.table.export.noData": "Không có dữ liệu để xuất",

  // Table shell, empty states, bulk actions
  "rank.table.empty.noKeywordsYet":
    'Chưa có từ khóa nào được theo dõi. Dùng "Thêm từ khóa" để bắt đầu, sau đó chạy một lượt kiểm tra.',
  "rank.table.empty.noMatch": "Không có từ khóa nào khớp với tìm kiếm của bạn.",
  "rank.table.bulk.selectedLabel": "đã chọn",
  "rank.table.bulk.remove": "Gỡ",
  "rank.table.bulk.removeConfirmTitle": "Gỡ từ khóa?",
  "rank.table.bulk.removeConfirmBody":
    "Thao tác này sẽ ngừng theo dõi {count, plural, other {# từ khóa}}. Dữ liệu thứ hạng trong lịch sử vẫn được giữ lại nhưng sẽ không hiển thị trong bảng.",
  "rank.table.bulk.cancel": "Hủy",
  "rank.table.bulk.removeConfirmButton":
    "Gỡ {count, plural, other {# từ khóa}}",
  "rank.table.remove.success": "Đã gỡ {removed, plural, other {# từ khóa}}",
  "rank.table.remove.errorDefault": "Không thể gỡ từ khóa",
  "rank.table.footer.count": "{shown}/{total, plural, other {# từ khóa}}",
  "rank.table.export.toSheets": "Xuất sang Sheets",
  "rank.table.export.csv": "Xuất CSV",

  // Toolbar
  "rank.table.toolbar.latest": "Mới nhất",
  "rank.table.toolbar.history": "Lịch sử",
  "rank.table.toolbar.filtersToggleTooltip": "Bật/tắt bộ lọc bảng",
  "rank.table.toolbar.filters": "Bộ lọc",
  "rank.table.toolbar.preparing": "Đang chuẩn bị…",
  "rank.table.toolbar.gettingRankings":
    "Đang lấy thứ hạng cho {total, plural, =0 {? từ khóa} other {# từ khóa}}…",
  "rank.table.toolbar.keywordCount": "{count, plural, other {# từ khóa}}",

  // Toolbar menus
  "rank.table.menu.moreActions": "Thêm thao tác",
  "rank.table.menu.checkRankings": "Kiểm tra thứ hạng",
  "rank.table.menu.checkRankingsRunning": "Đang chạy…",
  "rank.table.menu.checkRankingsDescription":
    "Lấy thứ hạng hiện tại trên Google",
  "rank.table.menu.updateStats": "Cập nhật số liệu từ khóa",
  "rank.table.menu.updateStatsRunning": "Đang làm mới…",
  "rank.table.menu.updateStatsDescription":
    "Lượng tìm kiếm, độ khó & CPC — không phải thứ hạng",
  "rank.table.menu.export": "Xuất",
  "rank.table.menu.copyKeywords": "Sao chép từ khóa",

  // Filters
  "rank.table.filter.refineResults": "Tinh chỉnh kết quả",
  "rank.table.filter.activeCount": "{count} đang áp dụng",
  "rank.table.filter.clearAll": "Xóa hết",
  "rank.table.filter.include": "Bao gồm",
  "rank.table.filter.includePlaceholder": "vd: seo, tool",
  "rank.table.filter.exclude": "Loại trừ",
  "rank.table.filter.excludePlaceholder": "vd: free, cheap",
  "rank.table.filter.desktopPosition": "Thứ hạng Desktop",
  "rank.table.filter.mobilePosition": "Thứ hạng Mobile",
  "rank.table.filter.min": "Tối thiểu",
  "rank.table.filter.max": "Tối đa",
  "rank.table.domainFilter.search": "Tìm kiếm",
  "rank.table.domainFilter.searchPlaceholder": "Tên miền hoặc website",
  "rank.table.domainFilter.device": "Thiết bị",
  "rank.table.domainFilter.allDevices": "Tất cả thiết bị",
  "rank.table.domainFilter.country": "Quốc gia",
  "rank.table.domainFilter.allCountries": "Tất cả quốc gia",
  "rank.table.domainFilter.clear": "Xóa",

  // Search Console overlay note. Preserve the load-bearing nuance: "?"/truncated
  // means unknown, and even a complete read's 0 is not a proof — Search Console
  // omits anonymized queries regardless of read depth.
  "rank.table.searchActuals.notConnected":
    "Kết nối Search Console để xem số lượt click, lượt hiển thị và vị trí trung bình mà Google ghi nhận cho các từ khóa này — miễn phí, không cần khóa API nhà cung cấp. <link>Mở Hiệu suất tìm kiếm</link>.",
  "rank.table.searchActuals.propertyMismatch":
    "Tài sản Search Console <mono>{property}</mono> không bao phủ <mono>{domain}</mono>, nên không có cột Search Console nào được hiển thị cho các từ khóa này.",
  "rank.table.searchActuals.ready":
    "Cột Search Console: dữ liệu gốc của Google cho <mono>{property}</mono>, {from} → {to}. Đây là vị trí trung bình trong khoảng thời gian, không phải thứ hạng SERP thời gian thực trong cột Thứ hạng. Google không bao giờ nêu tên một truy vấn đủ hiếm để bị ẩn danh, nên một từ khóa hiển thị 0 vẫn có thể có lưu lượng thực mà Search Console sẽ không báo cáo.",
  "rank.table.searchActuals.readyTruncatedSuffix":
    " Tài sản này có nhiều truy vấn hơn mức một lượt đọc có thể bao phủ, nên một từ khóa không có số liệu là chưa được đo ở đây chứ không phải bằng 0.",

  // Search Performance hint
  "rank.table.searchPerfHint.body":
    "Không có khóa API nhà cung cấp? Search Console đã cho biết site của bạn đang xếp hạng ra sao — <link>mở Hiệu suất tìm kiếm</link>.",
};
