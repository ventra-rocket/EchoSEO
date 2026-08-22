import type { authRecovery as en } from "../en/authRecovery";

// Email verification, forgot/reset password and OAuth consent routes. See en/authRecovery.ts for scope.
export const authRecovery: Record<keyof typeof en, string> = {
  "authRecovery.backToSignIn": "Quay lại đăng nhập",
  "authRecovery.signIn": "Đăng nhập",
  "authRecovery.passwordResetNotAvailable":
    "Tính năng đặt lại mật khẩu hiện chưa khả dụng.",

  // verify-email.tsx
  "authRecovery.verifyEmail.title": "Xác minh email",
  "authRecovery.verifyEmail.notAvailable":
    "Tính năng xác nhận email hiện chưa khả dụng.",
  "authRecovery.verifyEmail.checking": "Đang kiểm tra xác nhận email của bạn.",
  "authRecovery.verifyEmail.error.title": "Không thể xác nhận email của bạn",
  "authRecovery.verifyEmail.error.invalidToken":
    "Liên kết này không còn hiệu lực. Hãy yêu cầu email mới để tiếp tục.",
  "authRecovery.verifyEmail.error.tokenExpired":
    "Liên kết này đã hết hạn. Hãy yêu cầu email mới để tiếp tục.",
  "authRecovery.verifyEmail.error.userNotFound":
    "Không còn tìm thấy tài khoản này. Hãy thử tạo lại tài khoản.",
  "authRecovery.verifyEmail.error.unknown":
    "Không thể xác nhận email này. Hãy yêu cầu email mới rồi thử lại.",
  "authRecovery.verifyEmail.confirmed.title": "Đã xác nhận email",
  "authRecovery.verifyEmail.confirmed.helper":
    "Vậy là xong. Đang đưa bạn đến tài khoản của mình.",
  "authRecovery.verifyEmail.pending.title": "Xác minh email của bạn",
  "authRecovery.verifyEmail.pending.helperWithEmail":
    "Nhấp vào liên kết chúng tôi đã gửi đến {email} để xác minh email của bạn.",
  "authRecovery.verifyEmail.pending.helperNoEmail":
    "Kiểm tra hộp thư đến để tìm liên kết xác minh email của bạn.",
  "authRecovery.verifyEmail.resend": "Gửi lại email",
  "authRecovery.verifyEmail.resending": "Đang gửi email…",
  "authRecovery.verifyEmail.resendErrorFallback": "Không thể gửi thêm email.",
  "authRecovery.verifyEmail.resendSuccess": "Email mới đang được gửi đến bạn.",
  "authRecovery.verifyEmail.resendErrorRetry":
    "Hiện không thể gửi thêm email. Vui lòng thử lại.",

  // forgot-password.tsx
  "authRecovery.forgotPassword.emailInvalid":
    "Vui lòng nhập một địa chỉ email hợp lệ.",
  "authRecovery.forgotPassword.title": "Quên mật khẩu",
  "authRecovery.forgotPassword.helper":
    "Nhập email của bạn, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.",
  "authRecovery.forgotPassword.success.title": "Kiểm tra email của bạn",
  "authRecovery.forgotPassword.success.helper":
    "Nếu có tài khoản gắn với {email}, chúng tôi đã gửi một liên kết đặt lại mật khẩu.",
  "authRecovery.forgotPassword.successAlert":
    "Nếu có tài khoản gắn với email đó, bạn sẽ sớm nhận được hướng dẫn đặt lại mật khẩu.",
  "authRecovery.forgotPassword.emailPlaceholder": "Địa chỉ email…",
  "authRecovery.forgotPassword.submit": "Gửi liên kết đặt lại",
  "authRecovery.forgotPassword.submitting": "Đang gửi liên kết đặt lại…",
  "authRecovery.forgotPassword.submitError":
    "Không thể gửi email đặt lại mật khẩu.",
  "authRecovery.forgotPassword.submitErrorRetry":
    "Hiện không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.",

  // reset-password.tsx
  "authRecovery.resetPassword.error.invalidToken":
    "Liên kết đặt lại này không còn hiệu lực. Hãy yêu cầu liên kết mới để tiếp tục.",
  "authRecovery.resetPassword.error.tokenExpired":
    "Liên kết đặt lại này đã hết hạn. Hãy yêu cầu liên kết mới để tiếp tục.",
  "authRecovery.resetPassword.error.unknown":
    "Liên kết đặt lại này không thể dùng được nữa. Hãy yêu cầu liên kết mới rồi thử lại.",
  "authRecovery.resetPassword.title": "Đặt lại mật khẩu",
  "authRecovery.resetPassword.helper":
    "Chọn mật khẩu mới cho tài khoản của bạn.",
  "authRecovery.resetPassword.expired.title": "Liên kết đặt lại đã hết hạn",
  "authRecovery.resetPassword.complete.title": "Đã cập nhật mật khẩu",
  "authRecovery.resetPassword.complete.helper":
    "Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.",
  "authRecovery.resetPassword.continueToSignIn": "Tiếp tục đến trang đăng nhập",
  "authRecovery.resetPassword.requestNewLink": "Yêu cầu liên kết đặt lại mới",
  "authRecovery.resetPassword.passwordPlaceholder": "Mật khẩu mới…",
  "authRecovery.resetPassword.confirmPasswordPlaceholder":
    "Xác nhận mật khẩu mới…",
  "authRecovery.resetPassword.passwordTooShort":
    "Mật khẩu phải có ít nhất {min, number} ký tự.",
  "authRecovery.resetPassword.passwordTooLong":
    "Mật khẩu tối đa {max, number} ký tự.",
  "authRecovery.resetPassword.passwordMismatch": "Mật khẩu không khớp.",
  "authRecovery.resetPassword.submit": "Cập nhật mật khẩu",
  "authRecovery.resetPassword.submitting": "Đang cập nhật mật khẩu…",
  "authRecovery.resetPassword.submitError":
    "Liên kết đặt lại này không còn hiệu lực. Hãy yêu cầu liên kết mới rồi thử lại.",
  "authRecovery.resetPassword.submitErrorRetry":
    "Hiện không thể cập nhật mật khẩu của bạn. Vui lòng thử lại.",

  // _authenticated.oauth-consent.tsx
  "authRecovery.oauthConsent.title": "Cấp quyền truy cập MCP",
  "authRecovery.oauthConsent.subtitle":
    "Một ứng dụng đang yêu cầu quyền truy cập vào workspace EchoSEO của bạn.",
  "authRecovery.oauthConsent.signedInAs": "Đã đăng nhập với",
  "authRecovery.oauthConsent.scopesIntro": "Việc này sẽ cho phép ứng dụng",
  "authRecovery.oauthConsent.scope.readData.label":
    "Đọc dữ liệu EchoSEO của bạn",
  "authRecovery.oauthConsent.scope.readData.description":
    "Dự án, báo cáo từ khóa và kết quả audit.",
  "authRecovery.oauthConsent.scope.actOnBehalf.label":
    "Hành động thay bạn qua MCP",
  "authRecovery.oauthConsent.scope.actOnBehalf.description":
    "Chạy công cụ và ghi kết quả trở lại workspace của bạn.",
  "authRecovery.oauthConsent.scope.offlineAccess.label":
    "Duy trì quyền truy cập khi bạn không có mặt",
  "authRecovery.oauthConsent.scope.offlineAccess.description":
    "Tiếp tục hoạt động qua refresh token, kể cả sau khi phiên này kết thúc.",
  "authRecovery.oauthConsent.deny": "Hủy",
  "authRecovery.oauthConsent.approve": "Cấp quyền",
  "authRecovery.oauthConsent.approving": "Đang cấp quyền…",
  "authRecovery.oauthConsent.revokeNotice":
    "Bạn có thể thu hồi quyền truy cập bất cứ lúc nào trong phần Cài đặt.",
  "authRecovery.oauthConsent.error.generic":
    "Không thể hoàn tất việc cấp quyền.",
  "authRecovery.oauthConsent.error.missingRedirect":
    "Phản hồi cấp quyền không có URL chuyển hướng.",
};
