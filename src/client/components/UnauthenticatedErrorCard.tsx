import { useEffect } from "react";
import { useIntl } from "react-intl";
import { getSignInHref, getSignInHrefForLocation } from "@/lib/auth-redirect";
import { isHostedClientAuthMode } from "@/lib/auth-mode";

type UnauthenticatedErrorCardProps = {
  message: string;
  onRetry?: () => void;
};

export function UnauthenticatedErrorCard({
  message,
  onRetry,
}: UnauthenticatedErrorCardProps) {
  const intl = useIntl();
  const isHostedMode = isHostedClientAuthMode();
  const signInHref =
    typeof window === "undefined"
      ? getSignInHref("/")
      : getSignInHrefForLocation(window.location);

  useEffect(() => {
    if (typeof window === "undefined" || !isHostedMode) {
      return;
    }

    window.location.replace(signInHref);
  }, [isHostedMode, signInHref]);

  if (isHostedMode) {
    return null;
  }

  return (
    <div className="card w-full max-w-md bg-base-100 border border-base-300 shadow-xl">
      <div className="card-body gap-4">
        <h2 className="card-title">
          {intl.formatMessage({ id: "common.auth.required.title" })}
        </h2>
        <p className="text-sm text-base-content/70">{message}</p>
        <p className="text-sm text-base-content/70">
          {intl.formatMessage({
            id: "common.auth.required.externalInstructions",
          })}
        </p>
        {onRetry ? (
          <div className="card-actions justify-end">
            <button className="btn btn-primary btn-sm" onClick={onRetry}>
              {intl.formatMessage({ id: "common.action.retry" })}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
