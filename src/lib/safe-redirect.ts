export const DEFAULT_AUTHED_PATH = "/dashboard";

/**
 * Returns `target` only if it is a same-origin relative path, otherwise the fallback.
 * Prevents open redirects through `?callbackUrl=https://evil.example`.
 */
export function safeRedirectPath(
  target: string | null | undefined,
  fallback: string = DEFAULT_AUTHED_PATH,
): string {
  if (!target) return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return fallback;
  }
  // Reject control characters that browsers strip (e.g. "/\t/evil.example").
  if (/[\u0000-\u001f\u007f]/.test(target)) return fallback;
  return target;
}
