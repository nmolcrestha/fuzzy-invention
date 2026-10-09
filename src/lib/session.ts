import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";

/**
 * Data Access Layer for the current user.
 * Reads the request, so call it only from components behind a <Suspense> boundary,
 * or from server actions / route handlers.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

/** Returns the signed-in user, or redirects to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
}
