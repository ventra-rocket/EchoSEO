import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useIntl } from "react-intl";
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
import { z } from "zod";

// Zod messages below are message ids, not prose: the schema lives at module
// scope (no `useIntl()` here), so each field's error carries its id through
// `field.state.meta.errors` and is only formatted into text at the render
// site, where the active intl is available.
const signInSchema = z.object({
  email: z.string().trim().email("auth.validation.email"),
  password: z.string().min(1, "auth.signIn.validation.passwordRequired"),
});

export const Route = createFileRoute("/_auth/sign-in")({
  validateSearch: authRedirectSearchSchema,
  component: SignInPage,
});

function SignInPage() {
  const intl = useIntl();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { redirectTo, oauthQuery, isHostedMode, isGoogleAuthEnabled } =
    useAuthPageState(search.redirect);
  const authCallbackURL = redirectTo;
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isStartingGoogle, setIsStartingGoogle] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      try {
        const email = value.email.trim();
        captureClientEvent("auth:sign_in_submit", {
          redirect_to: redirectTo,
        });

        const result = await authClient.signIn.email({
          email,
          password: value.password,
          callbackURL: authCallbackURL,
          ...(oauthQuery ? { oauth_query: oauthQuery } : {}),
        });

        if (!result.error) {
          captureClientEvent("auth:sign_in_success", {
            redirect_to: redirectTo,
          });
          return;
        }

        if (result.error.status === 403) {
          captureClientEvent("auth:sign_in_block_unverified", {
            redirect_to: redirectTo,
          });
          // Email not verified yet: send them to the verification page (which
          // shows "check your inbox" + resend) instead of leaving them on a
          // sign-in form that will keep rejecting them.
          void navigate({
            to: "/verify-email",
            search: getVerifyEmailSearch(email, redirectTo),
          });
          return;
        }

        // better-auth's client error is `{status, message?}` from
        // better-fetch, never one of our own AppError codes, so
        // getLocalizedErrorMessage's code lookup never matches it — and
        // `message` is untranslated server prose that came back empty for a
        // wrong-credentials attempt against the local dev auth API. Every
        // response error therefore resolves to one fixed, localized sentence
        // instead of surfacing `result.error.message` verbatim; 429 is the
        // one status worth naming, reusing the shared rate-limit copy rather
        // than re-spelling it.
        const messageId =
          result.error.status === 429
            ? "common.error.code.rateLimited"
            : "auth.signIn.error.default";
        formApi.setErrorMap({
          onSubmit: {
            form: intl.formatMessage({ id: messageId }),
            fields: {},
          },
        });
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: intl.formatMessage({ id: "auth.signIn.error.network" }),
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
      captureClientEvent("auth:sign_in_google_start", {
        redirect_to: redirectTo,
      });
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: authCallbackURL,
      });

      if (result.error) {
        const messageId =
          result.error.status === 429
            ? "common.error.code.rateLimited"
            : "auth.signIn.error.googleUnavailable";
        setSocialError(intl.formatMessage({ id: messageId }));
        setIsStartingGoogle(false);
      }
    } catch {
      setSocialError(
        intl.formatMessage({ id: "auth.signIn.error.googleUnavailable" }),
      );
      setIsStartingGoogle(false);
    }
  }

  return (
    <AuthPageCard
      title={intl.formatMessage({ id: "auth.signIn.title" })}
      footer={
        isHostedMode ? (
          <div
            className={
              showEmailForm
                ? "flex justify-between text-sm text-base-content/50"
                : "text-sm text-base-content/50"
            }
          >
            {showEmailForm ? (
              <Link
                to="/forgot-password"
                search={getSignInSearch(redirectTo)}
                className="text-base-content underline underline-offset-2 hover:text-base-content/80 transition-colors"
              >
                {intl.formatMessage({ id: "auth.signIn.forgotPassword" })}
              </Link>
            ) : null}
            <Link
              to="/sign-up"
              search={getSignInSearch(redirectTo)}
              className="text-base-content underline underline-offset-2 hover:text-base-content/80 transition-colors"
            >
              {intl.formatMessage({ id: "auth.createAccount" })}
            </Link>
          </div>
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
                autoComplete="current-password"
                disabled={!isHostedMode}
                required
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
                      ? intl.formatMessage({ id: "auth.signIn.submitPending" })
                      : intl.formatMessage({ id: "auth.signIn.title" })}
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
