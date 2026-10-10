import { toCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { getSession } from "@/lib/session";
import { listSubmissions } from "@/server/forms/queries";
import { findOwnedSite } from "@/server/sites/access";

/** All messages as a CSV file (requirement FRM-5). Columns follow the form's field labels. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/dashboard/sites/[siteId]/inbox/export">,
) {
  const { siteId } = await ctx.params;
  const session = await getSession();
  const site = session ? await findOwnedSite(session.user.id, siteId) : null;
  if (!site) return new Response("Not found", { status: 404 });

  const messages = await listSubmissions(site.id, 10_000);
  const labels: string[] = [];
  for (const message of messages) {
    for (const field of message.fields) if (!labels.includes(field.label)) labels.push(field.label);
  }
  const rows = [
    ["Received", "Page", ...labels],
    ...messages.map((message) => [
      formatDateTime(new Date(message.createdAt)),
      message.pageTitle,
      ...labels.map((label) => message.fields.find((field) => field.label === label)?.value ?? ""),
    ]),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(site.name) || "website"}-messages.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
