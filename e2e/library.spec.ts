import { expect, type Page, test } from "@playwright/test";

import { createSite, selectSection, waitForSaved } from "./helpers";

async function openPage(page: Page, title: string) {
  await page.getByRole("button", { name: /^E2E Test Co \// }).click();
  await page.getByRole("menuitem", { name: new RegExp(`^${title}`) }).click();
  await page.waitForURL(/\/editor\//);
  await expect(page.getByRole("button", { name: new RegExp(`/ ${title}$`) })).toBeVisible();
}

test("saved sections stay in sync, and can be detached", async ({ page }) => {
  const site = await createSite(page);
  const outline = page.getByRole("navigation", { name: "Page sections" });
  const inspector = page.getByRole("complementary", { name: "Section settings" });

  // Save the homepage's call to action for reuse (SEC-6).
  await outline.getByRole("button", { name: "More actions for Call to action" }).click();
  await page.getByRole("menuitem", { name: "Save for reuse…" }).click();
  const save = page.getByRole("dialog", { name: "Save section for reuse" });
  await save.getByLabel("Name").fill("Closing CTA");
  await save.getByRole("button", { name: "Save section" }).click();
  await expect(page.getByText("Saved “Closing CTA”.", { exact: false })).toBeVisible();
  await expect(outline.getByText("Shared")).toHaveCount(1);

  // Link it on the Pricing page (SEC-7).
  await openPage(page, "Pricing");
  await page.getByRole("button", { name: "Add section" }).first().click();
  const picker = page.getByRole("dialog", { name: "Add a section" });
  await expect(picker.getByText("Used on 1 page: Home")).toBeVisible();
  await picker.getByRole("button", { name: "Link" }).click();
  await expect(inspector.getByText("Saved section: Closing CTA")).toBeVisible();
  await expect(inspector.getByText("Changes here also appear on “Home”.")).toBeVisible();

  // Edit it here: Home changes too, and is marked as changed (SEC-8a).
  await inspector.getByLabel("Heading").fill("Start your free trial today");
  await waitForSaved(page);

  await page
    .getByRole("button", { name: /^Publish/ })
    .first()
    .click();
  const publish = page.getByRole("dialog");
  await expect(publish.getByRole("checkbox", { name: /^Home/ })).toBeChecked();
  await publish.getByRole("button", { name: "Cancel" }).click();

  await openPage(page, "Home");
  await selectSection(page, /^Call to action/);
  await expect(inspector.getByLabel("Heading")).toHaveValue("Start your free trial today");

  // Detach on Home: edits now only apply here (SEC-8).
  await inspector.getByRole("button", { name: "Detach and edit only here" }).click();
  await expect(page.getByText("Detached.", { exact: false })).toBeVisible();
  await expect(outline.getByText("Shared")).toHaveCount(0);
  await inspector.getByLabel("Heading").fill("Only on the homepage");
  await waitForSaved(page);

  await openPage(page, "Pricing");
  await selectSection(page, /^Call to action.*Start your free trial today/);
  await expect(inspector.getByLabel("Heading")).toHaveValue("Start your free trial today");

  // Remove it from saved sections: Pricing keeps its copy, no longer linked.
  await page.getByRole("button", { name: "Add section" }).first().click();
  await picker.getByRole("button", { name: "Remove “Closing CTA” from saved sections" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Remove from saved sections" })
    .click();
  await page.waitForLoadState("load");
  await expect(outline.getByText("Shared")).toHaveCount(0);
  await selectSection(page, /^Call to action.*Start your free trial today/);
  await expect(inspector.getByLabel("Heading")).toHaveValue("Start your free trial today");
  await page.getByRole("button", { name: "Add section" }).first().click();
  await expect(picker.getByText("Saved sections")).toHaveCount(0);
  expect(site.id).toBeTruthy();
});
