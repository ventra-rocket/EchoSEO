import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { organization } from "./better-auth-schema";

// One "bring your own key" SEO-data credential per organization. The API key is
// stored encrypted at rest (symmetricEncrypt keyed on BETTER_AUTH_SECRET, same
// pattern as GSC tokens) and is never returned verbatim or logged; `keyLast4`
// exists only to render a masked hint in Settings. `organizationId` is the
// primary key, so there is exactly one credential row per organization and a
// second save overwrites the first (onConflictDoUpdate).
export const organizationSeoCredentials = sqliteTable(
  "organization_seo_credentials",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Which SEO-data provider this key is for. Only "dataforseo" is supported
    // today; the column keeps the table open to a second provider later.
    provider: text("provider").notNull().default("dataforseo"),
    encryptedApiKey: text("encrypted_api_key").notNull(),
    keyLast4: text("key_last4"),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
);
