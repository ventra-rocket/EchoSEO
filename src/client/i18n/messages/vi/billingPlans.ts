import type { billingPlans as en } from "../en/billingPlans";

// Billing route and the subscribe interstitial. See en/billingPlans.ts for scope.
export const billingPlans: Record<keyof typeof en, string> = {
  "billingPlans.error.title": "Không thể tải thông tin thanh toán",
  "billingPlans.error.loadFailed":
    "Chúng tôi không thể tải thông tin thanh toán của bạn lúc này. Vui lòng thử lại.",

  "billingPlans.page.title": "Thanh toán",
  "billingPlans.pending.redirectingStripe": "Đang chuyển hướng đến Stripe...",
  "billingPlans.credits.remaining": "Còn lại {amount}",
  "billingPlans.credits.monthlyAmount": "Hàng tháng {amount}",
  "billingPlans.credits.topupAmount": "Nạp thêm {amount}",
  "billingPlans.credits.outOfCreditsFree":
    "Bạn đã dùng hết credit. Nâng cấp gói để tiếp tục.",
  "billingPlans.credits.outOfCreditsPaid":
    "Bạn đã dùng hết credit. Mua thêm credit bên dưới để tiếp tục.",
  "billingPlans.credits.lowFree":
    "Credit của bạn sắp hết. Nâng cấp để nhận {amount}/tháng.",
  "billingPlans.credits.lowPaid":
    "Credit của bạn sắp hết. Mua thêm credit bên dưới.",
  "billingPlans.plan.label": "Gói",
  "billingPlans.plan.free": "Gói miễn phí",
  "billingPlans.plan.base": "Gói Base",
  "billingPlans.plan.priceLabel": "{amount}/tháng",
  "billingPlans.plan.featureAllAccess": "Truy cập toàn bộ tính năng EchoSEO",
  "billingPlans.plan.featureCredits":
    "Bao gồm {amount} credit sử dụng mỗi tháng",
  "billingPlans.plan.upgradeButton": "Nâng cấp gói",
  "billingPlans.plan.manageButton": "Quản lý gói đăng ký",
  "billingPlans.checkout.startError":
    "Chúng tôi không thể bắt đầu thanh toán. Vui lòng thử lại.",
  "billingPlans.portal.openError":
    "Chúng tôi không thể mở cổng quản lý thanh toán. Vui lòng thử lại.",
  "billingPlans.topup.title": "Mua credit",
  "billingPlans.topup.description":
    "Credit nạp thêm không bao giờ hết hạn và được dùng sau khi hết credit hàng tháng.",
  "billingPlans.topup.rangeHint": "Nhập giá trị từ {min}–{max}.",
  "billingPlans.topup.buyButton": "Mua credit",
  "billingPlans.footer.poweredByStripe": "Thanh toán được hỗ trợ bởi Stripe.",

  "billingPlans.usage.title": "Mức sử dụng",
  "billingPlans.usage.last30Days": "30 ngày qua",
  "billingPlans.usage.noneRecorded": "Chưa ghi nhận mức sử dụng nào",
  "billingPlans.usage.byFeatureTitle": "Mức sử dụng theo tính năng",

  "billingPlans.creditFeature.keywordResearch": "Nghiên cứu từ khóa",
  "billingPlans.creditFeature.domainOverview": "Tổng quan tên miền",
  "billingPlans.creditFeature.backlinks": "Liên kết trỏ về",
  "billingPlans.creditFeature.siteAudit": "Kiểm tra website",
  "billingPlans.creditFeature.rankTracking": "Theo dõi thứ hạng",
  "billingPlans.creditFeature.aiCitations": "Trích dẫn AI",
  "billingPlans.creditFeature.aiPromptResponses": "Phản hồi Prompt AI",
  "billingPlans.creditFeature.aiSearch": "Tìm kiếm AI",
  "billingPlans.creditFeature.localSeo": "SEO địa phương",
  "billingPlans.creditFeature.onboarding": "Onboarding",
  "billingPlans.creditFeature.issueExplainer": "Giải thích lỗi",
  "billingPlans.creditFeature.other": "Khác",

  "billingPlans.freeBanner.buyMoreCreditsLink": "Mua thêm credit",
  "billingPlans.freeBanner.outOfCredits":
    "Bạn đã dùng hết credit. {link} để tiếp tục dùng EchoSEO.",
  "billingPlans.freeBanner.lowCredits":
    "Credit của bạn sắp hết. {link} để tiếp tục dùng EchoSEO.",
  "billingPlans.freeBanner.enjoying":
    "Hy vọng bạn đang hài lòng với EchoSEO! <upgradeLink>Nâng cấp bất cứ lúc nào</upgradeLink> hoặc <supportLink>liên hệ nếu có thắc mắc</supportLink>.",

  "billingPlans.subscribe.upgradeTitle": "Nâng cấp gói của bạn",
  "billingPlans.subscribe.welcomeNamed":
    "Chào mừng đến với EchoSEO, {firstName}!",
  "billingPlans.subscribe.welcome": "Chào mừng đến với EchoSEO!",
  "billingPlans.subscribe.tagline":
    "SEO theo cách của bạn. Mọi công cụ SEO trong một nơi, với mức giá hợp lý.",
  "billingPlans.plan.featureCore":
    "Nghiên cứu từ khóa, backlink, theo dõi thứ hạng và kiểm tra website",
  "billingPlans.plan.featureMcp":
    "Máy chủ MCP và kỹ năng agent cho Claude, Cursor và ChatGPT",
  "billingPlans.plan.featureGsc":
    "Tích hợp Search Console không bao giờ tốn credit",
  "billingPlans.subscribe.subscribeButton": "Đăng ký",
  "billingPlans.subscribe.redirecting": "Đang chuyển hướng...",
  "billingPlans.subscribe.error.verifyFailed":
    "Chúng tôi không thể xác minh trạng thái thanh toán của bạn lúc này. Vui lòng thử lại.",
  "billingPlans.subscribe.guaranteeSentence":
    "<tooltip>Bảo đảm hoàn tiền trong 30 ngày</tooltip>. Hủy bất cứ lúc nào. Được hỗ trợ bởi Stripe.",
  "billingPlans.subscribe.guaranteeTooltip":
    "Chưa phù hợp với bạn? Gửi email tới {email} trong vòng 30 ngày kể từ khi bị tính phí và chúng tôi sẽ hoàn lại tiền gói đăng ký.",
  "billingPlans.subscribe.questionsPrompt":
    "Có thắc mắc? <link>Gửi email tới {email}</link>.",
  "billingPlans.subscribe.backToApp": "Quay lại ứng dụng",
  "billingPlans.finalizing.title": "Đang hoàn tất gói đăng ký của bạn…",
  "billingPlans.finalizing.hint": "Thường chỉ mất vài giây.",
  "billingPlans.finalizing.supportPrompt":
    "Mất nhiều thời gian hơn dự kiến? <link>Gửi email tới {email}</link>.",

  "billingPlans.accountMenu.openAria": "Mở menu tài khoản",
  "billingPlans.accountMenu.settingsLink": "Cài đặt",
  "billingPlans.accountMenu.signOut": "Đăng xuất",
} as const;
