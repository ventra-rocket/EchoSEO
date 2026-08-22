import type { backlinksTables as en } from "../en/backlinksTables";

// Backlinks tables: backlinks, referring domains and top pages tables, their columns, toolbar menus, filters and export controls. See en/backlinksTables.ts for scope.
export const backlinksTables: Record<keyof typeof en, string> = {
  "backlinksTables.metric.backlinks": "Liên kết trỏ về",
  "backlinksTables.metric.referringDomains": "Tên miền trỏ về",
  "backlinksTables.metric.rank": "Xếp hạng",
  "backlinksTables.metric.spam": "Spam",
  "backlinksTables.metric.spamScore": "Điểm Spam",
  "backlinksTables.metric.ahrefsDr": "Ahrefs DR",

  "backlinksTables.tab.pages": "Trang hàng đầu",
  "backlinksTables.tab.description.backlinks":
    "Xem từng liên kết trỏ đến mục tiêu của bạn, bao gồm trang nguồn, anchor text và các tín hiệu chất lượng liên kết.",
  "backlinksTables.tab.description.domains":
    "Xem các tên miền riêng biệt trỏ đến mục tiêu của bạn, được nhóm theo cấp trang web thay vì theo từng liên kết.",
  "backlinksTables.tab.description.pages":
    "Xem những trang nào trên trang web mục tiêu thu hút nhiều backlink và tên miền trỏ về nhất.",
  "backlinksTables.tab.loading.backlinks": "Đang tải backlink…",
  "backlinksTables.tab.loading.domains": "Đang tải tên miền trỏ về…",
  "backlinksTables.tab.loading.pages": "Đang tải trang hàng đầu…",

  "backlinksTables.toolbar.viewAriaLabel": "Chế độ xem backlink",
  "backlinksTables.toolbar.onePerDomain": "Một liên kết mỗi tên miền",
  "backlinksTables.toolbar.onePerDomainTitle":
    "Hiển thị liên kết mạnh nhất của mỗi tên miền trỏ về; mở rộng dòng để xem phần còn lại",
  "backlinksTables.toolbar.allLinks": "Tất cả liên kết",
  "backlinksTables.toolbar.allLinksTitle": "Liệt kê từng backlink riêng lẻ",

  "backlinksTables.export.ariaLabel": "Xuất bảng backlink",

  "backlinksTables.actions.ariaLabel": "Thao tác bảng backlink",
  "backlinksTables.actions.ahrefsDrTitle":
    "Tra cứu Ahrefs Domain Rating cho từng tên miền trong bảng",

  "backlinksTables.column.source": "Nguồn",
  "backlinksTables.tooltip.source": "Trang liên kết đến bạn",
  "backlinksTables.column.target": "Mục tiêu",
  "backlinksTables.tooltip.target": "Đích đến trên trang web của bạn",
  "backlinksTables.column.anchor": "Anchor",
  "backlinksTables.tooltip.anchor": "Văn bản hoặc định dạng của liên kết",
  "backlinksTables.anchorEmpty": "Không có anchor text",
  "backlinksTables.column.flags": "Cờ đánh dấu",
  "backlinksTables.tooltip.flags":
    "Các thuộc tính đặc biệt của backlink, chẳng hạn như đã mất, bị hỏng, nofollow hoặc nhiều liên kết từ cùng một nguồn.",
  "backlinksTables.column.link": "Liên kết",
  "backlinksTables.tooltip.link": "Độ uy tín của trang liên kết",
  "backlinksTables.column.da": "DA",
  "backlinksTables.tooltip.da": "Độ uy tín của tên miền liên kết",
  "backlinksTables.tooltip.backlinksSpam":
    "Rủi ro spam ước tính cho backlink này. Điểm càng cao càng có khả năng là thao túng hoặc chất lượng thấp.",
  "backlinksTables.column.firstSeen": "Lần đầu phát hiện",
  "backlinksTables.tooltip.backlinksFirstSeen":
    "Thời điểm liên kết này được trình thu thập dữ liệu phát hiện lần đầu",
  "backlinksTables.lastSeen": "Gần nhất {date}",
  "backlinksTables.tooltip.backlinksAhrefsDr":
    "Ahrefs Domain Rating (0-100) cho tên miền liên kết.",

  "backlinksTables.flag.lost": "Đã mất",
  "backlinksTables.flag.broken": "Bị hỏng",
  "backlinksTables.flag.nofollow": "Nofollow",
  "backlinksTables.flag.linksCount":
    "{count, plural, one {# liên kết} other {# liên kết}}",
  "backlinksTables.state.loadingLinks": "Đang tải liên kết…",
  "backlinksTables.state.loadError": "Không thể tải liên kết của tên miền này.",
  "backlinksTables.state.noOtherLinks":
    "Không có liên kết nào khác từ tên miền này.",
  "backlinksTables.source.hideLinksFromDomain":
    "Ẩn tất cả liên kết từ {domain}",
  "backlinksTables.source.showLinksFromDomain":
    "Hiện tất cả liên kết từ {domain}",

  "backlinksTables.column.domain": "Tên miền",
  "backlinksTables.tooltip.domain":
    "Trang web trỏ về liên kết đến mục tiêu của bạn.",
  "backlinksTables.tooltip.domainsBacklinks":
    "Tổng số backlink tìm thấy từ tên miền này.",
  "backlinksTables.column.referringPages": "Trang trỏ về",
  "backlinksTables.tooltip.referringPages":
    "Các trang riêng biệt trên tên miền này liên kết đến mục tiêu của bạn.",
  "backlinksTables.tooltip.domainsRank": "Điểm uy tín của tên miền trỏ về.",
  "backlinksTables.tooltip.domainsSpam":
    "Điểm rủi ro spam cho tên miền trỏ về này.",
  "backlinksTables.tooltip.domainsFirstSeen":
    "Thời điểm tên miền này được phát hiện lần đầu liên kết đến mục tiêu của bạn.",
  "backlinksTables.tooltip.domainsAhrefsDr":
    "Ahrefs Domain Rating (0-100) cho tên miền trỏ về này.",
  "backlinksTables.column.issues": "Vấn đề",
  "backlinksTables.tooltip.issues":
    "Số liên kết hỏng và trang hỏng liên quan đến tên miền này.",
  "backlinksTables.issues.brokenLinks": "Liên kết hỏng: {count}",
  "backlinksTables.issues.brokenPages": "Trang hỏng: {count}",

  "backlinksTables.column.page": "Trang",
  "backlinksTables.tooltip.page":
    "Trang trên trang web mục tiêu nhận backlink.",
  "backlinksTables.tooltip.pagesBacklinks":
    "Tổng số backlink trỏ đến trang này.",
  "backlinksTables.tooltip.pagesReferringDomains":
    "Các tên miền riêng biệt liên kết đến trang này.",
  "backlinksTables.tooltip.pagesRank": "Điểm uy tín của trang mục tiêu này.",
  "backlinksTables.column.brokenBacklinks": "Backlink hỏng",
  "backlinksTables.tooltip.pagesBrokenBacklinks":
    "Các backlink trỏ đến đây hiện đang bị hỏng.",

  "backlinksTables.empty.backlinks":
    "Không có backlink nào khớp với bộ lọc này.",
  "backlinksTables.empty.domains":
    "Không có tên miền trỏ về nào khớp với bộ lọc này.",
  "backlinksTables.empty.pages":
    "Không có trang hàng đầu nào khớp với bộ lọc này.",

  "backlinksTables.filter.linkType.label": "Loại liên kết",
  "backlinksTables.filter.linkType.all": "Tất cả",
  "backlinksTables.filter.linkType.dofollow": "Dofollow",
  "backlinksTables.filter.linkType.nofollow": "Nofollow",
  "backlinksTables.filter.visibility.label": "Hiển thị",
  "backlinksTables.filter.visibility.hideLost": "Ẩn liên kết đã mất",
  "backlinksTables.filter.visibility.hideBroken": "Ẩn liên kết hỏng",

  "backlinksTables.filter.placeholder.domainExample": "example.com, blog",
  "backlinksTables.filter.placeholder.spamExample": "spam, forum",
  "backlinksTables.filter.backlinks.sourceContains": "URL nguồn chứa",
  "backlinksTables.filter.backlinks.sourceExcludes": "URL nguồn không chứa",
  "backlinksTables.filter.range.domainAuthority": "Độ uy tín tên miền",
  "backlinksTables.filter.range.linkAuthority": "Độ uy tín liên kết",
  "backlinksTables.filter.domains.domainContains": "Tên miền chứa",
  "backlinksTables.filter.domains.domainExcludes": "Tên miền không chứa",
  "backlinksTables.filter.pages.pageContains": "URL trang chứa",
  "backlinksTables.filter.pages.pageContainsPlaceholder": "/blog, /products",
  "backlinksTables.filter.pages.pageExcludes": "URL trang không chứa",
  "backlinksTables.filter.pages.pageExcludesPlaceholder": "/tag, /author",
} as const;
