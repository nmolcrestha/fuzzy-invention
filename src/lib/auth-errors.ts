type AuthError = { code?: string; message?: string; status?: number } | null | undefined;

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match. Check for typos and try again.",
  INVALID_EMAIL: "That doesn't look like a valid email address.",
  EMAIL_NOT_VERIFIED: "Please confirm your email first. We just sent you a new link.",
  USER_ALREADY_EXISTS: "An account with this email already exists. Try logging in instead.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "An account with this email already exists. Try logging in instead.",
  PASSWORD_TOO_SHORT: "Your password needs at least 8 characters.",
  PASSWORD_TOO_LONG: "That password is too long. Please use a shorter one.",
  INVALID_TOKEN: "This link is invalid or has already been used. Request a new one.",
  TOKEN_EXPIRED: "This link has expired. Request a new one.",
};

/** Turns a Better Auth error into a plain-language message for non-technical users. */
export function authErrorMessage(error: AuthError): string {
  if (error?.status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (error?.code && MESSAGES[error.code]) return MESSAGES[error.code];
  return "Something went wrong on our side. Please try again in a moment.";
}
