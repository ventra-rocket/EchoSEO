import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth-client";
import { getSignInHrefForLocation } from "@/lib/auth-redirect";

export const Route = createFileRoute("/accept-invitation/$id")({
  component: AcceptInvitationPage,
});

/**
 * Landing page for an emailed workspace invitation. Better Auth requires the
 * invitee to be signed in with the invited email, so an unauthenticated visitor
 * is sent to sign-in and returned here. `getInvitation` renders the details to
 * confirm before accepting; every failure (wrong account, expired, already used)
 * surfaces Better Auth's own error rather than a fabricated state.
 */
function AcceptInvitationPage() {
  const { id } = Route.useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = useSession();

  // Not signed in → bounce to sign-in and come back to this invitation.
  useEffect(() => {
    if (!sessionPending && !session?.user) {
      window.location.assign(getSignInHrefForLocation(window.location));
    }
  }, [sessionPending, session?.user]);

  const invitation = useQuery({
    queryKey: ["invitation", id],
    enabled: !!session?.user,
    queryFn: async () => {
      const result = await authClient.organization.getInvitation({
        query: { id },
      });
      if (result.error) throw new Error(result.error.message ?? "load failed");
      return result.data;
    },
  });

  const accept = useMutation({
    mutationFn: async () => {
      const result = await authClient.organization.acceptInvitation({
        invitationId: id,
      });
      if (result.error)
        throw new Error(result.error.message ?? "accept failed");
    },
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "invite.accepted" }));
      void navigate({ to: "/" });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : intl.formatMessage({ id: "invite.acceptError" }),
      ),
  });

  const reject = useMutation({
    mutationFn: async () => {
      const result = await authClient.organization.rejectInvitation({
        invitationId: id,
      });
      if (result.error)
        throw new Error(result.error.message ?? "reject failed");
    },
    onSuccess: () => void navigate({ to: "/" }),
    onError: (error) =>
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : intl.formatMessage({ id: "invite.declineError" }),
      ),
  });

  if (sessionPending || !session?.user) {
    return <CenteredSpinner />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-base-200 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-base-300 bg-base-100 p-8 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">
          {intl.formatMessage({ id: "invite.title" })}
        </h1>

        {invitation.isLoading ? (
          <CenteredSpinner />
        ) : invitation.isError || !invitation.data ? (
          <p className="text-sm text-base-content/60">
            {intl.formatMessage({ id: "invite.unavailable" })}
          </p>
        ) : (
          <>
            <p className="text-sm text-base-content/70">
              {intl.formatMessage(
                { id: "invite.body" },
                {
                  organization:
                    invitation.data.organizationName ??
                    intl.formatMessage({ id: "invite.aWorkspace" }),
                },
              )}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary flex-1"
                disabled={accept.isPending || reject.isPending}
                onClick={() => accept.mutate()}
              >
                {intl.formatMessage({ id: "invite.accept" })}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={accept.isPending || reject.isPending}
                onClick={() => reject.mutate()}
              >
                {intl.formatMessage({ id: "invite.decline" })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CenteredSpinner() {
  return (
    <div className="flex justify-center py-10">
      <span className="loading loading-spinner loading-md" />
    </div>
  );
}
