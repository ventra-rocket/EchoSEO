import { ProjectService } from "@/server/features/projects/services/ProjectService";
import { AppError } from "@/server/lib/errors";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import {
  buildBillingCustomer,
  requireMcpToolAuthContext,
  type ToolExtra,
} from "@/server/mcp/context";

type ProjectScopedArgs = {
  projectId: string;
};

/**
 * Re-check that an MCP token's organization is still a live membership.
 *
 * An MCP token freezes its organization at consent (access 24h / refresh 30d),
 * so — unlike a browser session, which re-resolves membership every request — a
 * removed member would keep this org's access until the token aged out. Every
 * organization-scoped tool must call this, not only the project-scoped ones:
 * `list_projects` and `whoami` read org state without a projectId and would
 * otherwise leak the old org's inventory and billing to a removed member.
 *
 * Hosted only: delegated/local modes have no membership rows, and gating there
 * would wrongly deny every call. The membership helper (and its `@/db` binding)
 * is imported lazily so this module stays loadable in the many tool tests that
 * never touch the database. Fails closed — any error here denies the call.
 */
export async function requireLiveOrgMembership(auth: {
  userId: string;
  organizationId: string;
}): Promise<void> {
  if (!(await isHostedServerAuthMode())) return;

  const { isHostedOrganizationMember } =
    await import("@/server/auth/default-hosted-organization");
  if (!(await isHostedOrganizationMember(auth.userId, auth.organizationId))) {
    throw new AppError("FORBIDDEN");
  }
}

async function requireProjectAccess(extra: ToolExtra, projectId: string) {
  const { baseUrl, ...auth } = requireMcpToolAuthContext(extra);

  await requireLiveOrgMembership(auth);

  // Authorize the caller-supplied projectId against the token's organization.
  // Assert on the result instead of relying on the lookup throwing, so this
  // stays a hard gate even if the service's error behavior ever changes.
  const project = await ProjectService.getProjectForOrganization(
    auth.organizationId,
    projectId,
  );
  if (!project) {
    throw new AppError("FORBIDDEN");
  }

  return {
    auth,
    baseUrl,
    billing: buildBillingCustomer(auth, projectId),
  };
}

type McpProjectAuthContext = Awaited<ReturnType<typeof requireProjectAccess>>;

export function withMcpProjectAuth<TArgs extends ProjectScopedArgs, TResult>(
  handler: (
    args: TArgs,
    context: McpProjectAuthContext,
  ) => Promise<TResult> | TResult,
) {
  return async (args: TArgs, extra: ToolExtra) => {
    const context = await requireProjectAccess(extra, args.projectId);
    return handler(args, context);
  };
}
