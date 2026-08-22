import type { auth as en } from "../en/auth";

// Sign-in and sign-up routes, including provider buttons, validation and interstitials. See en/auth.ts for scope.
export const auth: Record<keyof typeof en, string> = {
  "auth.continueWithGoogle": "Tiếp tục với Google",
  "auth.continueWithEmail": "Tiếp tục với email",
  "auth.createAccount": "Tạo tài khoản",
  "auth.field.emailPlaceholder": "Địa chỉ email...",
  "auth.field.passwordPlaceholder": "Mật khẩu...",
  "auth.validation.email": "Vui lòng nhập địa chỉ email hợp lệ.",

  "auth.signIn.title": "Đăng nhập",
  "auth.signIn.forgotPassword": "Quên mật khẩu?",
  "auth.signIn.submitPending": "Đang đăng nhập...",
  "auth.signIn.validation.passwordRequired": "Vui lòng nhập mật khẩu.",
  "auth.signIn.error.default": "Không thể đăng nhập cho bạn.",
  "auth.signIn.error.network": "Hiện chưa thể đăng nhập. Vui lòng thử lại.",
  "auth.signIn.error.googleUnavailable":
    "Đăng nhập bằng Google hiện chưa khả dụng.",

  "auth.signUp.title": "Tạo tài khoản của bạn",
  "auth.signUp.backToChooser": "Quay lại đăng ký",
  "auth.signUp.submitPending": "Đang tạo tài khoản...",
  "auth.signUp.field.namePlaceholder": "Tên (không bắt buộc)...",
  "auth.signUp.field.confirmPasswordPlaceholder": "Xác nhận mật khẩu...",
  "auth.signUp.validation.passwordTooShort":
    "Mật khẩu phải có ít nhất {min, number} ký tự.",
  "auth.signUp.validation.passwordTooLong":
    "Mật khẩu tối đa {max, number} ký tự.",
  "auth.signUp.validation.passwordMismatch": "Mật khẩu xác nhận không khớp.",
  "auth.signUp.error.default": "Không thể tạo tài khoản.",
  "auth.signUp.error.network": "Hiện chưa thể tạo tài khoản. Vui lòng thử lại.",
  "auth.signUp.error.googleUnavailable":
    "Đăng ký bằng Google hiện chưa khả dụng.",
  "auth.signUp.legal.agreement":
    "Khi đăng ký, bạn đồng ý với <terms>Điều khoản</terms> và <privacy>Chính sách quyền riêng tư</privacy> của chúng tôi.",
  "auth.signUp.alreadyHaveAccount":
    "Đã có tài khoản? <signIn>Đăng nhập</signIn>",
};
