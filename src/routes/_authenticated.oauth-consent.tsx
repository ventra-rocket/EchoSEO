import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Database,
  KeyRound,
  type LucideIcon,
  RefreshCw,
  User,
} from "lucide-react";
import { useState } from "react";
import { useIntl } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";
import { useSession } from "@/lib/auth-client";
import { EchoSeoLogo } from "@/client/components/EchoSeoLogo";
import { MCP_OAUTH_SCOPES } from "@/lib/oauth-resource";

export const Route = createFileRoute("/_authenticated/oauth-consent")({
  component: OAuthConsentPage,
});

type ConsentScope = {
  icon: LucideIcon;
  labelId: MessageId;
  descriptionId: MessageId;
};

const BASE_SCOPES = [
  {
    icon: Database,
    labelId: "authRecovery.oauthConsent.scope.readData.label",
    descriptionId: "authRecovery.oauthConsent.scope.readData.description",
  },
  {
    icon: KeyRound,
    labelId: "authRecovery.oauthConsent.scope.actOnBehalf.label",
    descriptionId: "authRecovery.oauthConsent.scope.actOnBehalf.description",
  },
] as const satisfies readonly ConsentScope[];

// `offline_access` is optional per authorization request — only clients that
// want a refresh token ask for it — so it renders as an extra bullet instead
// of always-on copy like the two scopes above.
const OFFLINE_ACCESS_SCOPE = {
  icon: RefreshCw,
  labelId: "authRecovery.oauthConsent.scope.offlineAccess.label",
  descriptionId: "authRecovery.oauthConsent.scope.offlineAccess.description",
} as const satisfies ConsentScope;

// This screen deliberately does NOT name the requesting application. The only
// requester identity reaching the client is the `client_id` query param, which
// is unvalidated at render time, so a crafted link could make a consent screen
// assert any identity it liked. `scope` is different: it is mirrored against
// MCP_OAUTH_SCOPES below, so a lie there can only under-claim what is granted,
// never over-claim. Naming the requester needs a server-validated client name
// forwarded from oauth-provider.ts.

// An absent `scope` param means the server grants every MCP scope (see
// getGrantedMcpScopes in oauth-provider.ts) — mirrored here so the consent
// list matches what will actually be granted.
function getConsentRequestedScopes(): string[] {
  if (typeof window === "undefined") return [...MCP_OAUTH_SCOPES];
  const raw = new URLSearchParams(window.location.search).get("scope");
  const requested = raw ? raw.split(" ").filter(Boolean) : [];
  return requested.length > 0 ? requested : [...MCP_OAUTH_SCOPES];
}

function OAuthConsentPage() {
  const intl = useIntl();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userEmail = session?.user?.email ?? null;
  const scopes = getConsentRequestedScopes().includes("offline_access")
    ? [...BASE_SCOPES, OFFLINE_ACCESS_SCOPE]
    : BASE_SCOPES;

  async function respond(accept: boolean) {
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/oauth/consent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accept,
        query: window.location.search,
      }),
    });
    const data: {
      redirectTo?: string;
      error?: string;
    } = await response.json();

    if (!response.ok) {
      setError(
        data.error ??
          intl.formatMessage({
            id: "authRecovery.oauthConsent.error.generic",
          }),
      );
      setIsSubmitting(false);
      return;
    }

    if (data.redirectTo) {
      window.location.assign(data.redirectTo);
      return;
    }

    setError(
      intl.formatMessage({
        id: "authRecovery.oauthConsent.error.missingRedirect",
      }),
    );
    setIsSubmitting(false);
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <EchoSeoLogo className="size-10" />
        <h1 className="mt-5 text-xl font-semibold">
          {intl.formatMessage({ id: "authRecovery.oauthConsent.title" })}
        </h1>
        <p className="mt-2 text-sm text-base-content/70">
          {intl.formatMessage({ id: "authRecovery.oauthConsent.subtitle" })}
        </p>
      </div>

      {userEmail ? (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-base-300 bg-base-200/50 px-3 py-2 text-sm">
          <div className="flex size-7 items-center justify-center rounded-full bg-base-300">
            <User className="size-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-base-content/60">
              {intl.formatMessage({
                id: "authRecovery.oauthConsent.signedInAs",
              })}
            </div>
            <div className="font-medium">{userEmail}</div>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="text-xs font-medium uppercase tracking-wide text-base-content/60">
          {intl.formatMessage({ id: "authRecovery.oauthConsent.scopesIntro" })}
        </div>
        <ul className="mt-3 space-y-3">
          {scopes.map((scope) => (
            <li key={scope.labelId} className="flex gap-3">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <div className="text-sm font-medium">
                  {intl.formatMessage({ id: scope.labelId })}
                </div>
                <div className="text-xs text-base-content/60">
                  {intl.formatMessage({ id: scope.descriptionId })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {error ? (
        <div className="mt-6 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      ) : null}

      <div className="mt-8 flex gap-2">
        <button
          type="button"
          className="btn btn-ghost flex-1"
          disabled={isSubmitting}
          onClick={() => void respond(false)}
        >
          {intl.formatMessage({ id: "authRecovery.oauthConsent.deny" })}
        </button>
        <button
          type="button"
          className="btn btn-primary flex-1"
          disabled={isSubmitting}
          onClick={() => void respond(true)}
        >
          {isSubmitting
            ? intl.formatMessage({ id: "authRecovery.oauthConsent.approving" })
            : intl.formatMessage({ id: "authRecovery.oauthConsent.approve" })}
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-base-content/50">
        {intl.formatMessage({ id: "authRecovery.oauthConsent.revokeNotice" })}
      </p>
    </div>
  );
}
