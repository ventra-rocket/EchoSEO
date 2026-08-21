import type { rankConfig as en } from "../en/rankConfig";

// Rank tracking domains, config modal, schedule, keyword add flow and the cost/plan notices.
export const rankConfig: Record<keyof typeof en, string> = {
  "rank.page.subtitle": "Theo dõi thứ hạng từ khóa trên nhiều tên miền",

  "rank.config.action.cancel": "Hủy",
  "rank.config.action.addDomain": "Thêm tên miền",

  // "Desktop"/"Mobile" stay untranslated, matching the shipped
  // audit.results.filters.option.desktop/mobile precedent.
  "rank.config.device.both": "Desktop + Mobile",
  "rank.config.device.desktop": "Desktop",
  "rank.config.device.mobile": "Mobile",
  "rank.config.schedule.daily": "Hàng ngày",
  "rank.config.schedule.weekly": "Hàng tuần",
  "rank.config.schedule.monthly": "Hàng tháng",
  "rank.config.schedule.manual": "Thủ công",

  "rank.config.domainList.heading": "Tên miền đang theo dõi",
  "rank.config.domainList.empty.title": "Chưa có tên miền nào được theo dõi",
  "rank.config.domainList.empty.body":
    "Thêm một tên miền để bắt đầu theo dõi thứ hạng từ khóa theo thời gian.",
  "rank.config.domainList.filterEmpty.title": "Không có tên miền nào khớp",
  "rank.config.domainList.filterEmpty.body":
    "Hãy xóa tìm kiếm hoặc điều chỉnh bộ lọc.",
  "rank.config.domainList.filterEmpty.clear": "Xóa bộ lọc",
  "rank.config.domainList.archiveModal.title": "Lưu trữ {domain}?",
  "rank.config.domainList.archiveModal.body":
    "Các lượt kiểm tra định kỳ sẽ dừng lại và tên miền này sẽ bị ẩn khỏi danh sách. Lịch sử thứ hạng vẫn được giữ lại.",
  "rank.config.domainList.archiveModal.confirm": "Lưu trữ",
  "rank.config.domainList.archiveToast": "Đã lưu trữ tên miền",
  "rank.config.domainList.row.openAria": "Mở {domain}",
  "rank.config.domainList.row.archiveTitle": "Lưu trữ tên miền",
  "rank.config.domainList.row.creditsSkipped":
    "Đã bỏ qua lượt kiểm tra định kỳ — không đủ credit",
  "rank.config.domainList.row.keywordsLabel": "Từ khóa",
  "rank.config.summary.paused": " (tạm dừng)",
  "rank.config.summary.lastRunSuffix": " · Lần cuối: {date}",

  "rank.config.detail.backToDomains": "Quay lại danh sách tên miền",
  "rank.config.detail.notFound": "Không tìm thấy cấu hình tên miền.",
  "rank.config.detail.creditsSkippedAlert":
    "Lượt kiểm tra định kỳ gần nhất đã bị bỏ qua do không đủ credit. Nạp thêm số dư để tiếp tục theo dõi tự động.",
  "rank.config.detail.staleRunAlert":
    "Lượt chạy này có thể đang treo và sẽ được tự động dọn dẹp.",
  "rank.config.detail.lastCheckFailed":
    "Lượt kiểm tra gần nhất thất bại: {error}",
  "rank.config.detail.comparePeriod.title": "Khoảng so sánh",
  "rank.config.detail.comparePeriod.1d": "so với hôm qua",
  "rank.config.detail.comparePeriod.7d": "so với tuần trước",
  "rank.config.detail.comparePeriod.30d": "so với tháng trước",
  "rank.config.detail.comparePeriod.90d": "so với 90 ngày trước",
  "rank.config.detail.configure": "Cấu hình",
  "rank.config.detail.addKeywords": "Thêm từ khóa",
  "rank.config.detail.costPerCheck": "~{amount}/lượt kiểm tra",
  "rank.config.detail.addKeywordsFirstToast":
    'Hãy thêm từ khóa trước — dùng nút "Thêm từ khóa" ở trên.',
  "rank.config.detail.checkNowUseMenuToast":
    'Dùng mục "Kiểm tra thứ hạng" trong menu ⋯ để kiểm tra các từ khóa này',
  "rank.config.detail.keywordsCopiedToast": "Đã sao chép từ khóa vào clipboard",
  "rank.config.detail.keywordsAddedToast":
    "{count, plural, other {Đã thêm # từ khóa}}",

  "rank.config.modal.editTitle": "Sửa cấu hình tên miền",
  "rank.config.modal.saveChanges": "Lưu thay đổi",
  "rank.config.form.domainLabel": "Tên miền mục tiêu",
  "rank.config.form.domainPlaceholder": "example.com",
  "rank.config.form.countryLabel": "Quốc gia",
  "rank.config.form.languageLabel": "Ngôn ngữ",
  "rank.config.form.devicesLabel": "Thiết bị",
  "rank.config.form.deviceOnly.desktop": "Chỉ Desktop",
  "rank.config.form.deviceOnly.mobile": "Chỉ Mobile",
  "rank.config.form.devicesHint":
    "Phần lớn lượt tìm kiếm Google đến từ thiết bị di động, nhưng hãy chọn theo đối tượng khách hàng của bạn.",
  "rank.config.form.devicesBothInfo":
    "Theo dõi cả hai thiết bị dùng gấp đôi credit cho mỗi lượt kiểm tra từ khóa",
  "rank.config.form.scheduleLabel": "Lịch kiểm tra",
  "rank.config.form.scheduleMonthly": "Hàng tháng (cuối tháng)",
  "rank.config.form.scheduleManualOnly": "Chỉ thủ công",
  "rank.config.form.scheduleDailyInfo":
    "Kiểm tra hàng ngày dùng credit gấp 7 lần so với hàng tuần",
  "rank.config.form.depthLabel": "Độ sâu tìm kiếm",
  "rank.config.form.depthOption":
    "{pages, plural, other {# trang}} (top {results} kết quả)",
  "rank.config.form.depthHint":
    "10 trang tốn kém hơn khoảng 8 lần so với 1 trang",
  "rank.config.form.domainRequiredToast": "Vui lòng nhập tên miền",
  "rank.config.form.domainInvalidToast": "Vui lòng nhập tên miền hợp lệ",
  "rank.config.form.createSuccessToast":
    "Đã thêm tên miền để theo dõi thứ hạng",
  "rank.config.form.createErrorDefault": "Không thể lưu cấu hình",
  "rank.config.form.updateSuccessToast": "Đã cập nhật cấu hình",
  "rank.config.form.updateErrorDefault": "Không thể cập nhật cấu hình",
  "rank.config.scheduledRuns.createHint":
    "Kiểm tra tự động ban đầu ở trạng thái tắt. Thêm tên miền, sau đó bật trong mục Cấu hình khi bạn sẵn sàng chi cho lịch này.",
  "rank.config.scheduledRuns.toggleLabel": "Tự động chạy kiểm tra",
  "rank.config.scheduledRuns.enabledHint":
    "Kiểm tra sẽ chạy theo lịch ở trên và tính phí vào khóa DataForSEO của bạn mà không hỏi lại.",
  "rank.config.scheduledRuns.disabledHint":
    "Kiểm tra chỉ chạy khi bạn tự bắt đầu.",

  "rank.config.checkModal.title": "Kiểm tra {count, plural, other {# từ khóa}}",
  "rank.config.checkModal.subtitle":
    "{count, plural, other {# từ khóa}} × {deviceCount, plural, other {# thiết bị}} = {totalChecks, plural, other {# lượt kiểm tra SERP}}",
  "rank.config.checkModal.runNow": "Chạy ngay",
  "rank.config.checkModal.etaSeconds": "Có kết quả sau ~{seconds} giây",
  "rank.config.checkModal.etaMinutes": "Có kết quả sau ~{minutes} phút",
  "rank.config.checkModal.cost": "~{amount}",

  "rank.config.costNote.perKeyword": "~{amount} mỗi từ khóa mỗi lượt kiểm tra",
  "rank.config.costNote.monthlyEstimate": "50 từ khóa sẽ tốn ~{amount}/tháng",

  "rank.config.freePlan.body":
    "Chúng tôi chỉ bắt đầu theo dõi thứ hạng từ khóa khi bạn <link>nâng cấp lên gói trả phí</link>.",

  "rank.config.addKeywords.placeholder": "Nhập từ khóa, mỗi dòng một từ",
  "rank.config.addKeywords.add": "Thêm",
  "rank.config.addKeywords.errorDefault": "Không thể thêm từ khóa",
  "rank.config.addKeywords.skippedToast":
    "{skipped, plural, other {# từ khóa không được thêm — đã theo dõi hoặc vượt giới hạn}}",
  "rank.config.keywordSuggestions.column.keyword": "Từ khóa",
  "rank.config.keywordSuggestions.column.keywordTooltip":
    "Từ khóa mà tên miền này đang có thứ hạng",
  "rank.config.keywordSuggestions.column.position": "Vị trí",
  "rank.config.keywordSuggestions.column.positionTooltip":
    "Vị trí xếp hạng hiện tại trên Google",
  "rank.config.keywordSuggestions.column.volume": "Lượng tìm kiếm",
  "rank.config.keywordSuggestions.column.volumeTooltip":
    "Lượng tìm kiếm hàng tháng",
  "rank.config.keywordSuggestions.column.traffic": "Lưu lượng truy cập",
  "rank.config.keywordSuggestions.column.trafficTooltip":
    "Lưu lượng truy cập tự nhiên ước tính hàng tháng",
  "rank.config.keywordSuggestions.title.manual": "Thêm từ khóa thủ công",
  "rank.config.keywordSuggestions.title.loading":
    "Đang tìm các từ khóa hàng đầu của bạn…",
  "rank.config.keywordSuggestions.title.error": "Không thể tải từ khóa",
  "rank.config.keywordSuggestions.title.empty": "Không tìm thấy thứ hạng nào",
  "rank.config.keywordSuggestions.title.choose": "Chọn từ khóa để theo dõi",
  "rank.config.keywordSuggestions.notSupportedBody":
    "Gợi ý từ khóa đã xếp hạng không khả dụng cho quốc gia này. Hãy tiếp tục và tự thêm các từ khóa bạn muốn theo dõi.",
  "rank.config.keywordSuggestions.continue": "Tiếp tục",
  "rank.config.keywordSuggestions.loadingHint": "Việc này thường mất vài giây",
  "rank.config.keywordSuggestions.errorBody":
    "Bạn có thể bỏ qua bước này và tự thêm từ khóa sau.",
  "rank.config.keywordSuggestions.skip": "Bỏ qua",
  "rank.config.keywordSuggestions.emptyBody":
    "Chúng tôi không tìm thấy từ khóa nào mà {domain} hiện đang có thứ hạng. Bạn có thể tự thêm từ khóa.",
  "rank.config.keywordSuggestions.foundSummary":
    "Đã tìm thấy {count, plural, other {# từ khóa}} mà {domain} đang có thứ hạng.",
  "rank.config.keywordSuggestions.selectedCount": "Đã chọn {selected}/{total}",
  "rank.config.keywordSuggestions.saveKeywords":
    "{count, plural, other {Lưu từ khóa}}",
  "rank.config.keywordSuggestions.addedToast":
    "{count, plural, other {Đã thêm # từ khóa để theo dõi}}",

  "rank.config.metricsRefresh.successToast":
    "{count, plural, other {Đã cập nhật số liệu cho # từ khóa}}",
  "rank.config.metricsRefresh.errorToast": "Không thể làm mới số liệu từ khóa",
  "rank.config.checkTrigger.alreadyRunning":
    "Đã có một lượt kiểm tra thứ hạng đang chạy",
  "rank.config.checkTrigger.started": "Đã bắt đầu kiểm tra thứ hạng",
  "rank.config.checkTrigger.errorDefault":
    "Không thể bắt đầu kiểm tra thứ hạng",
};
