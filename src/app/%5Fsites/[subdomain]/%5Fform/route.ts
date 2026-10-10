import { after, NextResponse } from "next/server";

import { submitForm } from "@/server/forms/submit";

/**
 * Contact form posts from a live site (reached as <subdomain>.<root>/_form through the proxy).
 * Browsers with JavaScript get JSON. Plain form posts are redirected back to the page, to a
 * #sq-sent-… or #sq-failed-… message that CSS reveals.
 */
export async function POST(request: Request, ctx: RouteContext<"/_sites/[subdomain]/_form">) {
  const { subdomain } = await ctx.params;
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const referer = safeReferer(request.headers.get("referer"), request.headers.get("host"));

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "Invalid form." }, { status: 400 });
  const sectionId = String(form.get("_section") ?? "").replace(/[^a-z0-9-]/gi, "");
  const pagePath = String(form.get("_page") ?? "") || referer || "/";

  const result = await submitForm({
    subdomain: subdomain.toLowerCase(),
    form,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    pagePath,
  });

  if (result.ok && result.notify) {
    const notify = result.notify;
    // Send the email after the response, so visitors don't wait for it.
    after(() => notify().catch((error) => console.error("Form notification failed", error)));
  }

  if (wantsJson) {
    return result.ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json(
          { ok: false, error: result.error, errors: result.errors },
          { status: result.status },
        );
  }
  const anchor = `#sq-${result.ok ? "sent" : "failed"}-${sectionId}`;
  return new Response(null, { status: 303, headers: { Location: `${referer || "/"}${anchor}` } });
}

/** The path of the page that posted the form, only when it's on the same website. */
function safeReferer(referer: string | null, host: string | null): string | null {
  if (!referer || !host) return null;
  try {
    const url = new URL(referer);
    return url.host === host ? url.pathname : null;
  } catch {
    return null;
  }
}
