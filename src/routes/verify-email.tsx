import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import type { IntlShape } from "react-intl";
import { toast } from "sonner";
import {
  AuthPageCard,
  AuthPageShell,
  authRedirectSearchSchema,
} from "@/client/features/auth/AuthPage";
import { captureClientEvent } from "@/client/lib/posthog";
import { authClient, useSession } from "@/lib/auth-client";
import {
  isEmailVerificationBypassed,
  isHostedClientAuthMode,
} from "@/lib/auth-mode";
import { getSignInSearch, normalizeAuthRedirect } from "@/lib/auth-redirect";
import { z } from "zod";

const verificationIssueSchema = z
  .enum(["invalid_token", "token_expired", "user_not_found", "unknown"])
  .catch("unknown");

const verifyEmailSearchSchema = authRedirectSearchSchema.extend({
  error: z.string().optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/verify-email")({
  validateSearch: verifyEmailSearchSchema,
  component: VerifyEmailPage,
});

function getVerificationErrorMessage(
  error: string | undefined,
  intl: IntlShape,
) {
  switch ((error ?? "").toLowerCase()) {
    case "invalid_token":
      return intl.formatMessage({
        id: "authRecovery.verifyEmail.error.invalidToken",
      });
    case "token_expired":
      return intl.formatMessage({
        id: "authRecovery.verifyEmail.error.tokenExpired",
      });
    case "user_not_found":
      return intl.formatMessage({
        id: "authRecovery.verifyEmail.error.userNotFound",
      });
    default:
      return error
        ? intl.formatMessage({ id: "authRecovery.verifyEmail.error.unknown" })
        : null;
  }
}

function getVerifyEmailPageCopy({
  isHostedMode,
  errorMessage,
  isPending,
  isRedirecting,
  email,
  intl,
}: {
  isHostedMode: boolean;
  errorMessage: string | null;
  isPending: boolean;
  isRedirecting: boolean;
  email: string | undefined;
  intl: IntlShape;
}) {
  if (!isHostedMode) {
    return {
      title: intl.formatMessage({ id: "authRecovery.verifyEmail.title" }),
      helperText: intl.formatMessage({
        id: "authRecovery.verifyEmail.notAvailable",
      }),
    };
  }

  if (errorMessage) {
    return {
      title: intl.formatMessage({
        id: "authRecovery.verifyEmail.error.title",
      }),
      helperText: errorMessage,
    };
  }

  if (isRedirecting) {
    return {
      title: intl.formatMessage({
        id: "authRecovery.verifyEmail.confirmed.title",
      }),
      helperText: intl.formatMessage({
        id: "authRecovery.verifyEmail.confirmed.helper",
      }),
    };
  }

  if (isPending) {
    return {
      title: intl.formatMessage({ id: "authRecovery.verifyEmail.title" }),
      helperText: intl.formatMessage({
        id: "authRecovery.verifyEmail.checking",
      }),
    };
  }

  // Default: the user just signed up (or reloaded this page) and still needs to
  // click the verification link. There is never a sign-in CTA here — an
  // unverified hosted user would be bounced straight back by the verification
  // gate.
  return {
    title: intl.formatMessage({
      id: "authRecovery.verifyEmail.pending.title",
    }),
    helperText: email
      ? intl.formatMessage(
          { id: "authRecovery.verifyEmail.pending.helperWithEmail" },
          { email },
        )
      : intl.formatMessage({
          id: "authRecovery.verifyEmail.pending.helperNoEmail",
        }),
  };
}

function VerifyEmailPage() {
  const intl = useIntl();
  const search = Route.useSearch();
  const redirectTo = normalizeAuthRedirect(search.redirect);
  const isHostedMode = isHostedClientAuthMode();
  const { data: session, isPending } = useSession();
  const bypassEmailVerification = isEmailVerificationBypassed();
  const errorMessage = getVerificationErrorMessage(search.error, intl);
  const verificationIssueType = search.error
    ? verificationIssueSchema.parse(search.error)
    : null;
  const email = search.email ?? session?.user?.email;
  const isVerified = !!session?.user?.emailVerified;
  const [isResending, setIsResending] = useState(false);
  // Verified (or bypass) users are sent on to the app by the effect below; until
  // that lands we show the redirecting state instead of the resend prompt.
  const isRedirecting =
    isVerified || (bypassEmailVerification && Boolean(session?.user?.id));
  const pageCopy = getVerifyEmailPageCopy({
    isHostedMode,
    errorMessage,
    isPending,
    isRedirecting,
    email,
    intl,
  });

  useEffect(() => {
    if (
      isPending ||
      (!isVerified && !(bypassEmailVerification && session?.user?.id))
    ) {
      return;
    }

    if (isVerified) {
      captureClientEvent("auth:verification_success", {
        redirect_to: redirectTo,
      });
    }

    // Full page reload instead of client-side navigation: the auth→app
    // transition needs a clean server-side load so that all server function
    // handlers are freshly registered (client-side nav during Vite HMR can
    // hit the server before updated handlers are ready, causing
    // "action is not a function" errors).
    window.location.replace(redirectTo);
  }, [
    bypassEmailVerification,
    isPending,
    isVerified,
    redirectTo,
    session?.user?.id,
  ]);

  useEffect(() => {
    if (!verificationIssueType) {
      return;
    }

    captureClientEvent("auth:verification_issue", {
      issue_type: verificationIssueType,
    });
  }, [verificationIssueType]);

  async function handleResend() {
    if (!email) return;
    setIsResending(true);
    try {
      const callbackURL = new URL("/verify-email", window.location.origin);
      if (redirectTo !== "/")
        callbackURL.searchParams.set("redirect", redirectTo);
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: callbackURL.toString(),
      });
      if (result.error) {
        toast.error(
          result.error.message ||
            intl.formatMessage({
              id: "authRecovery.verifyEmail.resendErrorFallback",
            }),
        );
        return;
      }
      captureClientEvent("auth:verification_resend");
      toast.success(
        intl.formatMessage({ id: "authRecovery.verifyEmail.resendSuccess" }),
      );
    } catch {
      toast.error(
        intl.formatMessage({
          id: "authRecovery.verifyEmail.resendErrorRetry",
        }),
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthPageShell>
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
              {intl.formatMessage({ id: "authRecovery.backToSignIn" })}
            </Link>
          </p>
        }
      >
        {!isHostedMode ? null : errorMessage ? (
          <div className="space-y-3">
            <div className="alert alert-error">
              <span>{errorMessage}</span>
            </div>
            <Link
              to="/sign-in"
              search={getSignInSearch(redirectTo)}
              className="btn btn-soft w-full"
            >
              {intl.formatMessage({ id: "authRecovery.backToSignIn" })}
            </Link>
          </div>
        ) : isPending || isRedirecting ? (
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-md" />
          </div>
        ) : email ? (
          <button
            type="button"
            className="btn btn-soft w-full"
            onClick={() => void handleResend()}
            disabled={isResending}
          >
            {isResending
              ? intl.formatMessage({
                  id: "authRecovery.verifyEmail.resending",
                })
              : intl.formatMessage({ id: "authRecovery.verifyEmail.resend" })}
          </button>
        ) : null}
      </AuthPageCard>
    </AuthPageShell>
  );
}
