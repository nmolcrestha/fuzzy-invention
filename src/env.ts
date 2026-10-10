import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().min(1).default("localhost:3000"),
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default("Side Quest <onboarding@resend.dev>"),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  /** Vercel Blob. Without it, uploads are stored in .data/uploads (development). */
  BLOB_READ_WRITE_TOKEN: optional,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:\n", z.prettifyError(parsed.error));
  throw new Error("Invalid environment variables. Check your .env file against .env.example.");
}

export const env = parsed.data;
