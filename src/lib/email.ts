import "server-only";

import { env } from "@/env";

type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Sends a transactional email through Resend.
 * Without RESEND_API_KEY (local development) the email is printed to the server console instead,
 * so sign-up and password reset still work end to end.
 */
export async function sendEmail(email: Email) {
  if (!env.RESEND_API_KEY) {
    console.info(
      `\n📧 [dev email] To: ${email.to}\n   Subject: ${email.subject}\n   ${email.text.replaceAll("\n", "\n   ")}\n`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, ...email }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send email (${response.status}): ${await response.text()}`);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function actionEmail({
  heading,
  body,
  actionLabel,
  url,
  footnote,
}: {
  heading: string;
  body: string;
  actionLabel: string;
  url: string;
  footnote: string;
}) {
  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#18181b">
  <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 24px">${escapeHtml(body)}</p>
  <a href="${escapeHtml(url)}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px">${escapeHtml(actionLabel)}</a>
  <p style="font-size:13px;line-height:1.6;color:#71717a;margin:24px 0 0">${escapeHtml(footnote)}</p>
</div>`;
  const text = `${heading}\n\n${body}\n\n${actionLabel}: ${url}\n\n${footnote}`;
  return { html, text };
}

export function verificationEmail(name: string, url: string) {
  return actionEmail({
    heading: `Welcome, ${name}!`,
    body: "Confirm your email address to finish creating your account.",
    actionLabel: "Confirm email",
    url,
    footnote: "If you didn't sign up, you can ignore this email.",
  });
}

export function resetPasswordEmail(name: string, url: string) {
  return actionEmail({
    heading: "Reset your password",
    body: `Hi ${name}, we received a request to reset your password. This link expires in 1 hour.`,
    actionLabel: "Choose a new password",
    url,
    footnote: "If you didn't ask for this, you can ignore this email. Your password won't change.",
  });
}
