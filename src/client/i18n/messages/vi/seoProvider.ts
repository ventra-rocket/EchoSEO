import type { seoProvider as en } from "@/client/i18n/messages/en/seoProvider";

// SEO data provider settings — the DataForSEO key card.
export const seoProvider: Record<keyof typeof en, string> = {
  "seoProvider.section": "Nhà cung cấp dữ liệu SEO",
  "seoProvider.description":
    "Dùng tài khoản DataForSEO của riêng bạn cho dữ liệu từ khóa, thứ hạng, backlink và tên miền. DataForSEO tính phí trực tiếp cho bạn; EchoSEO chỉ chi trả cho các tính năng AI.",
  "seoProvider.platformDefault":
    "Để trống nếu bạn muốn dùng khóa mặc định của nền tảng.",
  "seoProvider.getKey": "Lấy khóa tại dataforseo.com",
  "seoProvider.inputLabel": "Khóa API (base64 của login:password)",
  "seoProvider.placeholder": "Dán khóa API DataForSEO của bạn",
  "seoProvider.checking": "Đang kiểm tra…",
  "seoProvider.loadError": "Không tải được trạng thái khóa DataForSEO.",
  "seoProvider.save": "Lưu khóa",
  "seoProvider.saving": "Đang lưu…",
  "seoProvider.remove": "Xóa",
  "seoProvider.removing": "Đang xóa…",
  "seoProvider.badge.org": "Khóa của bạn",
  "seoProvider.badge.global": "Mặc định nền tảng",
  "seoProvider.badge.none": "Chưa đặt",
  "seoProvider.toast.saved":
    "Đã lưu khóa DataForSEO. Tài khoản của bạn đã trả lời một yêu cầu dữ liệu, sẵn sàng dùng.",
  "seoProvider.toast.savedNotServing":
    "Đã lưu khóa, nhưng DataForSEO chưa trả dữ liệu cho tài khoản này.",
  "seoProvider.toast.savedReadinessUnknown":
    "Đã lưu khóa. Chưa kiểm tra được tài khoản DataForSEO của bạn có lấy được dữ liệu hay không.",
  "seoProvider.notice.notServing":
    "DataForSEO chấp nhận khóa này nhưng từ chối một yêu cầu dữ liệu cho tài khoản đứng sau nó. Điều này xảy ra khi tài khoản mới tinh chưa bắt đầu trả lời, khi số dư đã cạn, hoặc khi tài khoản bị đình chỉ hay bị giới hạn theo địa chỉ IP. Chỉ trường hợp đầu tiên tự hết — mở dashboard DataForSEO để biết bạn đang ở trường hợp nào.",
  "seoProvider.notice.readinessUnknown":
    "Không kết nối được tới DataForSEO để kiểm tra tài khoản này có lấy được dữ liệu hay không, nên khóa được lưu mà chưa xác minh. Mở một trang dùng dữ liệu nhà cung cấp để biết kết quả.",
  "seoProvider.notice.helpLink":
    "Tìm hiểu thêm về tình trạng tài khoản DataForSEO",
  "seoProvider.toast.removed": "Đã xóa khóa DataForSEO.",
  "seoProvider.toast.invalidKey":
    "Khóa DataForSEO bị từ chối. Kiểm tra lại base64 của login:password rồi thử lại.",
  "seoProvider.toast.authFailed":
    "DataForSEO từ chối khóa này. Hoặc khóa sai, hoặc tài khoản đứng sau nó đang bị đình chỉ hay bị giới hạn theo địa chỉ IP.",
  "seoProvider.toast.forbidden":
    "Chỉ chủ sở hữu và quản trị viên workspace mới được đổi khóa DataForSEO.",
  "seoProvider.toast.error": "Không lưu được khóa DataForSEO.",
  "seoProvider.keyMissing.title": "Chưa kết nối khóa API DataForSEO",
  "seoProvider.keyMissing.description":
    "Dữ liệu này đến từ DataForSEO. Chưa có yêu cầu nào được gửi nên hiện chưa có gì để báo cáo — hãy thêm khóa để xem kết quả.",
  "seoProvider.keyMissing.helpLink": "Cách thêm khóa API DataForSEO",
};
