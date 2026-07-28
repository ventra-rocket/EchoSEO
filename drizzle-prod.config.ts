import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    // Production migrations cannot authenticate without this secret. The
    // non-null assertion preserves Drizzle's required credential contract;
    // Wrangler/Cloudflare then fails the command clearly if it is absent.
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
});
