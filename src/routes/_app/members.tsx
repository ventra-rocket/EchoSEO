import { createFileRoute } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { MembersManager } from "@/client/features/members/MembersManager";

export const Route = createFileRoute("/_app/members")({
  component: MembersPage,
});

function MembersPage() {
  const intl = useIntl();
  const isHosted = isHostedClientAuthMode();

  return (
    <div className="h-full overflow-auto bg-base-100 px-4 py-8 pb-24 md:px-6 md:py-12 md:pb-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {intl.formatMessage({ id: "members.title" })}
          </h1>
          <p className="mt-1 text-sm text-base-content/60">
            {intl.formatMessage({ id: "members.subtitle" })}
          </p>
        </div>

        {isHosted ? (
          <MembersManager />
        ) : (
          <p className="text-sm text-base-content/50">
            {intl.formatMessage({ id: "members.hostedOnly" })}
          </p>
        )}
      </div>
    </div>
  );
}
