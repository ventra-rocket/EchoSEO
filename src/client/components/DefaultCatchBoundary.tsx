import { Link, rootRouteId, useMatch, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import * as React from "react";
import { useIntl } from "react-intl";
import { shouldCaptureAppErrorCode } from "@/shared/error-codes";
import {
  getErrorCode,
  getLocalizedErrorMessage,
} from "@/client/lib/error-messages";
import { AuthConfigErrorCard } from "@/client/components/AuthConfigErrorCard";
import { captureClientError } from "@/client/lib/posthog";
import { UnauthenticatedErrorCard } from "@/client/components/UnauthenticatedErrorCard";
import { I18nProvider } from "@/client/i18n/I18nProvider";
import { getRouteOwnedLocale } from "@/client/i18n/config";

export function DefaultCatchBoundary(props: ErrorComponentProps) {
  // Root-route and public-route errors replace the subtree that normally owns
  // I18nProvider. Keep the boundary self-sufficient so translating its copy
  // cannot turn an original routing error into a missing-intl-context crash.
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const routeLocale = getRouteOwnedLocale(pathname);

  return (
    <I18nProvider locale={routeLocale}>
      <DefaultCatchBoundaryContent {...props} />
    </I18nProvider>
  );
}

function DefaultCatchBoundaryContent({ error }: ErrorComponentProps) {
  const intl = useIntl();
  const router = useRouter();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });
  const pathname = router.state.location.pathname;

  const message = getLocalizedErrorMessage(
    intl,
    error,
    intl.formatMessage({ id: "common.error.default" }),
  );
  const errorCode = getErrorCode(error);

  React.useEffect(() => {
    if (!shouldCaptureAppErrorCode(errorCode)) {
      return;
    }

    captureClientError(error, {
      errorCode,
      path: pathname,
    });
  }, [error, errorCode, pathname]);

  const showAuthConfigHelp = errorCode === "AUTH_CONFIG_MISSING";
  const showSignInHelp = errorCode === "UNAUTHENTICATED";

  if (showAuthConfigHelp) {
    return (
      <div className="min-w-0 flex-1 p-4 flex items-center justify-center">
        <AuthConfigErrorCard
          message={message}
          onRetry={() => {
            void router.invalidate();
          }}
        />
      </div>
    );
  }

  if (showSignInHelp) {
    return (
      <div className="min-w-0 flex-1 p-4 flex items-center justify-center">
        <UnauthenticatedErrorCard
          message={message}
          onRetry={() => {
            void router.invalidate();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
      <p className="text-center text-error">{message}</p>
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={() => {
            void router.invalidate();
          }}
          className="btn btn-neutral btn-sm uppercase"
        >
          {intl.formatMessage({ id: "common.action.retry" })}
        </button>
        {isRoot ? (
          <Link to="/" className="btn btn-neutral btn-sm uppercase">
            {intl.formatMessage({ id: "common.action.home" })}
          </Link>
        ) : (
          <Link
            to="/"
            className="btn btn-neutral btn-sm uppercase"
            onClick={(e) => {
              e.preventDefault();
              window.history.back();
            }}
          >
            {intl.formatMessage({ id: "common.action.back" })}
          </Link>
        )}
      </div>
    </div>
  );
}
