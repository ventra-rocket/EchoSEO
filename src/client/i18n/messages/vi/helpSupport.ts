import type { helpSupport as en } from "../en/helpSupport";

// The DataForSEO API-key help page and the support route. See
// en/helpSupport.ts for scope and for why certain strings — DataForSEO's own
// "API Access" label, "Base64", `DATAFORSEO_API_KEY`, and DataForSEO's literal
// API error text — stay in English here too: they are what a reader has to
// match against something outside EchoSEO. "dashboard", "secret",
// "self-hosted" and "deployment" also stay as English loanwords, matching the
// shipped seoProvider/gsc catalogs.
export const helpSupport: Record<keyof typeof en, string> = {
  "helpSupport.apiKey.title": "Thiết lập khóa API DataForSEO của bạn",
  "helpSupport.apiKey.intro":
    "EchoSEO cần có secret {envVar} trước khi các luồng xử lý dữ liệu từ khóa, tên miền và SEO có thể chạy.",

  "helpSupport.apiKey.steps.heading": "Các bước",
  "helpSupport.apiKey.steps.requestAccess":
    "Truy cập <link>DataForSEO API Access</link> để yêu cầu thông tin xác thực API qua email.",
  "helpSupport.apiKey.steps.encodeIntro":
    "Mã hóa Base64 tên đăng nhập và mật khẩu API DataForSEO của bạn theo định dạng sau:",
  "helpSupport.apiKey.steps.saveSecret":
    "Lưu kết quả đó làm secret {envVar} trong môi trường của bạn.",

  "helpSupport.apiKey.settings.heading": "Thêm khóa trong {settingsLabel}",
  "helpSupport.apiKey.settings.openSettings":
    "Mở <link>{settingsLabel}</link>.",
  "helpSupport.apiKey.settings.findSection":
    "Tìm phần <strong>{sectionLabel}</strong>.",
  "helpSupport.apiKey.settings.pasteValue":
    "Dán giá trị base64 từ lệnh terminal ở trên rồi lưu lại.",
  "helpSupport.apiKey.settings.selfHosted":
    "Self-hosting? Hãy đặt secret {envVar} thay vào đó — xem {command} trong tài liệu deployment của bạn.",

  "helpSupport.apiKey.slowActivation.heading":
    "Tài khoản mới có thể chưa phản hồi ngay",
  "helpSupport.apiKey.slowActivation.body":
    "Một tài khoản DataForSEO vừa tạo có thể mất khoảng một ngày trước khi API bắt đầu phản hồi, kể cả khi bạn đã hoàn tất bước xác minh email. Trong lúc đó, mọi yêu cầu dữ liệu đều trả về {errorCode} — {apiMessage} — trong khi dashboard DataForSEO không báo lỗi gì.",
  "helpSupport.apiKey.slowActivation.reassurance":
    "Đây không phải lỗi ở khóa của bạn, và không có gì cần sửa ở phía EchoSEO. Việc lưu khóa trong {settingsLabel} sẽ cho bạn biết mình đang ở trạng thái nào: khóa sai sẽ bị từ chối ngay lập tức, còn khóa đúng trên một tài khoản chưa sẵn sàng trả dữ liệu vẫn được lưu kèm ghi chú báo điều đó. Hãy thử lại sau.",

  "helpSupport.support.title": "Chúng tôi muốn lắng nghe bạn",
  "helpSupport.support.intro":
    "Chúng tôi muốn trò chuyện với bạn! Chúng tôi luôn sẵn lòng đón nhận góp ý và muốn hiểu cách bạn làm việc để giúp EchoSEO tốt hơn.",

  "helpSupport.support.email.label": "Email",
  "helpSupport.support.email.description":
    "Gửi trực tiếp ý tưởng, vấn đề, câu hỏi hoặc góp ý.",
  "helpSupport.support.email.copiedToast": "Đã sao chép email vào clipboard",

  "helpSupport.support.discord.label": "Discord",
  "helpSupport.support.discord.description":
    "Đặt câu hỏi, chia sẻ ý tưởng và học hỏi từ cộng đồng.",
  "helpSupport.support.discord.cta": "Tham gia Discord",

  "helpSupport.support.github.label": "GitHub Issues",
  "helpSupport.support.github.description":
    "Báo lỗi hoặc đề xuất tính năng trên GitHub.",
  "helpSupport.support.github.cta": "Mở issue mới",
};
