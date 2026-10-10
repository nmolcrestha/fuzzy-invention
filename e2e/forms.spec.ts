import { expect, test } from "@playwright/test";

import { createSite, publish, waitForSaved } from "./helpers";

test("contact form: messages reach the inbox, spam doesn't", async ({ page }) => {
  const site = await createSite(page);

  // Add a contact form to the Contact page (FRM-1).
  await page.goto(`/dashboard/sites/${site.id}`);
  await page.getByRole("link", { name: "Contact", exact: true }).click();
  await page.waitForURL(/\/editor\//);
  await page.getByRole("button", { name: "Add section" }).first().click();
  await page
    .getByRole("dialog", { name: "Add a section" })
    .getByRole("button", { name: /^Contact form/ })
    .click();
  await waitForSaved(page);

  // In the draft preview, the form explains it only works once published.
  const contactPageId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.goto(`/preview/${contactPageId}`);
  await expect(async () => {
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("This is a preview.")).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await page.goBack();

  await publish(page, { selectAll: true });

  // A visitor sends a message (with JavaScript).
  await page.goto(`${site.url}/contact`);
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Message").fill("Do you offer a discount for charities?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toHaveText(/Thanks! We got your message/);

  // The same form without JavaScript: a plain post, then back to the page's thank-you note.
  await page.goto(`${site.url}/contact`);
  const sectionId = await page.locator('input[name="_section"]').inputValue();
  const names = await page
    .locator('form input[name^="f_"], form textarea[name^="f_"]')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("name")!));
  const valid = {
    [names[0]!]: "Grace Hopper",
    [names[1]!]: "grace@example.com",
    [names[2]!]: "Hello!",
  };
  const plain = await page.request.post(`${site.url}/_form`, {
    form: { _section: sectionId, ...valid },
    headers: { Referer: `${site.url}/contact` },
    maxRedirects: 0,
  });
  expect(plain.status()).toBe(303);
  expect(plain.headers().location).toBe(`/contact#sq-sent-${sectionId}`);

  const json = { Accept: "application/json", Referer: `${site.url}/contact` };
  // Fields are checked against the published form.
  const invalid = await page.request.post(`${site.url}/_form`, {
    form: { _section: sectionId, _page: "/contact", ...valid, [names[1]!]: "not-an-email" },
    headers: json,
  });
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).errors[names[1]!]).toContain("Enter an email address");

  // Bots that fill the hidden field get a "success" but nothing is stored (FRM-4).
  const bot = await page.request.post(`${site.url}/_form`, {
    form: { _section: sectionId, _page: "/contact", ...valid, website: "http://spam.example" },
    headers: json,
  });
  expect(await bot.json()).toEqual({ ok: true });

  // Unknown forms are refused.
  const unknown = await page.request.post(`${site.url}/_form`, {
    form: { _section: "00000000-0000-4000-8000-000000000000", _page: "/contact", ...valid },
    headers: json,
  });
  expect(unknown.status()).toBe(404);

  // Rate limit: 5 messages per sender per 10 minutes. Two are stored so far.
  const sender = { ...json, "X-Forwarded-For": "203.0.113.7" };
  for (let i = 0; i < 5; i++) {
    const response = await page.request.post(`${site.url}/_form`, {
      form: { _section: sectionId, _page: "/contact", ...valid },
      headers: sender,
    });
    expect(response.status()).toBe(200);
  }
  const limited = await page.request.post(`${site.url}/_form`, {
    form: { _section: sectionId, _page: "/contact", ...valid },
    headers: sender,
  });
  expect(limited.status()).toBe(429);

  // The inbox shows unread messages (FRM-2).
  await page.goto(`/dashboard/sites/${site.id}`);
  await expect(page.getByRole("link", { name: /Messages 7 unread/ })).toBeVisible();
  await page.getByRole("link", { name: /Messages/ }).click();
  const list = page.getByRole("list", { name: "Messages" });
  await expect(list.getByRole("button")).toHaveCount(7);
  await list.getByRole("button", { name: /Ada Lovelace/ }).click();
  await expect(
    page.getByRole("article").getByText("Do you offer a discount for charities?"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Reply by email" })).toHaveAttribute(
    "href",
    /^mailto:ada@example\.com/,
  );
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await page.reload();
  await expect(page.getByRole("link", { name: /unread/ })).toHaveCount(0);

  // Export as a spreadsheet (FRM-5).
  const csv = await page.request.get(`/dashboard/sites/${site.id}/inbox/export`);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text.split("\r\n")[0]).toBe("Received,Page,Name,Email,Message");
  expect(text).toContain("Ada Lovelace,ada@example.com");
});
