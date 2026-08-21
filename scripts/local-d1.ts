import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Miniflare keeps every simulated binding under `.wrangler/state/v3` — one
 * directory per product, each with its own `metadata.sqlite`. Scanning the tree
 * for the first `*.sqlite` therefore resolves whichever of ~20 files the
 * directory listing happens to return first (the Cache object's, in practice),
 * so the search is scoped to the D1 directory and skips its bookkeeping file.
 */
const D1_STATE_DIR = path.join(".wrangler", "state", "v3", "d1");

/** Miniflare's own index, not a database. */
const METADATA_FILE = "metadata.sqlite";

/**
 * The binding, not the database name. `wrangler d1` resolves a binding against
 * `wrangler.jsonc` itself, which is why nothing here has to parse that file —
 * the same literal the `db:migrate:*` scripts pass.
 */
const D1_BINDING = "DB";

/**
 * The database file carries a content-hashed name, so it can only be found by
 * listing: everything under the D1 directory that is not the metadata index.
 */
function findD1File(basePath: string): string | undefined {
  return fs
    .readdirSync(basePath, { encoding: "utf-8", recursive: true })
    .find(
      (entry) =>
        entry.endsWith(".sqlite") && path.basename(entry) !== METADATA_FILE,
    );
}

/**
 * Absolute path to the local D1 sqlite file, or `null` when there is no local
 * state at all — the normal case in CI, where drizzle-kit only generates SQL
 * and never opens a database.
 */
export function getLocalD1Url(): string | null {
  const basePath = path.resolve(D1_STATE_DIR);

  if (fs.existsSync(basePath)) {
    const existing = findD1File(basePath);
    if (existing) return path.resolve(basePath, existing);
  }

  // No local D1 yet. In CI that is the whole story: drizzle-kit generates SQL
  // and never opens a database, so a null url is correct there.
  if (!fs.existsSync(path.resolve(".wrangler"))) {
    console.error(
      "No .wrangler/ directory: no local D1 database yet. Expected in CI; locally, run `pnpm run dev` once to create it.",
    );
    return null;
  }

  // Local state exists but D1 has never been touched. A trivial query is enough
  // to make wrangler create the file.
  console.log(`Initializing local D1 database (${D1_BINDING})...`);
  execSync(
    `npx wrangler d1 execute ${D1_BINDING} --local --command "SELECT 1;"`,
    { stdio: "pipe" },
  );

  const created = fs.existsSync(basePath) ? findD1File(basePath) : undefined;
  if (!created) {
    throw new Error(
      `wrangler did not create a database under ${D1_STATE_DIR}/ for binding ${D1_BINDING}.`,
    );
  }
  return path.resolve(basePath, created);
}
