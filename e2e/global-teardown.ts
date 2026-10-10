import { rm } from "node:fs/promises";
import path from "node:path";

import { config as loadEnv } from "dotenv";
import postgres from "postgres";

loadEnv({ quiet: true });

/** Deletes every test site (address starting with "e2e-") and its local uploads. */
export default async function globalTeardown() {
  // PW_KEEP_DATA=1 keeps the test sites for debugging.
  if (process.env.PW_KEEP_DATA) return;
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    const deleted = await sql<{ id: string }[]>`
      delete from sites where subdomain like 'e2e-%' returning id
    `;
    for (const { id } of deleted) {
      await rm(path.join(process.cwd(), ".data", "uploads", "sites", id), {
        recursive: true,
        force: true,
      });
    }
  } finally {
    await sql.end();
  }
}
