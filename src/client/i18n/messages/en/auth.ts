// Sign-in and sign-up routes, including provider buttons, validation and interstitials.
export const auth = {
  // Shared across both forms: identical copy today, so one id serves both
  // routes instead of two spellings of the same fact.
  "auth.continueWithGoogle": "Continue with Google",
  "auth.continueWithEmail": "Continue with email",
  "auth.createAccount": "Create account",
  "auth.field.emailPlaceholder": "Email address...",
  "auth.field.passwordPlaceholder": "Password...",
  "auth.validation.email": "Enter a valid email address.",

  "auth.signIn.title": "Sign in",
  "auth.signIn.forgotPassword": "Forgot password?",
  "auth.signIn.submitPending": "Signing in...",
  "auth.signIn.validation.passwordRequired": "Enter your password.",
  // better-auth's client error is untranslated server prose (and came back
  // with no message at all for a wrong-credentials attempt against the local
  // dev auth API), so every response failure resolves to one of these fixed
  // sentences instead of `result.error.message` — see _auth.sign-in.tsx.
  "auth.signIn.error.default": "We couldn't sign you in.",
  "auth.signIn.error.network": "Unable to sign in right now. Please try again.",
  "auth.signIn.error.googleUnavailable":
    "Google sign in is not available right now.",

  "auth.signUp.title": "Create your account",
  "auth.signUp.backToChooser": "Back to signup",
  "auth.signUp.submitPending": "Creating account...",
  "auth.signUp.field.namePlaceholder": "Name (optional)...",
  "auth.signUp.field.confirmPasswordPlaceholder": "Confirm password...",
  "auth.signUp.validation.passwordTooShort":
    "Password must be at least {min, number} characters.",
  "auth.signUp.validation.passwordTooLong":
    "Password must be at most {max, number} characters.",
  "auth.signUp.validation.passwordMismatch": "Passwords do not match.",
  "auth.signUp.error.default": "Unable to create account.",
  "auth.signUp.error.network":
    "Unable to create account right now. Please try again.",
  "auth.signUp.error.googleUnavailable":
    "Google sign up is not available right now.",
  // Rich text: <terms>/<privacy>/<signIn> wrap the embedded links so word
  // order can move per language instead of gluing translated fragments around
  // a fixed link, the way the JSX used to concatenate them.
  "auth.signUp.legal.agreement":
    "By signing up, you agree to our <terms>Terms</terms> and <privacy>Privacy Policy</privacy>.",
  "auth.signUp.alreadyHaveAccount":
    "Already have an account? <signIn>Sign in</signIn>",
} as const;
