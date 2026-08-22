import { useMutation, useQuery } from "@tanstack/react-query";
import { AutumnProvider } from "autumn-js/react";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { DEFAULT_LOCATION_CODE } from "@/shared/keyword-locations";
import { LocationSelect } from "@/client/components/LocationSelect";
import { EchoSeoLogo } from "@/client/components/EchoSeoLogo";
import { useSession } from "@/lib/auth-client";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import { saveOnboardingSite } from "@/serverFunctions/onboardingChat";
import { OnboardingAccountMenu } from "./OnboardingAccountMenu";
import { OnboardingChatConversation } from "./OnboardingChatConversation";
import {
  invalidateOnboardingChatState,
  onboardingChatStateQueryOptions,
} from "./onboardingChatQueries";

// Full-viewport chat surface. Breaks out of the centered, padded AuthPageShell
// with `fixed inset-0` so the chat fills the screen. There's no header bar —
// the strategy's first message carries the context — and inner content is
// constrained to a narrow column for comfortable reading width.
function StrategyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-base-100">{children}</div>
  );
}

export function OnboardingChat() {
  const intl = useIntl();
  const stateQuery = useQuery(onboardingChatStateQueryOptions());
  const { data: session } = useSession();
  const accountMenu = <OnboardingAccountMenu email={session?.user?.email} />;

  if (stateQuery.isError) {
    return (
      <StrategyShell>
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-error">
          {getLocalizedErrorMessage(
            intl,
            stateQuery.error,
            intl.formatMessage({ id: "onboardingChat.shell.loadError" }),
          )}
        </div>
      </StrategyShell>
    );
  }

  if (!stateQuery.data) {
    return (
      <StrategyShell>
        <div className="flex flex-1 items-center justify-center gap-2 p-6 text-sm text-base-content/60">
          <Loader2 className="size-4 animate-spin" />
          <FormattedMessage id="onboardingChat.shell.loading" />
        </div>
      </StrategyShell>
    );
  }

  const { projectId, domain } = stateQuery.data;

  return (
    <StrategyShell>
      {accountMenu}
      {!domain ? (
        <SiteForm projectId={projectId} />
      ) : (
        <AutumnProvider>
          <OnboardingChatConversation projectId={projectId} domain={domain} />
        </AutumnProvider>
      )}
    </StrategyShell>
  );
}

function SiteForm({ projectId }: { projectId: string }) {
  const intl = useIntl();
  const [domain, setDomain] = useState("");
  const [locationCode, setLocationCode] = useState(DEFAULT_LOCATION_CODE);

  const save = useMutation({
    mutationFn: () =>
      saveOnboardingSite({ data: { projectId, domain, locationCode } }),
    onSuccess: invalidateOnboardingChatState,
  });

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
      <form
        className="w-full max-w-md space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (domain.trim()) {
            save.mutate();
          }
        }}
      >
        <div className="space-y-3 text-center">
          <EchoSeoLogo className="mx-auto size-10" />
          <h1 className="text-xl font-semibold">
            <FormattedMessage id="onboardingChat.siteForm.title" />
          </h1>
          <p className="text-sm text-base-content/60">
            <FormattedMessage id="onboardingChat.siteForm.subtitle" />
          </p>
        </div>

        <div className="space-y-4 rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
          <label className="block space-y-1">
            <span className="text-sm font-medium">
              <FormattedMessage id="onboardingChat.siteForm.domainLabel" />
            </span>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder={intl.formatMessage({
                id: "onboardingChat.siteForm.domainPlaceholder",
              })}
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">
              <FormattedMessage id="onboardingChat.siteForm.locationLabel" />
            </span>
            <LocationSelect value={locationCode} onChange={setLocationCode} />
          </label>

          {save.isError ? (
            <p className="text-sm text-error">
              {getLocalizedErrorMessage(
                intl,
                save.error,
                intl.formatMessage({
                  id: "onboardingChat.siteForm.saveErrorDefault",
                }),
              )}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={!domain.trim() || save.isPending}
          >
            <FormattedMessage
              id={
                save.isPending
                  ? "onboardingChat.siteForm.saving"
                  : "onboardingChat.siteForm.submit"
              }
            />
          </button>
        </div>
      </form>
    </div>
  );
}
