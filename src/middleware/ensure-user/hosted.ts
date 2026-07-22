import { getAuth, hasHostedAuthConfig } from "@/lib/auth";
import { getActiveOrganizationId } from "@/lib/auth-session";
import {
  getOrCreateDefaultHostedOrganization,
  isHostedOrganizationMember,
} from "@/server/auth/default-hosted-organization";
import { AppError } from "@/server/lib/errors";
import type { EnsuredUserContext } from "./types";

async function requireHostedSession(headers: Headers) {
  if (!hasHostedAuthConfig()) {
    throw new AppError(
      "AUTH_CONFIG_MISSING",
      "Missing Better Auth hosted configuration",
    );
  }

  const session = await getAuth().api.getSession({ headers });

  if (!session?.user?.id || !session.user.email) {
    throw new AppError("UNAUTHENTICATED");
  }

  return session;
}

export async function resolveHostedContext(
  headers: Headers,
): Promise<EnsuredUserContext> {
  const session = await requireHostedSession(headers);
  const activeOrganizationId = getActiveOrganizationId(session);

  // Trust the session's active org only while the user is still a member of it.
  // The pointer outlives the membership — a removed member's session keeps naming
  // the org — so without this re-check they would retain read access (and could
  // download a previously-ready export or view an evidence screenshot) until the
  // session expired. Falling through resets them to their own workspace.
  if (
    activeOrganizationId &&
    (await isHostedOrganizationMember(session.user.id, activeOrganizationId))
  ) {
    return {
      userId: session.user.id,
      userEmail: session.user.email,
      emailVerified: session.user.emailVerified ?? false,
      organizationId: activeOrganizationId,
    };
  }

  const authApi = getAuth().api;
  const organizationId = await getOrCreateDefaultHostedOrganization(
    session.user.id,
    (body) => authApi.createOrganization({ body }),
  );

  await authApi.setActiveOrganization({
    headers,
    body: { organizationId },
  });

  return {
    userId: session.user.id,
    userEmail: session.user.email,
    emailVerified: session.user.emailVerified ?? false,
    organizationId,
  };
}
