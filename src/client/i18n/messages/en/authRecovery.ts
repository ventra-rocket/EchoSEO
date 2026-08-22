// Email verification, forgot/reset password and OAuth consent routes.
//
// Ids shared verbatim across more than one of those routes live at the top,
// unnamespaced by screen ("Back to sign in" renders on both verify-email and
// forgot-password; "Password reset isn't available right now." is identical
// on forgot-password and reset-password) — one id per fact, per the catalog
// reuse rule.
//
// oauth-consent's `scope.*` ids are chosen by the `scope` param the OAuth
// provider forwards, checked against MCP_OAUTH_SCOPES so the list cannot
// over-claim what the server grants. There is deliberately no id naming the
// requesting application: the only requester identity that reaches the client
// is the unvalidated `client_id` param, and a consent screen must not assert
// an identity it cannot verify.
export const authRecovery = {
  "authRecovery.backToSignIn": "Back to sign in",
  "authRecovery.signIn": "Sign in",
  "authRecovery.passwordResetNotAvailable":
    "Password reset isn't available right now.",

  // verify-email.tsx
  "authRecovery.verifyEmail.title": "Verify email",
  "authRecovery.verifyEmail.notAvailable":
    "Email confirmation isn't available right now.",
  "authRecovery.verifyEmail.checking": "Checking your email confirmation.",
  "authRecovery.verifyEmail.error.title": "We couldn't confirm your email",
  "authRecovery.verifyEmail.error.invalidToken":
    "This link is no longer valid. Request a new email to keep going.",
  "authRecovery.verifyEmail.error.tokenExpired":
    "This link has expired. Request a new email to keep going.",
  "authRecovery.verifyEmail.error.userNotFound":
    "We couldn't find this account anymore. Try creating it again.",
  "authRecovery.verifyEmail.error.unknown":
    "We couldn't confirm this email. Request a new email and try again.",
  "authRecovery.verifyEmail.confirmed.title": "Email confirmed",
  "authRecovery.verifyEmail.confirmed.helper":
    "You're all set. Taking you to your account now.",
  "authRecovery.verifyEmail.pending.title": "Verify your email",
  "authRecovery.verifyEmail.pending.helperWithEmail":
    "Click the link we sent to {email} to verify your email.",
  "authRecovery.verifyEmail.pending.helperNoEmail":
    "Check your inbox for the link to verify your email.",
  "authRecovery.verifyEmail.resend": "Resend email",
  "authRecovery.verifyEmail.resending": "Sending email…",
  "authRecovery.verifyEmail.resendErrorFallback":
    "We couldn't send another email.",
  "authRecovery.verifyEmail.resendSuccess": "A new email is on the way.",
  "authRecovery.verifyEmail.resendErrorRetry":
    "We couldn't send another email right now. Please try again.",

  // forgot-password.tsx
  "authRecovery.forgotPassword.emailInvalid": "Enter a valid email address.",
  "authRecovery.forgotPassword.title": "Forgot password",
  "authRecovery.forgotPassword.helper":
    "Enter your email and we'll send you a password reset link.",
  "authRecovery.forgotPassword.success.title": "Check your email",
  "authRecovery.forgotPassword.success.helper":
    "If an account exists for {email}, we sent a reset link.",
  "authRecovery.forgotPassword.successAlert":
    "If an account exists for that email, you'll receive password reset instructions shortly.",
  "authRecovery.forgotPassword.emailPlaceholder": "Email address…",
  "authRecovery.forgotPassword.submit": "Send reset link",
  "authRecovery.forgotPassword.submitting": "Sending reset link…",
  "authRecovery.forgotPassword.submitError":
    "We couldn't send the reset email.",
  "authRecovery.forgotPassword.submitErrorRetry":
    "We couldn't send the reset email right now. Please try again.",

  // reset-password.tsx
  "authRecovery.resetPassword.error.invalidToken":
    "This reset link is no longer valid. Request a new one to keep going.",
  "authRecovery.resetPassword.error.tokenExpired":
    "This reset link has expired. Request a new one to keep going.",
  "authRecovery.resetPassword.error.unknown":
    "This reset link can't be used anymore. Request a new one and try again.",
  "authRecovery.resetPassword.title": "Reset password",
  "authRecovery.resetPassword.helper":
    "Choose a new password for your account.",
  "authRecovery.resetPassword.expired.title": "Reset link expired",
  "authRecovery.resetPassword.complete.title": "Password updated",
  "authRecovery.resetPassword.complete.helper":
    "Your password has been updated. Sign in with your new password.",
  "authRecovery.resetPassword.continueToSignIn": "Continue to sign in",
  "authRecovery.resetPassword.requestNewLink": "Request a new reset link",
  "authRecovery.resetPassword.passwordPlaceholder": "New password…",
  "authRecovery.resetPassword.confirmPasswordPlaceholder":
    "Confirm new password…",
  "authRecovery.resetPassword.passwordTooShort":
    "Password must be at least {min, number} characters.",
  "authRecovery.resetPassword.passwordTooLong":
    "Password must be at most {max, number} characters.",
  "authRecovery.resetPassword.passwordMismatch": "Passwords do not match.",
  "authRecovery.resetPassword.submit": "Update password",
  "authRecovery.resetPassword.submitting": "Updating password…",
  "authRecovery.resetPassword.submitError":
    "This reset link is no longer valid. Request a new one and try again.",
  "authRecovery.resetPassword.submitErrorRetry":
    "We couldn't update your password right now. Please try again.",

  // _authenticated.oauth-consent.tsx
  "authRecovery.oauthConsent.title": "Authorize MCP access",
  "authRecovery.oauthConsent.subtitle":
    "An application is requesting access to your EchoSEO workspace.",
  "authRecovery.oauthConsent.signedInAs": "Signed in as",
  "authRecovery.oauthConsent.scopesIntro": "This will allow it to",
  "authRecovery.oauthConsent.scope.readData.label": "Read your EchoSEO data",
  "authRecovery.oauthConsent.scope.readData.description":
    "Projects, keyword reports, and audit results.",
  "authRecovery.oauthConsent.scope.actOnBehalf.label":
    "Act on your behalf via MCP",
  "authRecovery.oauthConsent.scope.actOnBehalf.description":
    "Run tools and write results back to your workspace.",
  "authRecovery.oauthConsent.scope.offlineAccess.label":
    "Maintain access while you're away",
  "authRecovery.oauthConsent.scope.offlineAccess.description":
    "Keep working through refresh tokens, even after this session ends.",
  "authRecovery.oauthConsent.deny": "Cancel",
  "authRecovery.oauthConsent.approve": "Authorize",
  "authRecovery.oauthConsent.approving": "Authorizing…",
  "authRecovery.oauthConsent.revokeNotice":
    "You can revoke access at any time in Settings.",
  "authRecovery.oauthConsent.error.generic":
    "Unable to complete authorization.",
  "authRecovery.oauthConsent.error.missingRedirect":
    "Authorization response did not include a redirect URL.",
} as const;
