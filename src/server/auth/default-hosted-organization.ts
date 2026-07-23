import { and, asc, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { member, session, user as authUser } from "@/db/better-auth-schema";
import { slugify, toHex } from "./org-slug";

type HostedUser = {
  id: string;
  email: string;
  name?: string | null;
};

type HostedOrganizationCreateInput = {
  name: string;
  slug: string;
  userId: string;
};

type HostedOrganizationCreator = (
  input: HostedOrganizationCreateInput,
) => Promise<{ id: string }>;

function getDefaultHostedOrganizationName(user: HostedUser) {
  const name = user.name?.trim() || user.email.split("@")[0] || "EchoSEO";
  return `${name}'s workspace`;
}

function getDefaultHostedOrganizationSlug(user: HostedUser) {
  const slugSource =
    user.name?.trim() || user.email.split("@")[0] || "workspace";
  const suffix = toHex(user.id).slice(0, 12);
  return `${slugify(slugSource)}-${suffix}`;
}

/**
 * Whether the user currently holds a membership in the given organization.
 *
 * The session's `activeOrganizationId` is a stored field that outlives the
 * `member` row it points at — removing a member deletes the row but not the
 * session pointer. Callers re-check membership here so a removed member's session
 * cannot keep resolving (and reading) an organization they no longer belong to.
 */
export async function isHostedOrganizationMember(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId)),
    )
    .limit(1);

  return row != null;
}

async function findFirstOrganizationIdForUser(userId: string) {
  const [existingMembership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt))
    .limit(1);

  return existingMembership?.organizationId ?? null;
}

async function getHostedUser(userId: string) {
  const hostedUser = await db.query.user.findFirst({
    columns: {
      id: true,
      email: true,
      name: true,
    },
    where: eq(authUser.id, userId),
  });

  if (!hostedUser?.email) {
    throw new Error("Failed to resolve hosted user for session setup");
  }

  return hostedUser;
}

async function createDefaultHostedOrganization(
  user: HostedUser,
  createOrganization: HostedOrganizationCreator,
) {
  try {
    const createdOrganization = await createOrganization({
      name: getDefaultHostedOrganizationName(user),
      slug: getDefaultHostedOrganizationSlug(user),
      userId: user.id,
    });

    return createdOrganization.id;
  } catch (error) {
    const organizationId = await findFirstOrganizationIdForUser(user.id);

    if (organizationId) {
      return organizationId;
    }

    throw error;
  }
}

export async function getOrCreateDefaultHostedOrganization(
  userId: string,
  createOrganization: HostedOrganizationCreator,
) {
  const existingOrganizationId = await findFirstOrganizationIdForUser(userId);

  if (existingOrganizationId) {
    return existingOrganizationId;
  }

  const hostedUser = await getHostedUser(userId);
  return createDefaultHostedOrganization(hostedUser, createOrganization);
}

/**
 * The organization to make active on a fresh session (login).
 *
 * Restores the workspace the user last worked in — read from their most recent
 * still-valid prior session — so an invited member who switched to a shared
 * workspace stays there across logins instead of being bounced back to their own
 * empty workspace. The new session row is inserted only after the
 * `session.create.before` hook that calls this, so the query sees prior sessions.
 *
 * Membership is re-checked: a workspace the user was removed from since is never
 * restored (mirrors resolveHostedContext), and anything unresolvable — no prior
 * session, an expired one, or a lost membership — falls back to the user's own
 * default workspace.
 */
export async function resolveInitialActiveOrganization(
  userId: string,
  createOrganization: HostedOrganizationCreator,
): Promise<string> {
  const [priorSession] = await db
    .select({ activeOrganizationId: session.activeOrganizationId })
    .from(session)
    .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
    .orderBy(desc(session.updatedAt))
    .limit(1);

  const lastActiveOrganizationId = priorSession?.activeOrganizationId ?? null;
  if (
    lastActiveOrganizationId &&
    (await isHostedOrganizationMember(userId, lastActiveOrganizationId))
  ) {
    return lastActiveOrganizationId;
  }

  return getOrCreateDefaultHostedOrganization(userId, createOrganization);
}
