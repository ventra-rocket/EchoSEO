import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useIntl } from "react-intl";
import type { IntlShape } from "react-intl";
import {
  AuthPageCard,
  AuthPageShell,
  authRedirectSearchSchema,
} from "@/client/features/auth/AuthPage";
import { getFieldError, getFormError } from "@/client/lib/forms";
import { authClient } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getSignInSearch, normalizeAuthRedirect } from "@/lib/auth-redirect";
import { z } from "zod";

function buildForgotPasswordSchema(intl: IntlShape) {
  return z.object({
    email: z
      .string()
      .trim()
      .email(
        intl.formatMessage({ id: "authRecovery.forgotPassword.emailInvalid" }),
      ),
  });
}

export const Route = createFileRoute("/forgot-password")({
  validateSearch: authRedirectSearchSchema,
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const intl = useIntl();
  const search = Route.useSearch();
  const redirectTo = normalizeAuthRedirect(search.redirect);
  const isHostedMode = isHostedClientAuthMode();
  const forgotPasswordSchema = useMemo(
    () => buildForgotPasswordSchema(intl),
    [intl],
  );

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: forgotPasswordSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      try {
        const redirectUrl = new URL("/reset-password", window.location.origin);
        if (redirectTo !== "/")
          redirectUrl.searchParams.set("redirect", redirectTo);
        const result = await authClient.requestPasswordReset({
          email: value.email.trim(),
          redirectTo: redirectUrl.toString(),
        });

        if (result.error) {
          formApi.setErrorMap({
            onSubmit: {
              form:
                result.error.message ||
                intl.formatMessage({
                  id: "authRecovery.forgotPassword.submitError",
                }),
              fields: {},
            },
          });
          return;
        }
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: intl.formatMessage({
              id: "authRecovery.forgotPassword.submitErrorRetry",
            }),
            fields: {},
          },
        });
      }
    },
  });

  return (
    <AuthPageShell>
      <form.Subscribe
        selector={(state) => ({
          isSuccess: state.isSubmitSuccessful && !state.errorMap.onSubmit,
          submittedEmail: state.values.email,
          submitError: state.errorMap.onSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ isSuccess, submittedEmail, submitError, isSubmitting }) => {
          const errorMessage = getFormError(submitError);

          return (
            <AuthPageCard
              title={intl.formatMessage({
                id: isSuccess
                  ? "authRecovery.forgotPassword.success.title"
                  : "authRecovery.forgotPassword.title",
              })}
              helperText={
                isSuccess
                  ? intl.formatMessage(
                      { id: "authRecovery.forgotPassword.success.helper" },
                      { email: submittedEmail },
                    )
                  : isHostedMode
                    ? intl.formatMessage({
                        id: "authRecovery.forgotPassword.helper",
                      })
                    : intl.formatMessage({
                        id: "authRecovery.passwordResetNotAvailable",
                      })
              }
              footer={
                <p className="text-sm">
                  <Link
                    to="/sign-in"
                    search={getSignInSearch(redirectTo)}
                    className="text-base-content/50 hover:text-base-content transition-colors"
                  >
                    {intl.formatMessage({ id: "authRecovery.backToSignIn" })}
                  </Link>
                </p>
              }
            >
              {isSuccess ? (
                <div className="alert alert-success">
                  <span>
                    {intl.formatMessage({
                      id: "authRecovery.forgotPassword.successAlert",
                    })}
                  </span>
                </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void form.handleSubmit();
                  }}
                >
                  <form.Field name="email">
                    {(field) => {
                      const error = getFieldError(field.state.meta.errors);

                      return (
                        <div>
                          <input
                            type="email"
                            className="input input-bordered w-full"
                            placeholder={intl.formatMessage({
                              id: "authRecovery.forgotPassword.emailPlaceholder",
                            })}
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            autoComplete="email"
                            disabled={!isHostedMode}
                            required
                          />
                          {error ? (
                            <p className="mt-1 text-sm text-error">{error}</p>
                          ) : null}
                        </div>
                      );
                    }}
                  </form.Field>

                  {errorMessage ? (
                    <p className="text-sm text-error">{errorMessage}</p>
                  ) : null}
                  <button
                    className="btn btn-soft w-full"
                    disabled={!isHostedMode || isSubmitting}
                  >
                    {isSubmitting
                      ? intl.formatMessage({
                          id: "authRecovery.forgotPassword.submitting",
                        })
                      : intl.formatMessage({
                          id: "authRecovery.forgotPassword.submit",
                        })}
                  </button>
                </form>
              )}
            </AuthPageCard>
          );
        }}
      </form.Subscribe>
    </AuthPageShell>
  );
}
