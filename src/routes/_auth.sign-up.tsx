import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  AuthPageCard,
  AuthTextField,
  AuthMethodChooser,
  authRedirectSearchSchema,
  useAuthPageState,
} from "@/client/features/auth/AuthPage";
import { getFieldError, getFormError } from "@/client/lib/forms";
import { captureClientEvent } from "@/client/lib/posthog";
import { authClient } from "@/lib/auth-client";
import { getSignInSearch, getVerifyEmailSearch } from "@/lib/auth-redirect";
import { LEGAL_PRIVACY_PATH, LEGAL_TERMS_PATH } from "@/shared/legal";
import {
  HOSTED_PASSWORD_MAX_LENGTH,
  HOSTED_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-options";
import { z } from "zod";

// Zod messages below are message ids, not prose: the schema lives at module
// scope (no `useIntl()` here), so each field's error carries its id through
// `field.state.meta.errors` and is only formatted into text at the render
// site, where the active intl is available.
const signUpSchema = z
  .object({
    name: z.string().trim(),
    email: z.string().trim().email("auth.validation.email"),
    password: z
      .string()
      .min(
        HOSTED_PASSWORD_MIN_LENGTH,
        "auth.signUp.validation.passwordTooShort",
      )
      .max(
        HOSTED_PASSWORD_MAX_LENGTH,
        "auth.signUp.validation.passwordTooLong",
      ),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "auth.signUp.validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export const Route = createFileRoute("/_auth/sign-up")({
  validateSearch: authRedirectSearchSchema,
  component: SignUpPage,
});

function SignUpPage() {
  const intl = useIntl();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { redirectTo, isHostedMode, isGoogleAuthEnabled } = useAuthPageState(
    search.redirect,
  );
  const postSignupRedirect = redirectTo === "/" ? "/onboarding" : redirectTo;
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isStartingGoogle, setIsStartingGoogle] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      try {
        const email = value.email.trim();
        captureClientEvent("auth:sign_up_submit", {
          redirect_to: redirectTo,
        });
        // A real account field, not UI prose: an EchoSEO user who leaves the
        // name blank still gets a stored display name, so this default is
        // never translated.
        const resolvedName =
          value.name.trim() || email.split("@")[0] || "EchoSEO User";
        const verificationCallbackURL = new URL(
          "/verify-email",
          window.location.origin,
        );
        const verificationSearch = getVerifyEmailSearch(
          undefined,
          postSignupRedirect,
        );
        if (verificationSearch.redirect) {
          verificationCallbackURL.searchParams.set(
            "redirect",
            verificationSearch.redirect,
          );
        }
        const result = await authClient.signUp.email({
          name: resolvedName,
          email,
          password: value.password,
          callbackURL: verificationCallbackURL.toString(),
        });

        // better-auth's client error is `{status, message?}` from
        // better-fetch, never one of our own AppError codes, so
        // getLocalizedErrorMessage's code lookup never matches it — and
        // `message` is untranslated server prose that came back empty for
        // every failure observed against the local dev auth API. Every
        // response error therefore resolves to one fixed, localized sentence
        // instead of surfacing `result.error.message` verbatim; 429 is the
        // one status worth naming, reusing the shared rate-limit copy rather
        // than re-spelling it.
        if (result.error) {
          const messageId =
            result.error.status === 429
              ? "common.error.code.rateLimited"
              : "auth.signUp.error.default";
          formApi.setErrorMap({
            onSubmit: {
              form: intl.formatMessage({ id: messageId }),
              fields: {},
            },
          });
          return;
        }

        captureClientEvent("auth:sign_up_success", {
          redirect_to: redirectTo,
        });
        void navigate({
          to: "/verify-email",
          search: getVerifyEmailSearch(email, postSignupRedirect),
          replace: true,
        });
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: intl.formatMessage({ id: "auth.signUp.error.network" }),
            fields: {},
          },
        });
      }
    },
  });

  async function handleContinueWithGoogle() {
    setSocialError(null);
    setIsStartingGoogle(true);

    try {
      captureClientEvent("auth:sign_up_google_start", {
        redirect_to: redirectTo,
      });
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTo,
        newUserCallbackURL: postSignupRedirect,
        requestSignUp: true,
      });

      if (result.error) {
        const messageId =
          result.error.status === 429
            ? "common.error.code.rateLimited"
            : "auth.signUp.error.googleUnavailable";
        setSocialError(intl.formatMessage({ id: messageId }));
        setIsStartingGoogle(false);
      }
    } catch {
      setSocialError(
        intl.formatMessage({ id: "auth.signUp.error.googleUnavailable" }),
      );
      setIsStartingGoogle(false);
    }
  }

  return (
    <AuthPageCard
      title={intl.formatMessage({ id: "auth.signUp.title" })}
      footer={
        isHostedMode ? (
          showEmailForm ? (
            <button
              type="button"
              className="text-sm text-base-content underline underline-offset-2 hover:text-base-content/80 transition-colors"
              onClick={() => {
                setShowEmailForm(false);
                setSocialError(null);
              }}
            >
              {intl.formatMessage({ id: "auth.signUp.backToChooser" })}
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-base-content/60">
                {/* Relative, never absolute: each deployment must link to the
                    documents that actually govern it. An absolute URL here
                    points a self-hoster's users at someone else's terms. */}
                <FormattedMessage
                  id="auth.signUp.legal.agreement"
                  values={{
                    terms: (chunks) => (
                      <a
                        href={LEGAL_TERMS_PATH}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base-content underline underline-offset-2 hover:text-base-content/80 transition-colors"
                      >
                        {chunks}
                      </a>
                    ),
                    privacy: (chunks) => (
                      <a
                        href={LEGAL_PRIVACY_PATH}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base-content underline underline-offset-2 hover:text-base-content/80 transition-colors"
                      >
                        {chunks}
                      </a>
                    ),
                  }}
                />
              </p>

              <p className="text-sm text-base-content/50">
                <FormattedMessage
                  id="auth.signUp.alreadyHaveAccount"
                  values={{
                    signIn: (chunks) => (
                      <Link
                        to="/sign-in"
                        search={getSignInSearch(redirectTo)}
                        className="text-base-content underline underline-offset-2 hover:text-base-content/80 transition-colors"
                      >
                        {chunks}
                      </Link>
                    ),
                  }}
                />
              </p>
            </div>
          )
        ) : null
      }
    >
      {!showEmailForm ? (
        <>
          <AuthMethodChooser
            googleLabel={intl.formatMessage({ id: "auth.continueWithGoogle" })}
            emailLabel={intl.formatMessage({ id: "auth.continueWithEmail" })}
            showGoogle={isGoogleAuthEnabled}
            disabled={!isHostedMode}
            isBusy={isStartingGoogle}
            onContinueWithGoogle={() => {
              void handleContinueWithGoogle();
            }}
            onContinueWithEmail={() => {
              setShowEmailForm(true);
              setSocialError(null);
            }}
          />
          {socialError ? (
            <p className="text-sm text-error">{socialError}</p>
          ) : null}
        </>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="name">
            {(field) => (
              <AuthTextField
                type="text"
                placeholderId="auth.signUp.field.namePlaceholder"
                value={field.state.value}
                onChange={field.handleChange}
                autoComplete="name"
                disabled={!isHostedMode}
                errorId={getFieldError(field.state.meta.errors)}
              />
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <AuthTextField
                type="email"
                placeholderId="auth.field.emailPlaceholder"
                value={field.state.value}
                onChange={field.handleChange}
                autoComplete="email"
                disabled={!isHostedMode}
                required
                errorId={getFieldError(field.state.meta.errors)}
              />
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <AuthTextField
                type="password"
                placeholderId="auth.field.passwordPlaceholder"
                value={field.state.value}
                onChange={field.handleChange}
                autoComplete="new-password"
                disabled={!isHostedMode}
                required
                minLength={HOSTED_PASSWORD_MIN_LENGTH}
                maxLength={HOSTED_PASSWORD_MAX_LENGTH}
                errorId={getFieldError(field.state.meta.errors)}
                errorValues={{
                  min: HOSTED_PASSWORD_MIN_LENGTH,
                  max: HOSTED_PASSWORD_MAX_LENGTH,
                }}
              />
            )}
          </form.Field>

          <form.Field name="confirmPassword">
            {(field) => (
              <AuthTextField
                type="password"
                placeholderId="auth.signUp.field.confirmPasswordPlaceholder"
                value={field.state.value}
                onChange={field.handleChange}
                autoComplete="new-password"
                disabled={!isHostedMode}
                required
                minLength={HOSTED_PASSWORD_MIN_LENGTH}
                maxLength={HOSTED_PASSWORD_MAX_LENGTH}
                errorId={getFieldError(field.state.meta.errors)}
              />
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => ({
              submitError: state.errorMap.onSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ submitError, isSubmitting }) => {
              const errorMessage = getFormError(submitError);
              return (
                <>
                  {errorMessage ? (
                    <p className="text-sm text-error">{errorMessage}</p>
                  ) : null}
                  <button
                    className="btn btn-soft w-full"
                    disabled={!isHostedMode || isSubmitting}
                  >
                    {isSubmitting
                      ? intl.formatMessage({ id: "auth.signUp.submitPending" })
                      : intl.formatMessage({ id: "auth.createAccount" })}
                  </button>
                </>
              );
            }}
          </form.Subscribe>
        </form>
      )}
    </AuthPageCard>
  );
}
