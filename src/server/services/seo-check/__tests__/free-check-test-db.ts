/**
 * In-memory SQLite standing in for D1 in the Free Deep SEO Checker repository
 * tests.
 *
 * Applies every migration in the journal rather than a hand-listed subset: a
 * hardcoded list goes stale the moment anyone adds a column, and it fails as an
 * unrelated `no such column` error in a suite the author never touched. The
 * whole schema costs ~20ms to build, which is cheaper than that confusion.
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";

const journalSchema = z.object({
  entries: z.array(z.object({ tag: z.string() })),
});

function migrationTags(): string[] {
  const raw: unknown = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  );
  return journalSchema.parse(raw).entries.map((entry) => entry.tag);
}

export interface FreeCheckTestDb {
  db: ReturnType<typeof drizzle>;
  raw: Client;
}

export async function createFreeCheckTestDb(): Promise<FreeCheckTestDb> {
  const raw = createClient({ url: ":memory:" });
  // D1 enforces foreign keys; plain SQLite does not unless asked. The retention
  // story rests on the lead -> reports cascade, so the test must match.
  await raw.execute("PRAGMA foreign_keys = ON");

  for (const tag of migrationTags()) {
    const ddl = readFileSync(`drizzle/${tag}.sql`, "utf8");
    for (const statement of ddl.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await raw.execute(trimmed);
    }
  }

  return { raw, db: drizzle(raw, { schema }) };
}
