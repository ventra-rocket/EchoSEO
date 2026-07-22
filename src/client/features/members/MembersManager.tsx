import { useState } from "react";
import { useIntl } from "react-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth-client";

/** Roles an owner/admin may assign through the UI. `owner` is deliberately not
 * assignable here — it is shown read-only for existing owners. */
const ASSIGNABLE_ROLES = ["admin", "editor", "viewer"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

function isAssignableRole(value: string): value is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(value);
}

/** Which option to preselect for a member. A plain Better Auth `member` maps to
 * editor in the audit matrix, so show that rather than a misleading fallback. */
function assignableSelectValue(role: string): AssignableRole {
  if (isAssignableRole(role)) return role;
  return role === "member" ? "editor" : "viewer";
}

interface MemberRow {
  id: string;
  userId: string;
  role: string;
  email: string;
  name: string | null;
}

interface InvitationRow {
  id: string;
  email: string;
  role: string;
  status: string;
}

/**
 * Owner/admin surface for managing who can see a workspace: invite by email with
 * a role, change a member's role, remove a member, and cancel a pending invite.
 * All mutations go through Better Auth's organization endpoints; the server (its
 * access-control roles + the last-owner guard) is the authority, so the controls
 * here only shape what an operator can attempt.
 */
export function MembersManager() {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const selfUserId = session?.user?.id ?? null;

  const membersQuery = useQuery({
    queryKey: ["org-members"],
    queryFn: async (): Promise<MemberRow[]> => {
      const result = await authClient.organization.listMembers();
      if (result.error) throw new Error(result.error.message ?? "load failed");
      return (result.data?.members ?? []).map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        email: m.user?.email ?? "",
        name: m.user?.name ?? null,
      }));
    },
  });

  const invitesQuery = useQuery({
    queryKey: ["org-invitations"],
    queryFn: async (): Promise<InvitationRow[]> => {
      const result = await authClient.organization.listInvitations();
      if (result.error) throw new Error(result.error.message ?? "load failed");
      return (result.data ?? [])
        .filter((invite) => invite.status === "pending")
        .map((invite) => ({
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
        }));
    },
  });

  const selfRole = (membersQuery.data ?? []).find(
    (m) => m.userId === selfUserId,
  )?.role;
  if (membersQuery.isError) {
    return <ErrorNote id="members.list.error" />;
  }
  // Defense-in-depth beside the gated menu link: only owner/admin manage members.
  // Better Auth also authorizes each mutation server-side.
  if (membersQuery.data && selfRole !== "owner" && selfRole !== "admin") {
    return (
      <p className="text-sm text-base-content/50">
        {intl.formatMessage({ id: "members.noAccess" })}
      </p>
    );
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["org-members"] });
    void queryClient.invalidateQueries({ queryKey: ["org-invitations"] });
  };

  function reportError(fallbackId: string, error: unknown) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : intl.formatMessage({ id: fallbackId });
    toast.error(message);
  }

  const invite = useMutation({
    mutationFn: async (input: { email: string; role: AssignableRole }) => {
      const result = await authClient.organization.inviteMember(input);
      if (result.error)
        throw new Error(result.error.message ?? "invite failed");
    },
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "members.invite.sent" }));
      invalidate();
    },
    onError: (error) => reportError("members.invite.error", error),
  });

  const changeRole = useMutation({
    mutationFn: async (input: { memberId: string; role: AssignableRole }) => {
      const result = await authClient.organization.updateMemberRole(input);
      if (result.error)
        throw new Error(result.error.message ?? "update failed");
    },
    onSuccess: invalidate,
    onError: (error) => reportError("members.role.error", error),
  });

  const removeMember = useMutation({
    mutationFn: async (memberIdOrEmail: string) => {
      const result = await authClient.organization.removeMember({
        memberIdOrEmail,
      });
      if (result.error)
        throw new Error(result.error.message ?? "remove failed");
    },
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "members.remove.done" }));
      invalidate();
    },
    onError: (error) => reportError("members.remove.error", error),
  });

  const cancelInvite = useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await authClient.organization.cancelInvitation({
        invitationId,
      });
      if (result.error)
        throw new Error(result.error.message ?? "cancel failed");
    },
    onSuccess: invalidate,
    onError: (error) => reportError("members.invite.cancelError", error),
  });

  return (
    <div className="space-y-10">
      <InviteForm
        pending={invite.isPending}
        onInvite={(email, role) => invite.mutateAsync({ email, role })}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-base-content/50">
          {intl.formatMessage({ id: "members.list.title" })}
        </h2>
        {membersQuery.isLoading ? (
          <Spinner />
        ) : membersQuery.isError ? (
          <ErrorNote id="members.list.error" />
        ) : (
          <ul className="divide-y divide-base-300 rounded-lg border border-base-300">
            {(membersQuery.data ?? []).map((member) => (
              <MemberItem
                key={member.id}
                member={member}
                isSelf={member.userId === selfUserId}
                busy={changeRole.isPending || removeMember.isPending}
                onRoleChange={(role) =>
                  changeRole.mutate({ memberId: member.id, role })
                }
                onRemove={() => removeMember.mutate(member.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-base-content/50">
          {intl.formatMessage({ id: "members.invites.title" })}
        </h2>
        {invitesQuery.isLoading ? (
          <Spinner />
        ) : invitesQuery.isError ? (
          <ErrorNote id="members.invites.error" />
        ) : membersQuery.data && (invitesQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-base-content/50">
            {intl.formatMessage({ id: "members.invites.empty" })}
          </p>
        ) : (
          <ul className="divide-y divide-base-300 rounded-lg border border-base-300">
            {(invitesQuery.data ?? []).map((invitation) => (
              <li
                key={invitation.id}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <Mail className="size-4 shrink-0 text-base-content/40" />
                <span className="min-w-0 flex-1 truncate">
                  {invitation.email}
                </span>
                <span className="text-base-content/50">
                  {roleLabel(intl, invitation.role)}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  disabled={cancelInvite.isPending}
                  onClick={() => cancelInvite.mutate(invitation.id)}
                >
                  {intl.formatMessage({ id: "members.invites.cancel" })}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function InviteForm({
  pending,
  onInvite,
}: {
  pending: boolean;
  onInvite: (email: string, role: AssignableRole) => Promise<void>;
}) {
  const intl = useIntl();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("editor");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = email.trim();
        if (!trimmed) return;
        // Clear only after a successful send, so a failed invite keeps the typed
        // address for a retry.
        onInvite(trimmed, role).then(
          () => setEmail(""),
          () => {},
        );
      }}
    >
      <h2 className="text-sm font-medium text-base-content/50">
        {intl.formatMessage({ id: "members.invite.title" })}
      </h2>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          placeholder={intl.formatMessage({ id: "members.invite.emailLabel" })}
          className="input input-bordered flex-1"
          aria-label={intl.formatMessage({ id: "members.invite.emailLabel" })}
        />
        <select
          value={role}
          onChange={(event) => {
            const value = event.currentTarget.value;
            if (isAssignableRole(value)) setRole(value);
          }}
          className="select select-bordered"
          aria-label={intl.formatMessage({ id: "members.invite.roleLabel" })}
        >
          {ASSIGNABLE_ROLES.map((option) => (
            <option key={option} value={option}>
              {roleLabel(intl, option)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          {intl.formatMessage({ id: "members.invite.submit" })}
        </button>
      </div>
    </form>
  );
}

function MemberItem({
  member,
  isSelf,
  busy,
  onRoleChange,
  onRemove,
}: {
  member: MemberRow;
  isSelf: boolean;
  busy: boolean;
  onRoleChange: (role: AssignableRole) => void;
  onRemove: () => void;
}) {
  const intl = useIntl();
  // An owner's role is not editable here, and you cannot remove or demote
  // yourself — the last-owner guard is enforced server-side regardless.
  const isOwner = member.role === "owner";
  const locked = isSelf || isOwner;

  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate">{member.email}</p>
        {member.name ? (
          <p className="truncate text-xs text-base-content/50">{member.name}</p>
        ) : null}
      </div>

      {locked ? (
        <span className="text-base-content/50">
          {roleLabel(intl, member.role)}
          {isSelf ? ` · ${intl.formatMessage({ id: "members.you" })}` : ""}
        </span>
      ) : (
        <select
          value={assignableSelectValue(member.role)}
          disabled={busy}
          onChange={(event) => {
            const value = event.currentTarget.value;
            if (isAssignableRole(value)) onRoleChange(value);
          }}
          className="select select-bordered select-sm"
          aria-label={intl.formatMessage({ id: "members.role.change" })}
        >
          {ASSIGNABLE_ROLES.map((option) => (
            <option key={option} value={option}>
              {roleLabel(intl, option)}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        className="btn btn-ghost btn-xs btn-square text-error"
        disabled={locked || busy}
        aria-label={intl.formatMessage({ id: "members.remove.label" })}
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function roleLabel(intl: ReturnType<typeof useIntl>, role: string): string {
  const known = ["owner", "admin", "editor", "viewer"];
  return known.includes(role)
    ? intl.formatMessage({ id: `members.role.${role}` })
    : role;
}

function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <span className="loading loading-spinner loading-md" />
    </div>
  );
}

function ErrorNote({ id }: { id: string }) {
  const intl = useIntl();
  return (
    <div className="alert alert-error alert-sm">
      <span>{intl.formatMessage({ id })}</span>
    </div>
  );
}
