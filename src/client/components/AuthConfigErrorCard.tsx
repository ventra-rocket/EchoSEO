import { ShieldAlert } from "lucide-react";
import { FormattedMessage } from "react-intl";

const README_CLOUDFLARE_ACCESS_URL =
  "https://github.com/ventra-rocket/EchoSEO/blob/main/docs/SELF_HOSTING_CLOUDFLARE.md";

type AuthConfigErrorCardProps = {
  message: string;
  onRetry?: () => void;
};

export function AuthConfigErrorCard({
  message,
  onRetry,
}: AuthConfigErrorCardProps) {
  return (
    <div className="card w-full max-w-2xl bg-base-100 border border-base-300 shadow-xl">
      <div className="card-body gap-4">
        <h2 className="card-title gap-2">
          <ShieldAlert className="size-5 text-error" />
          <FormattedMessage id="common.auth.config.title" />
        </h2>

        <div className="alert alert-error">
          <span>{message}</span>
        </div>

        <p className="text-sm text-base-content/70">
          <FormattedMessage
            id="common.auth.config.instructions"
            values={{
              authMode: <code className="mx-1">AUTH_MODE</code>,
              teamDomain: <code className="mx-1">TEAM_DOMAIN</code>,
              policyAud: <code className="mx-1">POLICY_AUD</code>,
              betterAuthSecret: (
                <code className="mx-1">BETTER_AUTH_SECRET</code>
              ),
              betterAuthUrl: <code className="ml-1">BETTER_AUTH_URL</code>,
            }}
          />
        </p>

        <div className="card-actions justify-end">
          {onRetry ? (
            <button className="btn btn-ghost btn-sm" onClick={onRetry}>
              <FormattedMessage id="common.action.retry" />
            </button>
          ) : null}
          <a
            className="btn btn-primary btn-sm"
            href={README_CLOUDFLARE_ACCESS_URL}
            target="_blank"
            rel="noreferrer"
          >
            <FormattedMessage id="common.action.openSetupGuide" />
          </a>
        </div>
      </div>
    </div>
  );
}
