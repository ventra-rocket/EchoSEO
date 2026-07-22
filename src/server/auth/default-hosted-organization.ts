import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { member, user as authUser } from "@/db/better-auth-schema";
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
