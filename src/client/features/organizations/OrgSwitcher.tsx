import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth-client";
import { getActiveOrganizationId } from "@/lib/auth-session";

function closeDropdown() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

interface OrgOption {
  id: string;
  name: string;
}

/**
 * Hosted-only workspace switcher, rendered as account-menu `<li>` rows.
 *
 * Better Auth pins each new session's active organization to the user's own
 * (earliest) org, and `acceptInvitation` only sets the invited org active on the
 * current session — so after the next sign-in an invited member would lose the
 * shared workspace. Listing the organizations the user belongs to and calling
 * `setActive` makes each one reachable again every session.
 *
 * Rendered only when the user has more than one organization (a solo user has
 * nothing to switch to). `list()` returns only orgs the user is a member of, and
 * `setActive` re-checks membership server-side, so this cannot reach a workspace
 * the user was removed from.
 */
export function OrgSwitcherSection() {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const activeOrganizationId = getActiveOrganizationId(session);

  const orgsQuery = useQuery({
    queryKey: ["org-list"],
    queryFn: async (): Promise<OrgOption[]> => {
      const result = await authClient.organization.list();
      if (result.error) throw new Error(result.error.message ?? "load failed");
      return (result.data ?? []).map((org) => ({ id: org.id, name: org.name }));
    },
  });

  const switchOrg = useMutation({
    mutationFn: async (organizationId: string) => {
      const result = await authClient.organization.setActive({
        organizationId,
      });
      if (result.error)
        throw new Error(result.error.message ?? "switch failed");
    },
    // The active org is a stored session field the server reads to scope every
    // org-owned view, so a hard reload re-resolves all of it — and drops any
    // project id still in the URL that belonged to the previous org.
    onSuccess: () => window.location.assign("/"),
    // A failed setActive has an unknown outcome — the server may have committed
    // the new active org before the response was lost. Re-sync every cached read
    // against the authoritative session so the UI can't keep showing (or writing
    // to) the previous org while the server has resolved a different one.
    onError: () => {
      void queryClient.invalidateQueries();
      toast.error(intl.formatMessage({ id: "account.workspaceSwitchError" }));
    },
  });

  const orgs = orgsQuery.data ?? [];
  if (orgs.length <= 1) return null;

  const handleSelect = (organizationId: string) => {
    if (organizationId === activeOrganizationId) {
      closeDropdown();
      return;
    }
    switchOrg.mutate(organizationId);
  };

  return (
    <>
      <li className="menu-title max-w-full">
        <span>{intl.formatMessage({ id: "account.workspaces" })}</span>
      </li>
      {orgs.map((org) => {
        const isActive = org.id === activeOrganizationId;
        const isSwitchingToThis =
          switchOrg.isPending && switchOrg.variables === org.id;
        return (
          <li key={org.id}>
            <button
              type="button"
              disabled={switchOrg.isPending || switchOrg.isSuccess}
              onClick={() => handleSelect(org.id)}
              className={isActive ? "active" : ""}
            >
              <span className="min-w-0 flex-1 truncate">{org.name}</span>
              {isSwitchingToThis ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : isActive ? (
                <Check className="size-4 shrink-0 text-primary" />
              ) : null}
            </button>
          </li>
        );
      })}
      <li>
        <hr className="my-1 border-base-300" />
      </li>
    </>
  );
}
