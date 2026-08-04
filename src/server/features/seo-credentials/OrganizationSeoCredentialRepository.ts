/**
 * Data access for per-organization "bring your own key" SEO-data credentials.
 *
 * The DataForSEO API key is stored encrypted at rest and only ever decrypted at
 * the point of use. Encryption reuses the GSC pattern: `symmetricEncrypt` /
 * `symmetricDecrypt` (`better-auth/crypto`) keyed on `BETTER_AUTH_SECRET`, so no
 * new Worker secret is introduced. Callers must never log the raw key, the
 * encrypted blob, or return either to the client — only the masked `keyLast4`.
 */
import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationSeoCredentials } from "@/db/schema";
import { getRequiredEnvValue } from "@/server/lib/runtime-env";

type OrganizationSeoCredential = typeof organizationSeoCredentials.$inferSelect;

async function encryptionKey(): Promise<string> {
  // BETTER_AUTH_SECRET is already required for auth, so a valid environment
  // always has it; encrypt/decrypt throw otherwise rather than silently
  // producing an unreadable blob.
  return getRequiredEnvValue("BETTER_AUTH_SECRET");
}

/** Encrypt a raw DataForSEO key (base64 `login:password`) for storage. */
export async function encryptDataforseoKey(raw: string): Promise<string> {
  return symmetricEncrypt({ key: await encryptionKey(), data: raw });
}

/** Decrypt a stored key back to its raw base64 form for use in a request. */
export async function decryptDataforseoKey(encrypted: string): Promise<string> {
  return symmetricDecrypt({ key: await encryptionKey(), data: encrypted });
}

async function getEncrypted(
  organizationId: string,
): Promise<OrganizationSeoCredential | null> {
  const row = await db.query.organizationSeoCredentials.findFirst({
    where: eq(organizationSeoCredentials.organizationId, organizationId),
  });
  return row ?? null;
}

/**
 * Insert or replace the organization's single credential row. A second save
 * overwrites the encrypted key and masked hint in place (organizationId is the
 * primary key). `createdByUserId` records the first setter and is intentionally
 * not overwritten on update, keeping the column honest to its name.
 */
async function upsert(input: {
  organizationId: string;
  encryptedApiKey: string;
  keyLast4: string | null;
  createdByUserId: string;
}): Promise<void> {
  await db
    .insert(organizationSeoCredentials)
    .values({
      organizationId: input.organizationId,
      encryptedApiKey: input.encryptedApiKey,
      keyLast4: input.keyLast4,
      createdByUserId: input.createdByUserId,
    })
    .onConflictDoUpdate({
      target: organizationSeoCredentials.organizationId,
      set: {
        encryptedApiKey: input.encryptedApiKey,
        keyLast4: input.keyLast4,
        updatedAt: new Date().toISOString(),
      },
    });
}

async function remove(organizationId: string): Promise<void> {
  await db
    .delete(organizationSeoCredentials)
    .where(eq(organizationSeoCredentials.organizationId, organizationId));
}

export const OrganizationSeoCredentialRepository = {
  getEncrypted,
  upsert,
  remove,
} as const;
