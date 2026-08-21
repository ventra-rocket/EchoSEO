import type { common as en } from "../en/common";

// Strings in shared components under `src/client/components/`. They live here
// rather than being passed in as props with English defaults: a default is what
// lets a caller silently forget and ship English into a Vietnamese page, which
// is the failure this catalog exists to make impossible. A shared component that
// reads its own ids is correct for every feature at once, including the ones
// written after it.
export const common: Record<keyof typeof en, string> = {
  "common.table.bulkActions": "Thao tác hàng loạt",
  "common.table.clearSelection": "Bỏ chọn",
  "common.table.selected": "đã chọn",
  "common.table.export": "Xuất",
  "common.table.sortBy": "Sắp xếp theo {label}",
  "common.auth.config.title": "Cần thiết lập xác thực",
  "common.auth.config.instructions":
    "Kiểm tra các biến môi trường xác thực cho {authMode} đã chọn. Cloudflare Access cần {teamDomain} và {policyAud}. Chế độ hosted cần {betterAuthSecret} và {betterAuthUrl}.",
  "common.auth.required.title": "Cần xác thực",
  "common.auth.required.externalInstructions":
    "Bản triển khai này dùng dịch vụ xác thực bên ngoài. Hãy làm mới phiên truy cập rồi thử lại.",
  "common.auth.redirectingBilling":
    "Đang chuyển bạn đến trang thanh toán để bắt đầu gói hosted.",
  "common.action.retry": "Thử lại",
  "common.action.home": "Trang chủ",
  "common.action.back": "Quay lại",
  "common.action.close": "Đóng",
  "common.action.openSetupGuide": "Mở hướng dẫn thiết lập",
  "common.error.default": "Đã xảy ra lỗi. Vui lòng thử lại.",
  "common.error.code.unauthenticated": "Vui lòng đăng nhập rồi thử lại.",
  "common.error.code.authConfigMissing":
    "EchoSEO chưa được cấu hình xác thực. Hãy làm theo hướng dẫn thiết lập Cloudflare Access trong README.",
  "common.error.code.paymentRequired":
    "Bạn cần một gói hosted đang hoạt động để sử dụng EchoSEO.",
  "common.error.code.insufficientCredits":
    "Bạn đã hết tín dụng. Hãy mua thêm hoặc nâng cấp gói để tiếp tục.",
  "common.error.code.forbidden": "Bạn không có quyền truy cập tài nguyên này.",
  "common.error.code.notFound": "Không tìm thấy tài nguyên được yêu cầu.",
  "common.error.code.auditCapacityReached":
    "Tài khoản đã đạt giới hạn số audit. Hãy xóa các audit cũ trong dự án để bắt đầu audit mới.",
  "common.error.code.auditVerificationRequired":
    "Crawl trên {threshold, number} trang cần một tài sản Search Console bao phủ tên miền này. Hãy giảm Số trang tối đa xuống {threshold, number}, hoặc kết nối một tài sản phù hợp trong phần Cài đặt.",
  "common.error.code.validation": "Vui lòng kiểm tra dữ liệu nhập rồi thử lại.",
  "common.error.code.crawlTargetBlocked":
    "Mục tiêu crawl này bị chặn theo chính sách bảo mật.",
  "common.error.code.backlinksNotEnabled":
    "Tài khoản DataForSEO đã kết nối chưa bật Backlinks.",
  "common.error.code.backlinksBillingIssue":
    "Tài khoản DataForSEO đã kết nối đang gặp vấn đề về thanh toán hoặc số dư.",
  "common.error.code.aiSearchNotEnabled":
    "Tài khoản DataForSEO đã kết nối chưa bật AI Optimization.",
  "common.error.code.aiSearchBillingIssue":
    "Tài khoản DataForSEO đã kết nối đang gặp vấn đề về thanh toán hoặc số dư.",
  "common.error.code.dataforseoAuthFailed":
    "DataForSEO đã từ chối yêu cầu. Khóa API có thể không đúng, hoặc tài khoản DataForSEO chưa thể lấy dữ liệu — hãy kiểm tra cả hai trong phần Cài đặt.",
  "common.error.code.dataforseoKeyMissing":
    "Hãy thêm khóa API DataForSEO trong phần Cài đặt để tải dữ liệu từ khóa, backlink, tên miền và thứ hạng.",
  "common.error.code.rateLimited":
    "Có quá nhiều yêu cầu. Vui lòng chờ rồi thử lại.",
  "common.error.code.upstreamUnavailable":
    "Nhà cung cấp dữ liệu đang tạm thời gián đoạn. Vui lòng thử lại sau giây lát.",
  "common.error.code.targetBehindAuth":
    "Trang web này nằm sau bước đăng nhập hoặc cổng truy cập nên không thể kiểm tra các trang của nó.",
  "common.error.code.conflict": "Yêu cầu này xung đột với dữ liệu hiện có.",
  "common.error.code.internal":
    "Đã xảy ra lỗi ngoài dự kiến. Vui lòng kiểm tra log máy chủ rồi thử lại.",
  "common.notFound.body": "Không tìm thấy trang bạn đang tìm.",
  "common.theme.title": "Giao diện",
  "common.theme.preferenceAria": "Tùy chọn giao diện",
  "common.theme.system": "Theo hệ thống",
  "common.theme.light": "Sáng",
  "common.theme.dark": "Tối",
  "common.location.selectCountry": "Chọn quốc gia",
  "common.location.searchPlaceholder": "Tìm quốc gia",
  "common.location.noMatches": "Không có quốc gia nào khớp với “{query}”",
  "common.table.selectAllRows": "Chọn tất cả hàng",
  "common.table.selectRow": "Chọn hàng",
  "common.table.rowsPerPage": "Số hàng mỗi trang",
  "common.table.rangeWithTotal":
    "{start, number}–{end, number}/{total, number}",
  "common.table.page": "Trang {page, number}",
  "common.table.pageOf": "Trang {page, number}/{totalPages, number}",
  "common.table.previousPage": "Trang trước",
  "common.table.nextPage": "Trang sau",
  "common.sheets.export": "Xuất sang Sheets",
  "common.sheets.copyAndOpenTitle": "Sao chép bảng và mở một Google Sheet mới",
  "common.sheets.copied":
    "Đã sao chép {rowCount, plural, other {# hàng}} vào bộ nhớ tạm",
  "common.sheets.instructions":
    "Mở một Google Sheet mới rồi dán để điền dữ liệu.",
  "common.sheets.open": "Mở Google Sheet mới",
};
