import type { z } from "zod";

/** What every server action returns. Errors are plain-language and safe to show to the user. */
export type ActionFailure = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
  /** Machine-readable reason when the UI must react differently (e.g. "conflict"). */
  code?: "conflict";
};

export type ActionResult<T = void> = { ok: true; data: T } | ActionFailure;

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionFailure {
  return { ok: false, error, fieldErrors };
}

/** Converts a Zod error into the first message per field. */
export function fromZodError(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return fail("Please fix the highlighted fields.", fieldErrors);
}

export const NOT_FOUND =
  "We couldn't find that. It may have been deleted. Refresh the page and try again.";
export const UNEXPECTED =
  "Something went wrong on our side. Your changes weren't saved. Please try again.";

/** True when Postgres rejected a write because of a unique constraint. */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 3; depth++) {
    if (typeof current === "object" && "code" in current && current.code === "23505") return true;
    current = typeof current === "object" && "cause" in current ? current.cause : undefined;
  }
  return false;
}
