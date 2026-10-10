/**
 * Creates (or resets) a verified demo account for local development.
 *
 *   pnpm db:seed
 *
 * Override the defaults with SEED_EMAIL / SEED_PASSWORD / SEED_NAME in .env.
 * Refuses to run when NODE_ENV=production.
 */
import "dotenv/config";

import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { account, user } from "../src/db/schema/auth";

const email = (process.env.SEED_EMAIL ?? "demo@example.com").toLowerCase();
const password = process.env.SEED_PASSWORD ?? "demo12345";
const name = process.env.SEED_NAME ?? "Demo User";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed a demo account in production.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  if (password.length < 8) throw new Error("SEED_PASSWORD must be at least 8 characters.");

  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(client, { casing: "snake_case" });

  try {
    const hash = await hashPassword(password);
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existing) {
      // Re-running resets the password and makes sure the email counts as confirmed.
      await db.update(user).set({ emailVerified: true, name }).where(eq(user.id, existing.id));
      const updated = await db
        .update(account)
        .set({ password: hash })
        .where(and(eq(account.userId, existing.id), eq(account.providerId, "credential")))
        .returning({ id: account.id });
      if (updated.length === 0) {
        await db.insert(account).values({
          id: crypto.randomUUID(),
          accountId: existing.id,
          providerId: "credential",
          userId: existing.id,
          password: hash,
        });
      }
      console.log(`✔ Demo account already existed; password reset.`);
    } else {
      const id = crypto.randomUUID();
      await db.insert(user).values({ id, name, email, emailVerified: true });
      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: hash,
      });
      console.log(`✔ Demo account created.`);
    }

    console.log(
      `\n  Log in at http://localhost:3000/login\n  Email:    ${email}\n  Password: ${password}\n`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("✖ Seeding failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
