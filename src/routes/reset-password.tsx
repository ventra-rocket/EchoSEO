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
import {
  HOSTED_PASSWORD_MAX_LENGTH,
  HOSTED_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-options";
import { z } from "zod";

function buildResetPasswordSchema(intl: IntlShape) {
  return z
    .object({
      password: z
        .string()
        .min(
          HOSTED_PASSWORD_MIN_LENGTH,
          intl.formatMessage(
            { id: "authRecovery.resetPassword.passwordTooShort" },
            { min: HOSTED_PASSWORD_MIN_LENGTH },
          ),
        )
        .max(
          HOSTED_PASSWORD_MAX_LENGTH,
          intl.formatMessage(
            { id: "authRecovery.resetPassword.passwordTooLong" },
            { max: HOSTED_PASSWORD_MAX_LENGTH },
          ),
        ),
      confirmPassword: z.string(),
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: intl.formatMessage({
        id: "authRecovery.resetPassword.passwordMismatch",
      }),
      path: ["confirmPassword"],
    });
}

const resetPasswordSearchSchema = authRedirectSearchSchema.extend({
  error: z.string().optional(),
  token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});

function getResetPasswordErrorMessage(
  error: string | undefined,
  intl: IntlShape,
) {
  switch ((error ?? "").toLowerCase()) {
    case "invalid_token":
      return intl.formatMessage({
        id: "authRecovery.resetPassword.error.invalidToken",
      });
    case "token_expired":
      return intl.formatMessage({
        id: "authRecovery.resetPassword.error.tokenExpired",
      });
    default:
      return error
        ? intl.formatMessage({
            id: "authRecovery.resetPassword.error.unknown",
          })
        : null;
  }
}

function getResetPasswordPageCopy({
  isHostedMode,
  isComplete,
  routeError,
  hasToken,
  intl,
}: {
  isHostedMode: boolean;
  isComplete: boolean;
  routeError: string | null;
  hasToken: boolean;
  intl: IntlShape;
}) {
  if (!isHostedMode) {
    return {
      title: intl.formatMessage({ id: "authRecovery.resetPassword.title" }),
      helperText: intl.formatMessage({
        id: "authRecovery.passwordResetNotAvailable",
      }),
    };
  }

  if (isComplete) {
    return {
      title: intl.formatMessage({
        id: "authRecovery.resetPassword.complete.title",
      }),
      helperText: intl.formatMessage({
        id: "authRecovery.resetPassword.complete.helper",
      }),
    };
  }

  if (routeError || !hasToken) {
    return {
      title: intl.formatMessage({
        id: "authRecovery.resetPassword.expired.title",
      }),
      helperText:
        routeError ||
        intl.formatMessage({
          id: "authRecovery.resetPassword.error.invalidToken",
        }),
    };
  }

  return {
    title: intl.formatMessage({ id: "authRecovery.resetPassword.title" }),
    helperText: intl.formatMessage({
      id: "authRecovery.resetPassword.helper",
    }),
  };
}

function ResetPasswordPage() {
  const intl = useIntl();
  const search = Route.useSearch();
  const redirectTo = normalizeAuthRedirect(search.redirect);
  const isHostedMode = isHostedClientAuthMode();
  const routeError = getResetPasswordErrorMessage(search.error, intl);
  const token = typeof search.token === "string" ? search.token : null;
  const resetPasswordSchema = useMemo(
    () => buildResetPasswordSchema(intl),
    [intl],
  );
  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: resetPasswordSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      if (!token) {
        formApi.setErrorMap({
          onSubmit: {
            form: intl.formatMessage({
              id: "authRecovery.resetPassword.submitError",
            }),
            fields: {},
          },
        });
        return;
      }

      try {
        const result = await authClient.resetPassword({
          newPassword: value.password,
          token,
        });

        if (result.error) {
          formApi.setErrorMap({
            onSubmit: {
              form: intl.formatMessage({
                id: "authRecovery.resetPassword.submitError",
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
              id: "authRecovery.resetPassword.submitErrorRetry",
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
          isComplete: state.isSubmitSuccessful && !state.errorMap.onSubmit,
          submitError: state.errorMap.onSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ isComplete, submitError, isSubmitting }) => {
          const errorMessage = getFormError(submitError);
          const pageCopy = getResetPasswordPageCopy({
            isHostedMode,
            isComplete,
            routeError,
            hasToken: !!token,
            intl,
          });

          return (
            <AuthPageCard
              title={pageCopy.title}
              helperText={pageCopy.helperText}
              footer={
                <p className="text-sm">
                  <Link
                    to="/sign-in"
                    search={getSignInSearch(redirectTo)}
                    className="text-base-content/50 hover:text-base-content transition-colors"
                  >
                    {intl.formatMessage({ id: "authRecovery.signIn" })}
                  </Link>
                </p>
              }
            >
              {!isHostedMode ? null : isComplete ? (
                <a
                  href={
                    redirectTo === "/"
                      ? "/sign-in"
                      : `/sign-in?redirect=${encodeURIComponent(redirectTo)}`
                  }
                  className="btn btn-soft w-full"
                >
                  {intl.formatMessage({
                    id: "authRecovery.resetPassword.continueToSignIn",
                  })}
                </a>
              ) : routeError || !token ? (
                <Link
                  to="/forgot-password"
                  search={getSignInSearch(redirectTo)}
                  className="btn btn-soft w-full"
                >
                  {intl.formatMessage({
                    id: "authRecovery.resetPassword.requestNewLink",
                  })}
                </Link>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void form.handleSubmit();
                  }}
                >
                  <form.Field name="password">
                    {(field) => {
                      const error = getFieldError(field.state.meta.errors);

                      return (
                        <div>
                          <input
                            type="password"
                            className="input input-bordered w-full"
                            placeholder={intl.formatMessage({
                              id: "authRecovery.resetPassword.passwordPlaceholder",
                            })}
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            autoComplete="new-password"
                            minLength={HOSTED_PASSWORD_MIN_LENGTH}
                            maxLength={HOSTED_PASSWORD_MAX_LENGTH}
                            required
                          />
                          {error ? (
                            <p className="mt-1 text-sm text-error">{error}</p>
                          ) : null}
                        </div>
                      );
                    }}
                  </form.Field>

                  <form.Field name="confirmPassword">
                    {(field) => {
                      const error = getFieldError(field.state.meta.errors);

                      return (
                        <div>
                          <input
                            type="password"
                            className="input input-bordered w-full"
                            placeholder={intl.formatMessage({
                              id: "authRecovery.resetPassword.confirmPasswordPlaceholder",
                            })}
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            autoComplete="new-password"
                            minLength={HOSTED_PASSWORD_MIN_LENGTH}
                            maxLength={HOSTED_PASSWORD_MAX_LENGTH}
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
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? intl.formatMessage({
                          id: "authRecovery.resetPassword.submitting",
                        })
                      : intl.formatMessage({
                          id: "authRecovery.resetPassword.submit",
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
