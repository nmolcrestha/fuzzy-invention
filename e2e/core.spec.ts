import { expect, test } from "@playwright/test";

import { createSite, publish, selectSection, waitForSaved } from "./helpers";

test("editor basics: autosave, undo, drafts stay private, two-tab conflicts", async ({
  page,
  context,
}) => {
  const site = await createSite(page);
  const inspector = page.getByRole("complementary", { name: "Section settings" });
  const headline = inspector.getByLabel("Headline", { exact: true });

  await selectSection(page, /^Hero/);
  const original = await headline.inputValue();
  await headline.fill("Launch faster with E2E");
  await expect(page.frameLocator("iframe").getByRole("heading", { level: 1 })).toHaveText(
    "Launch faster with E2E",
  );
  await waitForSaved(page);

  // Undo / redo (ED-6), from outside a text field.
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(headline).toHaveValue(original);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(headline).toHaveValue("Launch faster with E2E");
  await waitForSaved(page);

  await publish(page, { selectAll: true });
  await page.goto(site.url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Launch faster with E2E");

  // Draft edits never reach the live site until published (RND-2).
  await page.goto(`/editor/${site.id}/${site.homePageId}`);
  await selectSection(page, /^Hero/);
  await headline.fill("Not live yet");
  await waitForSaved(page);
  await page.goto(site.url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Launch faster with E2E");

  // Two tabs: the second save wins only after a reload (no silent overwrite).
  const first = page;
  await first.goto(`/editor/${site.id}/${site.homePageId}`);
  const second = await context.newPage();
  await second.goto(`/editor/${site.id}/${site.homePageId}`);
  await selectSection(second, /^Hero/);
  await second
    .getByRole("complementary", { name: "Section settings" })
    .getByLabel("Headline", { exact: true })
    .fill("From the second tab");
  await waitForSaved(second);

  await selectSection(first, /^Hero/);
  await headline.fill("From the first tab");
  await expect(
    first.getByRole("alert").filter({ hasText: "changed in another tab" }),
  ).toBeVisible();
  await first.getByRole("button", { name: "Reload" }).click();
  await selectSection(first, /^Hero/);
  await expect(headline).toHaveValue("From the second tab");
});
